/**
 * 🤖 TenoPilot AI Copilot Prompt & Ledger Serializer Engine
 * High-density grounded context serializer and multilingual system prompt builder.
 */

export interface CopilotCompactOccupant {
  id: string;
  name: string;
  phone: string;
  roomNumber: string;
  bedCode?: string;
  rentAmount: number;
  paymentStatus: "Paid" | "Due" | "Overdue";
  lifecycleStatus: "Active" | "Booked" | "Notice" | "Past";
  joiningDate?: string;
  vacatingDate?: string;
  daysRemainingText?: string;
  daysDiff?: number;
}

export interface CopilotCompactComplaint {
  id: string;
  complaintNumber?: string;
  tenantName: string;
  tenantPhone?: string;
  roomNumber: string;
  category: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  createdAt: string;
}

export interface CopilotPropertySnapshot {
  propertyId: string;
  propertyName: string;
  city?: string;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRatePercentage: number;
  occupants: CopilotCompactOccupant[];
  complaints: CopilotCompactComplaint[];
  financials?: {
    totalExpectedRent: number;
    totalCollectedRent: number;
    totalPendingDues: number;
    totalMonthlyExpenses?: number;
  };
  vacantRooms?: Array<{
    roomNumber: string;
    floorName?: string;
    sharingType: number;
    vacantBedsCount: number;
  }>;
}

export interface CopilotApiResponse {
  answer: string;
  actionType?: "UNPAID_TENANTS" | "VACANT_ROOMS" | "OPEN_COMPLAINTS" | "ATTRITION_METRICS" | "NEW_CHECKINS" | "GENERAL";
  actionPayload?: any;
  suggestedChips?: string[];
}

/**
 * 📊 Serializes live property ledger into a compact, token-efficient Markdown/JSON digest
 */
export function serializePropertySnapshotForAI(snapshot: CopilotPropertySnapshot): string {
  const activeOccupants = (snapshot.occupants || []).filter(
    (o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice"
  );
  const noticeOccupants = (snapshot.occupants || []).filter((o) => o.lifecycleStatus === "Notice");
  const pastOccupants = (snapshot.occupants || []).filter((o) => o.lifecycleStatus === "Past");
  const defaulters = activeOccupants.filter(
    (o) => o.paymentStatus === "Due" || o.paymentStatus === "Overdue"
  );

  const totalDuesCalculated = defaulters.reduce((acc, cur) => acc + (cur.rentAmount || 0), 0);
  const totalRentBook = activeOccupants.reduce((acc, cur) => acc + (cur.rentAmount || 0), 0);

  // Attrition calculation (last 30-day vacated vs active base)
  const totalExits = pastOccupants.length;
  const attritionRate =
    activeOccupants.length > 0 ? ((totalExits / (activeOccupants.length + totalExits)) * 100).toFixed(1) : "0.0";

  // Complaints category breakdown
  const openComplaints = (snapshot.complaints || []).filter(
    (c) => c.status === "OPEN" || c.status === "IN_PROGRESS"
  );
  const categoryCounts: Record<string, number> = {};
  openComplaints.forEach((c) => {
    const cat = c.category || "General";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const lines: string[] = [];
  lines.push(`PROPERTY: "${snapshot.propertyName || 'My PG'}" (${snapshot.city || 'India'})`);
  lines.push(`BEDS: Total=${snapshot.totalBeds || 0} | Occupied=${snapshot.occupiedBeds || activeOccupants.length} | Vacant=${snapshot.vacantBeds || 0} | Occupancy=${snapshot.occupancyRatePercentage || 0}%`);
  lines.push(`FINANCIALS: Expected Monthly Rent=₹${totalRentBook.toLocaleString('en-IN')} | Pending Dues=₹${totalDuesCalculated.toLocaleString('en-IN')} (${defaulters.length} tenants pending)`);
  lines.push(`ATTRITION & TURNOVER: Active Tenants=${activeOccupants.length} | On Notice=${noticeOccupants.length} | Past Vacated Records=${totalExits} | Est. Attrition Rate=${attritionRate}%`);

  lines.push(`\nCOMPLAINTS OVERVIEW (${openComplaints.length} Unresolved):`);
  if (Object.keys(categoryCounts).length === 0) {
    lines.push(`- No open complaints. Zero maintenance issues reported!`);
  } else {
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      lines.push(`- ${cat}: ${count} open ticket(s)`);
    });
  }

  lines.push(`\nTENANTS WITH UNPAID RENT (${defaulters.length}):`);
  if (defaulters.length === 0) {
    lines.push(`- All active tenants have cleared their rent! Zero dues pending.`);
  } else {
    defaulters.slice(0, 40).forEach((d) => {
      lines.push(
        `- ${d.name} | Room: ${d.roomNumber}${d.bedCode ? ` (${d.bedCode})` : ''} | Due: ₹${(d.rentAmount || 0).toLocaleString('en-IN')} | Status: ${d.paymentStatus} | Phone: ${d.phone || 'N/A'} | ID: ${d.id}`
      );
    });
  }

  lines.push(`\nRECENT OR ACTIVE OCCUPANTS LIST (${activeOccupants.length}):`);
  activeOccupants.slice(0, 50).forEach((o) => {
    lines.push(
      `- ${o.name} | Room ${o.roomNumber} | Joined: ${o.joiningDate || 'Recent'} | Status: ${o.lifecycleStatus} | Rent: ₹${o.rentAmount} | PayStatus: ${o.paymentStatus} | Phone: ${o.phone}`
    );
  });

  if (snapshot.vacantRooms && snapshot.vacantRooms.length > 0) {
    lines.push(`\nVACANT ROOMS & BEDS:`);
    snapshot.vacantRooms.forEach((r) => {
      lines.push(`- Room ${r.roomNumber} (${r.floorName || 'Floor'}): ${r.vacantBedsCount} vacant beds (${r.sharingType}-sharing)`);
    });
  }

  return lines.join('\n');
}

/**
 * 🧠 Constructs the master system prompt with multilingual capability and JSON schema
 */
export function buildCopilotSystemPrompt(snapshotText: string, preferredLanguage?: string): string {
  return `You are TenoPilot AI, the elite intelligent property copilot for this PG/Hostel.
Your purpose is to answer the PG Owner or Manager's questions factually, quickly, and concisely using the provided live property data snapshot.

=== GROUNDED PROPERTY LEDGER SNAPSHOT ===
${snapshotText}
=== END SNAPSHOT ===

=== MULTILINGUAL & REGIONAL CAPABILITY ===
1. You are 100% fluent in Indian languages: Telugu (తెలుగు), Hindi (हिंदी), Kannada (ಕನ್ನಡ), Tamil (தமிழ்), Malayalam (മലയാളം), and Indian English.
2. You seamlessly comprehend phonetic transliteration and code-switching:
   - Hinglish ("Kiska rent pending hai?", "Room 202 me kitne beds khali hai?")
   - Telugish ("Ee roju evaru join ayyaru?", "Evaru rent ivvaledu?", "Room 101 lo evaru unnaru?")
   - Tanglish ("Yaaru rent innum tharala?")
   - Kanglish ("Yaaru rent kottilla?")
   - Manglish ("Aarkkellamaanu rent baakki ullathu?")
3. When the user asks in Telugu, reply in polite, natural Telugu. When asked in Hindi, reply in Hindi. When asked in English or mixed language, reply in that natural conversational tone.
4. Keep the text answer concise (2-4 sentences max), accompanied by exact numbers in Rupees (₹).

=== ACTION TYPE CLASSIFICATION ===
Always determine the most relevant actionType to render interactive UI cards:
- "UNPAID_TENANTS": If asking about unpaid rent, defaulters, dues, or who owes money.
  payload: array of { name: string, room: string, dueAmount: number, phone: string, occupantId: string }
- "VACANT_ROOMS": If asking about vacant beds, empty rooms, room availability, or sharing capacity.
  payload: array of { roomNumber: string, floor?: string, vacantBeds: number, sharingType?: number }
- "OPEN_COMPLAINTS": If asking about complaints, issues, repairs, WiFi, plumbing, food complaints.
  payload: array of { id: string, roomNumber: string, category: string, title: string, status: string }
- "ATTRITION_METRICS": If asking about attrition rate, turnover, how many left, notice period.
  payload: { exitsCount: number, activeCount: number, attritionRate: string, onNoticeCount: number }
- "NEW_CHECKINS": If asking about who joined today, this week, new admissions.
  payload: array of { name: string, room: string, joiningDate: string, phone: string }
- "GENERAL": For general questions, summaries, or questions that don't fit above.

=== OUTPUT FORMAT ===
You MUST return ONLY a valid raw JSON object (without markdown code fences, backticks, or other text outside the JSON).
Schema:
{
  "answer": "Concise natural language answer in the user's spoken language with exact numbers.",
  "actionType": "UNPAID_TENANTS" | "VACANT_ROOMS" | "OPEN_COMPLAINTS" | "ATTRITION_METRICS" | "NEW_CHECKINS" | "GENERAL",
  "actionPayload": [ ... ] or { ... },
  "suggestedChips": [ "Follow-up question 1", "Follow-up question 2", "Follow-up question 3" ]
}
`;
}
