/**
 * 🤖 TenoPilot AI Copilot Prompt & Ledger Serializer Engine
 * High-density deterministic grounded context serializer with strict zero-hallucination guardrails.
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
  depositAmount?: number;
  arrearsBalance?: number;
  fatherName?: string;
  emergencyContact?: string;
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
  description?: string;
  resolutionNotes?: string;
}

export interface CopilotCompactExpense {
  id: string;
  category: string;
  amount: number;
  date: string;
  paidFrom: string;
  notes?: string;
}

export interface CopilotPropertySnapshot {
  propertyId: string;
  propertyName: string;
  city?: string;
  currentDateAnchor?: string; // e.g. "2026-09-28"
  totalBeds: number;
  totalBedsConfigured?: boolean;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRatePercentage: number;
  occupants: CopilotCompactOccupant[];
  complaints: CopilotCompactComplaint[];
  expenses?: CopilotCompactExpense[];
  financials?: {
    totalExpectedRent: number;
    totalCollectedRent: number;
    totalPendingDues: number;
    totalMonthlyExpenses?: number;
    highestExpenseCategory?: string;
  };
  vacantRooms?: Array<{
    roomNumber: string;
    floorName?: string;
    sharingType: number;
    vacantBedsCount: number;
    vacantBedCodes?: string[];
  }>;
}

export interface CopilotApiResponse {
  answer: string;
  actionType?:
    | "UNPAID_TENANTS"
    | "VACANT_ROOMS"
    | "OPEN_COMPLAINTS"
    | "ATTRITION_METRICS"
    | "NEW_CHECKINS"
    | "EXPENSE_BREAKDOWN"
    | "PAID_TENANTS"
    | "NOTICE_TENANTS"
    | "TENANT_LOOKUP"
    | "PROPERTY_SUMMARY"
    | "GENERAL";
  actionPayload?: any;
  suggestedChips?: string[];
}

/**
 * 📊 Serializes live property ledger into a compact, token-efficient, zero-hallucination digest
 */
export function serializePropertySnapshotForAI(snapshot: CopilotPropertySnapshot): string {
  // 1. Resolve Temporal Anchor (Exact Current Date)
  const todayStr = snapshot.currentDateAnchor || new Date().toISOString().split("T")[0];
  const todayDate = new Date(todayStr);
  const formattedToday = isNaN(todayDate.getTime())
    ? todayStr
    : todayDate.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  const monthName = isNaN(todayDate.getTime())
    ? todayStr.slice(0, 7)
    : todayDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // 2. Active & Notice Occupants
  const allOccupants = snapshot.occupants || [];
  const activeOccupants = allOccupants.filter(
    (o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice"
  );
  const noticeOccupants = allOccupants.filter((o) => o.lifecycleStatus === "Notice");
  const pastOccupants = allOccupants.filter((o) => o.lifecycleStatus === "Past");

  // 3. Pre-computed Check-ins (Today vs Past 7 Days)
  const checkinsToday = activeOccupants.filter((o) => {
    if (!o.joiningDate) return false;
    return o.joiningDate.slice(0, 10) === todayStr;
  });

  const sevenDaysAgoDate = new Date(todayDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoStr = isNaN(sevenDaysAgoDate.getTime())
    ? todayStr
    : sevenDaysAgoDate.toISOString().split("T")[0];

  const checkinsThisWeek = activeOccupants.filter((o) => {
    if (!o.joiningDate) return false;
    const jDate = o.joiningDate.slice(0, 10);
    return jDate >= sevenDaysAgoStr && jDate <= todayStr;
  });

  // 4. Pre-computed Defaulters Roster
  const defaulters = activeOccupants.filter((o) => {
    const isUnpaid = o.paymentStatus === "Due" || o.paymentStatus === "Overdue";
    const hasDues = (o.rentAmount || 0) > 0 || (o.arrearsBalance || 0) > 0;
    return isUnpaid && hasDues;
  });

  const totalDuesCalculated = defaulters.reduce(
    (acc, cur) => acc + (cur.rentAmount || 0) + (cur.arrearsBalance || 0),
    0
  );
  const totalRentBook = activeOccupants.reduce((acc, cur) => acc + (cur.rentAmount || 0), 0);
  const totalCollectedRent = Math.max(0, totalRentBook - totalDuesCalculated);

  // 5. Attrition calculation
  const totalExits = pastOccupants.length;
  const attritionRate =
    activeOccupants.length > 0
      ? ((totalExits / (activeOccupants.length + totalExits)) * 100).toFixed(1)
      : "0.0";

  // 6. Pre-computed Complaints
  const allComplaints = snapshot.complaints || [];
  const openComplaints = allComplaints.filter(
    (c) => c.status === "OPEN" || c.status === "IN_PROGRESS"
  );
  const resolvedComplaints = allComplaints.filter((c) => c.status === "RESOLVED");

  const complaintCategoryCounts: Record<string, number> = {};
  openComplaints.forEach((c) => {
    const cat = c.category || "General";
    complaintCategoryCounts[cat] = (complaintCategoryCounts[cat] || 0) + 1;
  });

  // 7. Pre-computed Expenses
  const allExpenses = snapshot.expenses || [];
  const currentMonthPrefix = todayStr.slice(0, 7);
  const thisMonthExpenses = allExpenses.filter((e) => {
    const d = e.date || "";
    return d.slice(0, 7) === currentMonthPrefix;
  });

  const totalMonthlyExpenses = thisMonthExpenses.reduce(
    (acc, cur) => acc + (cur.amount || 0),
    0
  );

  const expenseCategoryBreakdown: Record<string, number> = {};
  thisMonthExpenses.forEach((e) => {
    const cat = e.category || "General";
    expenseCategoryBreakdown[cat] = (expenseCategoryBreakdown[cat] || 0) + (e.amount || 0);
  });

  // 8. Bed & Layout Configuration Truth
  const hasBedConfig = snapshot.totalBedsConfigured !== false && snapshot.totalBeds > 0;
  const vacantRooms = snapshot.vacantRooms || [];

  // Assemble Master Truth Lines
  const lines: string[] = [];

  lines.push(`=== TEMPORAL ANCHOR (TRUTH ANCHOR) ===`);
  lines.push(`TODAY'S DATE: ${todayStr} (${formattedToday})`);
  lines.push(`CURRENT MONTH: ${monthName}`);

  lines.push(`\n=== PROPERTY IDENTITY & BED CAPACITY ===`);
  lines.push(`Property Name: "${snapshot.propertyName || "My PG"}" (${snapshot.city || "India"})`);
  if (hasBedConfig) {
    lines.push(
      `Physical Bed Layout: Total=${snapshot.totalBeds} Beds | Occupied=${snapshot.occupiedBeds} Beds | Vacant=${snapshot.vacantBeds} Beds | Occupancy=${snapshot.occupancyRatePercentage}%`
    );
  } else {
    lines.push(
      `Physical Bed Layout: Physical rooms/beds have not yet been mapped in Property Map. Currently hosting ${activeOccupants.length} active tenants.`
    );
  }

  lines.push(`\n=== PRE-COMPUTED FINANCIAL SUMMARY (SSOT - DO NOT RECALCULATE) ===`);
  lines.push(`- Expected Monthly Rent Book: ₹${totalRentBook.toLocaleString("en-IN")}`);
  lines.push(`- Collected Rent So Far: ₹${totalCollectedRent.toLocaleString("en-IN")}`);
  lines.push(`- Total Pending Dues: ₹${totalDuesCalculated.toLocaleString("en-IN")}`);
  lines.push(`- Total Defaulter Tenants: ${defaulters.length} tenant(s)`);
  lines.push(`- Total Expenses Logged This Month (${monthName}): ₹${totalMonthlyExpenses.toLocaleString("en-IN")} across ${thisMonthExpenses.length} transaction(s)`);

  lines.push(`\n=== CHECK-INS AUDIT ===`);
  if (checkinsToday.length === 0) {
    lines.push(`[CHECK-INS TODAY (${todayStr})]: NONE (Exactly 0 tenants joined today).`);
  } else {
    lines.push(`[CHECK-INS TODAY (${todayStr}) - ${checkinsToday.length} NEW ADMISSIONS]:`);
    checkinsToday.forEach((c) => {
      lines.push(`  * ${c.name} | Room: ${c.roomNumber}${c.bedCode ? ` (${c.bedCode})` : ""} | Rent: ₹${c.rentAmount} | Phone: ${c.phone}`);
    });
  }

  if (checkinsThisWeek.length === 0) {
    lines.push(`[CHECK-INS PAST 7 DAYS]: NONE (0 tenants joined in the last 7 days).`);
  } else {
    lines.push(`[CHECK-INS PAST 7 DAYS - ${checkinsThisWeek.length} TENANTS]:`);
    checkinsThisWeek.slice(0, 15).forEach((c) => {
      lines.push(`  * ${c.name} | Room: ${c.roomNumber} | Joined: ${c.joiningDate} | Rent: ₹${c.rentAmount}`);
    });
  }

  lines.push(`\n=== ATTRITION & TURNOVER ===`);
  lines.push(`- Active Occupants: ${activeOccupants.length}`);
  lines.push(`- Tenants on Vacating Notice: ${noticeOccupants.length}`);
  if (noticeOccupants.length > 0) {
    noticeOccupants.forEach((n) => {
      lines.push(`  * Notice: ${n.name} (Room ${n.roomNumber}) leaving on: ${n.vacatingDate || "Notice period"}`);
    });
  }
  lines.push(`- Past Vacated Records: ${totalExits}`);
  lines.push(`- Real Turnover/Attrition Rate: ${attritionRate}%`);

  lines.push(`\n=== TENANTS WITH UNPAID RENT (${defaulters.length} DEFAULTERS) ===`);
  if (defaulters.length === 0) {
    lines.push(`ZERO DEFAULTERS. All active tenants have cleared their rent. There are ₹0 pending dues!`);
  } else {
    defaulters.slice(0, 50).forEach((d) => {
      const due = (d.rentAmount || 0) + (d.arrearsBalance || 0);
      lines.push(
        `- ${d.name} | Room ${d.roomNumber}${d.bedCode ? ` (${d.bedCode})` : ""} | Pending: ₹${due.toLocaleString("en-IN")} | Phone: ${d.phone || "N/A"} | ID: ${d.id}`
      );
    });
  }

  lines.push(`\n=== REAL-TIME COMPLAINTS LOG (${openComplaints.length} OPEN / ${resolvedComplaints.length} RESOLVED) ===`);
  if (openComplaints.length === 0) {
    lines.push(`ZERO OPEN COMPLAINTS. All maintenance issues are resolved or none reported.`);
  } else {
    lines.push(`Open Maintenance by Category:`);
    Object.entries(complaintCategoryCounts).forEach(([cat, count]) => {
      lines.push(`  * ${cat}: ${count} open issue(s)`);
    });
    lines.push(`Specific Open Tickets:`);
    openComplaints.slice(0, 15).forEach((c) => {
      lines.push(
        `  * [#${c.complaintNumber || c.id}] ${c.category}: "${c.title}" in ${c.roomNumber} by ${c.tenantName} (${c.status})`
      );
    });
  }

  lines.push(`\n=== ROOM AVAILABILITY & VACANCIES ===`);
  if (!hasBedConfig) {
    lines.push(`Room layout is not yet configured in Property Map.`);
  } else if (vacantRooms.length === 0) {
    lines.push(`ZERO VACANCIES. All configured rooms and beds are 100% occupied.`);
  } else {
    vacantRooms.forEach((r) => {
      lines.push(
        `- Room ${r.roomNumber}${r.floorName ? ` (${r.floorName})` : ""}: ${r.vacantBedsCount} bed(s) available (${r.sharingType}-sharing)${r.vacantBedCodes?.length ? ` [Beds: ${r.vacantBedCodes.join(", ")}]` : ""}`
      );
    });
  }

  lines.push(`\n=== EXPENSES THIS MONTH (${monthName}) ===`);
  if (thisMonthExpenses.length === 0) {
    lines.push(`No expense entries recorded for this month.`);
  } else {
    lines.push(`Category Breakdown:`);
    Object.entries(expenseCategoryBreakdown).forEach(([cat, amt]) => {
      lines.push(`  * ${cat}: ₹${amt.toLocaleString("en-IN")}`);
    });
  }

  lines.push(`\n=== COMPLETE ACTIVE OCCUPANT DIRECTORY (${activeOccupants.length} TENANTS) ===`);
  activeOccupants.slice(0, 60).forEach((o) => {
    lines.push(
      `- ${o.name} | Rm ${o.roomNumber}${o.bedCode ? ` (${o.bedCode})` : ""} | Ph: ${o.phone} | Rent: ₹${o.rentAmount} (${o.paymentStatus}) | Joined: ${o.joiningDate || "N/A"}${o.emergencyContact ? ` | Emergency: ${o.emergencyContact}` : ""}`
    );
  });

  return lines.join("\n");
}

/**
 * 🧠 Constructs the master system prompt with strict zero-hallucination guardrails and multilingual NLP
 */
export function buildCopilotSystemPrompt(snapshotText: string, preferredLanguage?: string): string {
  return `You are TenoPilot AI, the deterministic, zero-hallucination property copilot for this PG/Hostel.
PG owners and managers rely on your answers to collect rent, track maintenance, allocate rooms, and audit financials. A hallucination could cause real financial loss or operational disruption.

=== REAL GROUNDED PROPERTY LEDGER ===
${snapshotText}
=== END LEDGER ===

🚨 STRICT ZERO-HALLUCINATION CONTRACT (NON-NEGOTIABLE):
1. SOLE SOURCE OF TRUTH: You have ZERO external or assumed knowledge. You must ONLY state facts that appear VERBATIM in the REAL GROUNDED PROPERTY LEDGER above.
2. NO SPECULATION OR INVENTION:
   - NEVER invent or guess a tenant's name, room number, bed code, phone number, rent, due amount, complaint, or dates.
   - If a user asks about a tenant or room that is NOT in the ledger (e.g., "Is Ramesh in Room 302?"), and Ramesh is not in the directory, you MUST answer:
     "There is no record of Ramesh in Room 302 (or in this property's active directory)."
   - If a user asks about an unknown room, say that the room does not exist in the property records.
3. ZERO-STATE HONESTY:
   - If Defaulters Count is 0: State clearly: "All tenants have paid their rent. There are ₹0 pending dues." Never invent unpaid tenants.
   - If Check-ins Today is 0: State clearly: "No new tenants joined today." DO NOT point to older joiners and claim they joined today.
   - If Open Complaints is 0: State clearly: "There are currently zero open complaints." Never invent plumbing or electrical issues.
   - If Expenses is 0: State clearly: "No expenses have been recorded for this month."
4. DO NOT DO MENTAL ARITHMETIC:
   - For any financial totals (rent, dues, expenses, bed counts), ALWAYS quote the exact numbers pre-computed in the PRE-COMPUTED FINANCIAL SUMMARY.
5. ACCURATE ACTION PAYLOADS:
   - The "actionPayload" MUST contain ONLY entities that exist in the ledger. If there are 0 unpaid tenants, actionPayload for UNPAID_TENANTS MUST be an empty array [].
   - If there are no checkins today, actionPayload for NEW_CHECKINS MUST be an empty array [].

=== MULTILINGUAL & REGIONAL FLUENCY ===
1. You are 100% fluent in Indian languages: Telugu (తెలుగు), Hindi (हिंदी), Bengali (বাংলা), Kannada (ಕನ್ನಡ), Tamil (தமிழ்), Malayalam (മലയാളം), and Indian English.
2. You understand natural spoken code-switching and transliterated queries:
   - Bengali: "Kar kar bhara baki ache?", "Ajke ke ke join koreche?", "Koto gulo bed khali ache?", "Koto khoroch hoyeche?"
   - Telugu: "Evaru rent ivvaledu?", "Ee roju evaru join ayyaru?", "Room 201 lo evarunnaaru?", "Kharchelu entha ayyayi?"
   - Hindi: "Kiska rent pending hai?", "Aaj kaun join hua?", "Kaunse rooms khali hai?", "Kitna kharcha hua?"
   - English: "Who hasn't paid rent?", "Any complaints open?", "What are our expenses?"
3. Reply in the user's spoken language with a warm, polite, professional tone. Keep text concise (2-4 sentences max) with exact numbers in Rupees (₹).

=== ACTION TYPE CLASSIFICATION ===
Select the best actionType for interactive UI cards:
- "UNPAID_TENANTS": Queries about unpaid rent, pending dues, defaulters.
  payload: array of { name: string, room: string, dueAmount: number, phone: string, occupantId: string }
- "VACANT_ROOMS": Queries about vacant beds, empty rooms, room availability.
  payload: array of { roomNumber: string, floor?: string, vacantBeds: number, sharingType?: number }
- "OPEN_COMPLAINTS": Queries about maintenance, repairs, complaints, WiFi, water.
  payload: array of { id: string, roomNumber: string, category: string, title: string, status: string }
- "ATTRITION_METRICS": Queries about turnover, exits, notices, churn rate.
  payload: { exitsCount: number, activeCount: number, attritionRate: string, onNoticeCount: number }
- "NEW_CHECKINS": Queries about who joined today, this week, new admissions.
  payload: array of { name: string, room: string, joiningDate: string, phone: string, occupantId: string }
- "EXPENSE_BREAKDOWN": Queries about expenses, spending, bills, electricity costs.
  payload: { totalSpent: number, categories: Array<{ category: string, amount: number }> }
- "GENERAL": Summaries, general queries, or queries about specific tenants.

=== OUTPUT FORMAT ===
Return ONLY a valid raw JSON object (without markdown code fences, backticks, or any text outside the JSON):
{
  "answer": "Accurate, grounded answer in the user's language using exact ledger figures.",
  "actionType": "UNPAID_TENANTS" | "VACANT_ROOMS" | "OPEN_COMPLAINTS" | "ATTRITION_METRICS" | "NEW_CHECKINS" | "EXPENSE_BREAKDOWN" | "GENERAL",
  "actionPayload": [ ... ] or { ... },
  "suggestedChips": [ "Follow-up question 1", "Follow-up question 2", "Follow-up question 3" ]
}
`;
}
