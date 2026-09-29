/**
 * ⚡ TenoPilot Fast Intent Query Engine
 * Provides instant (< 20ms) zero-latency client-side answers for high-frequency
 * operational PG questions (vacant beds, unpaid rent, joiners, complaints, expenses,
 * notice periods, tenant lookups, and property health) without waiting for cloud network
 * roundtrips or consuming AI API credits.
 * 
 * Supports: English, Telugu (తెలుగు + Tanglish), Hindi (हिंदी + Hinglish), Bengali (বাংলা + Benglish).
 */

import { CopilotPropertySnapshot, CopilotApiResponse } from "./aiCopilotPrompt";

function isSameDateAsToday(dateStr?: string, todayStr?: string): boolean {
  if (!dateStr || !todayStr) return false;
  const clean = dateStr.trim();
  if (clean.slice(0, 10) === todayStr) return true;
  const d1 = new Date(clean);
  const d2 = new Date(todayStr);
  if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }
  return false;
}

export function tryFastClientQuery(
  rawQuery: string,
  snapshot: CopilotPropertySnapshot,
  preferredLanguage?: string
): CopilotApiResponse | null {
  if (!rawQuery || !snapshot) return null;

  const query = rawQuery.toLowerCase().trim();
  const lang = (preferredLanguage || "en-IN").toLowerCase();
  
  // Detect language from preference OR direct unicode script detection
  const hasTeluguScript = /[\u0C00-\u0C7F]/.test(rawQuery);
  const hasHindiScript = /[\u0900-\u097F]/.test(rawQuery);
  const hasBengaliScript = /[\u0980-\u09FF]/.test(rawQuery);

  const isTelugu = lang.startsWith("te") || hasTeluguScript;
  const isHindi = lang.startsWith("hi") || hasHindiScript;
  const isBengali = lang.startsWith("bn") || hasBengaliScript;

  // =========================================================================
  // PRE-COMPUTED LIVE LEDGER DATA EXTRACTION
  // =========================================================================
  const todayStr = snapshot.currentDateAnchor || new Date().toISOString().split("T")[0];
  const activeOccupants = (snapshot.occupants || []).filter(
    (o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice"
  );
  
  // Rent and Collections
  const defaulters = activeOccupants.filter((o) => {
    const isUnpaid = o.paymentStatus !== "Paid";
    const hasDues = (o.rentAmount || 0) > 0 || (o.arrearsBalance || 0) > 0;
    return isUnpaid && hasDues;
  });
  const totalDues = defaulters.reduce(
    (acc, cur) => acc + (cur.rentAmount || 0) + (cur.arrearsBalance || 0),
    0
  );
  const paidOccupants = activeOccupants.filter((o) => o.paymentStatus === "Paid");
  const totalCollected = paidOccupants.reduce((acc, cur) => acc + (cur.rentAmount || 0), 0);
  const totalExpectedRent = activeOccupants.reduce((acc, cur) => acc + (cur.rentAmount || 0), 0);

  // Check-ins & Dates
  const checkinsToday = activeOccupants.filter((o) => {
    if (!o.joiningDate) return false;
    return isSameDateAsToday(o.joiningDate, todayStr);
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
  const checkinsThisWeek = activeOccupants.filter((o) => {
    if (!o.joiningDate) return false;
    return o.joiningDate.slice(0, 10) >= sevenDaysAgoStr;
  });

  // Notice Period & Vacating
  const noticeOccupants = activeOccupants.filter(
    (o) => o.lifecycleStatus === "Notice" || !!o.vacatingDate
  );
  const totalRefundableDeposit = noticeOccupants.reduce(
    (acc, cur) => acc + (cur.depositAmount || 0),
    0
  );

  // Check-outs today
  const checkoutsToday = activeOccupants.filter((o) => {
    return (
      isSameDateAsToday(o.vacatingDate, todayStr) ||
      isSameDateAsToday((o as any).guestCheckoutDate, todayStr)
    );
  });

  // KYC and Resident Types (Tenants vs Guests)
  const allActiveGuests = activeOccupants.filter((o) => o.stayType === "Guest");
  const allActiveTenants = activeOccupants.filter((o) => o.stayType !== "Guest");
  const kycPendingOccupants = activeOccupants.filter((o) => !o.kycVerified);
  const kycPendingTenants = allActiveTenants.filter((o) => !o.kycVerified);
  const kycPendingGuests = allActiveGuests.filter((o) => !o.kycVerified);

  // Complaints
  const allComplaints = snapshot.complaints || [];
  const openComplaints = allComplaints.filter(
    (c) => c.status === "OPEN" || c.status === "IN_PROGRESS"
  );

  // Expenses
  const allExpenses = snapshot.expenses || [];
  const currentMonthPrefix = todayStr.slice(0, 7);
  const thisMonthExpenses = allExpenses.filter((e) => {
    const d = e.date || "";
    return d.slice(0, 7) === currentMonthPrefix;
  });
  const totalExpenses = thisMonthExpenses.reduce((acc, cur) => acc + (cur.amount || 0), 0);

  const vacantRooms = snapshot.vacantRooms || [];

  // =========================================================================
  // 1. SPECIFIC INDIVIDUAL TENANT SEARCH / ROOM LOOKUP
  // e.g. "where is Rahul", "Ramesh room number", "phone of Pooja", "Suresh details"
  // =========================================================================
  const tenantSearchRegex = /(where is|room (of|for|number of)|phone (of|number of)|details (of|for)|who is|akkada unnadu|ekkada|kahan hai|kothay ache)\s+([a-zA-Z0-9\s]+)/i;
  const directNameMatch = query.match(tenantSearchRegex);
  const searchCandidate = directNameMatch ? directNameMatch[directNameMatch.length - 1].trim() : null;

  if (searchCandidate && searchCandidate.length > 2) {
    const foundTenant = activeOccupants.find((o) =>
      o.name.toLowerCase().includes(searchCandidate)
    );

    if (foundTenant) {
      const isPaid = foundTenant.paymentStatus === "Paid";
      const dueAmt = (foundTenant.rentAmount || 0) + (foundTenant.arrearsBalance || 0);

      const answerText = isBengali
        ? `${foundTenant.name} রুম ${foundTenant.roomNumber}-এ থাকেন (বেড ${foundTenant.bedCode || "N/A"})। বর্তমান স্ট্যাটাস: ${foundTenant.lifecycleStatus}। ভাড়া: ₹${foundTenant.rentAmount} (${foundTenant.paymentStatus})।`
        : isTelugu
        ? `${foundTenant.name} రూమ్ ${foundTenant.roomNumber} లో ఉంటున్నారు (బెడ్ ${foundTenant.bedCode || "N/A"}). ప్రస్తుత స్థితి: ${foundTenant.lifecycleStatus}. అద్దె: ₹${foundTenant.rentAmount} (${foundTenant.paymentStatus}).`
        : isHindi
        ? `${foundTenant.name} रूम ${foundTenant.roomNumber} में रहते हैं (बेड ${foundTenant.bedCode || "N/A"}). वर्तमान स्थिति: ${foundTenant.lifecycleStatus}. किराया: ₹${foundTenant.rentAmount} (${foundTenant.paymentStatus}).`
        : `${foundTenant.name} is residing in Room ${foundTenant.roomNumber} (Bed ${foundTenant.bedCode || "N/A"}). Status: ${foundTenant.lifecycleStatus}. Rent: ₹${foundTenant.rentAmount} (${foundTenant.paymentStatus}).`;

      return {
        answer: answerText,
        actionType: "TENANT_LOOKUP",
        actionPayload: {
          name: foundTenant.name,
          roomNumber: foundTenant.roomNumber,
          bedCode: foundTenant.bedCode,
          rentAmount: foundTenant.rentAmount,
          dueAmount: isPaid ? 0 : dueAmt,
          paymentStatus: foundTenant.paymentStatus,
          phone: foundTenant.phone,
          occupantId: foundTenant.id,
          emergencyContact: foundTenant.emergencyContact,
        },
        suggestedChips: ["Who owes rent?", "Vacant beds?", "Open complaints?"],
      };
    }
  }

  // =========================================================================
  // 2. VACANT BEDS / ROOM AVAILABILITY / OCCUPANCY
  // =========================================================================
  const vacantBedRegex =
    /(vacan[a-z]*|empty|kha?ali|kali|avai?l[a-z]*|free|how many).*bed|bed.*(vacan[a-z]*|empty|kha?ali|kali|avai?l[a-z]*|free)|rooms? (avai?l[a-z]*|vacan[a-z]*|empty|status)|bedlu|koto.*bed|occupan[a-z]*|kha?ali.*room|room.*kha?ali|ఖాళీ|బెడ్|బెడ్లు|ఎన్ని.*బెడ్|షేరింగ్|ఆక్యుపెన్సీ|రెండు.*షేరింగ్|టూ.*షేరింగ్|खाली|बेड|कितने.*बेड|शेयरिंग|ऑक्यूपेंसी|খালি|বেড|কয়টি.*বেড/i;

  if (vacantBedRegex.test(query)) {
    // Check if user specifically asked for overall occupancy rate
    if (/(occupancy|occupancy rate|percentage|how full|aakyupe|aakyu|ऑक्यूपेंसी|ఆక్యుపెన్సీ)/i.test(query)) {
      const answerText = isBengali
        ? `আপনার মোট বেড সংখ্যা ${snapshot.totalBeds}, এর মধ্যে ${snapshot.occupiedBeds} টি পূর্ণ। বর্তমান অকুপেন্সি হার ${snapshot.occupancyRatePercentage}% (${snapshot.vacantBeds} টি বেড খালি রয়েছে)।`
        : isTelugu
        ? `మీ మొత్తం బెడ్లు ${snapshot.totalBeds}, అందులో ${snapshot.occupiedBeds} బెడ్లు నిండాయి. ప్రస్తుత ఆక్యుపెన్సీ రేటు ${snapshot.occupancyRatePercentage}% (${snapshot.vacantBeds} ఖాళీ బెడ్లు ఉన్నాయి).`
        : isHindi
        ? `आपकी कुल बेड्स ${snapshot.totalBeds} हैं, जिनमें से ${snapshot.occupiedBeds} भरी हुई हैं। वर्तमान ऑक्यूपेंसी दर ${snapshot.occupancyRatePercentage}% है (${snapshot.vacantBeds} बेड्स खाली हैं)।`
        : `Property occupancy is currently ${snapshot.occupancyRatePercentage}%. ${snapshot.occupiedBeds} out of ${snapshot.totalBeds} beds are occupied with ${snapshot.vacantBeds} beds available.`;

      return {
        answer: answerText,
        actionType: "PROPERTY_SUMMARY",
        actionPayload: {
          totalBeds: snapshot.totalBeds,
          occupiedBeds: snapshot.occupiedBeds,
          vacantBeds: snapshot.vacantBeds,
          occupancyRate: snapshot.occupancyRatePercentage,
          totalPendingDues: totalDues,
          totalExpenses,
          openComplaints: openComplaints.length,
        },
        suggestedChips: ["Who owes rent?", "Joined today?", "Open complaints?"],
      };
    }

    // Check specific sharing type (1-sharing, 2-sharing, 3-sharing, 4-sharing)
    const isSingleSharing = /(1|single|one|ఒక|సింగిల్|एक|১).*sharing|sharing.*(1|single)|సింగిల్|single.*room/i.test(query);
    const isTwoSharing = /(2|two|టూ|రెండు|दो|২).*sharing|sharing.*(2|two)|టూ.*షేరింగ్|రెండు.*షేరింగ్|2.*షేరింగ్|दो.*शेयरिंग|২.*শেয়ারিং/i.test(query);
    const isThreeSharing = /(3|three|త్రీ|మూడు|तीन|৩).*sharing|sharing.*(3|three)|త్రీ.*షేరింగ్|3.*షేరింగ్|तीन.*शेयरिंग|৩.*শেয়ারিং/i.test(query);
    const isFourSharing = /(4|four|నాలుగు|four|चार|৪).*sharing|sharing.*(4|four)|4.*షేరింగ్/i.test(query);

    let targetSharing: number | null = null;
    let sharingLabel = "";
    if (isSingleSharing) { targetSharing = 1; sharingLabel = "Single / 1-Sharing"; }
    else if (isTwoSharing) { targetSharing = 2; sharingLabel = "2-Sharing"; }
    else if (isThreeSharing) { targetSharing = 3; sharingLabel = "3-Sharing"; }
    else if (isFourSharing) { targetSharing = 4; sharingLabel = "4-Sharing"; }

    const roomsToDisplay = targetSharing 
      ? vacantRooms.filter((r) => r.sharingType === targetSharing)
      : vacantRooms;

    const vacantBedsCount = targetSharing
      ? roomsToDisplay.reduce((sum, r) => sum + r.vacantBedsCount, 0)
      : snapshot.vacantBeds;

    let answerText = "";
    if (snapshot.totalBedsConfigured === false && snapshot.totalBeds === 0) {
      answerText = isBengali
        ? `আপনার প্রপার্টি ম্যাপে রুম এবং বেডের লেআউট এখনও কনফিগার করা হয়নি। বর্তমানে ${activeOccupants.length} জন ভাড়াটিয়া রয়েছেন।`
        : isTelugu
        ? `మీ ప్రాపర్టీ మ్యాప్‌లో గదులు మరియు బెడ్ల లేఅవుట్ ఇంకా కాన్ఫిగర్ చేయలేదు. ప్రస్తుతం ${activeOccupants.length} మంది అద్దెదారులు ఉన్నారు.`
        : isHindi
        ? `आपकी प्रॉपर्टी मैप में कमरों और बेड्स का लेआउट अभी कॉन्फ़िगर नहीं किया गया है। वर्तमान में ${activeOccupants.length} किरायेदार रह रहे हैं।`
        : `Physical rooms and beds have not yet been mapped in Property Map. Currently hosting ${activeOccupants.length} active tenants.`;
    } else if (vacantBedsCount === 0) {
      answerText = targetSharing
        ? isBengali
          ? `বর্তমানে কোনো ${sharingLabel} বেড খালি নেই।`
          : isTelugu
          ? `ప్రస్తుతం ${sharingLabel} గదులలో ఖాళీ బెడ్లు ఏమీ లేవు.`
          : isHindi
          ? `वर्तमान में कोई ${sharingLabel} खाली बेड उपलब्ध नहीं है।`
          : `There are currently 0 vacant beds in ${sharingLabel} rooms.`
        : isBengali
        ? `বর্তমানে কোনো খালি বেড নেই! সব রুম ১০০% পূর্ণ রয়েছে।`
        : isTelugu
        ? `ప్రస్తుతం ఖాళీ బెడ్లు ఏమీ లేవు! అన్ని గదులు 100% ఆక్యుపై అయ్యాయి.`
        : isHindi
        ? `वर्तमान में कोई खाली बेड नहीं है! सभी कमरे 100% भरे हुए हैं।`
        : `All rooms are currently 100% occupied. There are 0 vacant beds.`;
    } else {
      answerText = targetSharing
        ? isBengali
          ? `আপনার PG-তে বর্তমানে ${sharingLabel}-এ ${vacantBedsCount} টি খালি বেড ${roomsToDisplay.length} টি রুমে উপলব্ধ রয়েছে।`
          : isTelugu
          ? `మీ PG లో ప్రస్తుతం ${sharingLabel} గదులలో ${vacantBedsCount} ఖాళీ బెడ్లు ${roomsToDisplay.length} గదులలో అందుబాటులో ఉన్నాయి.`
          : isHindi
          ? `आपकी प्रॉपर्टी में अभी ${sharingLabel} के ${vacantBedsCount} खाली बेड्स ${roomsToDisplay.length} कमरों में उपलब्ध हैं।`
          : `You have ${vacantBedsCount} vacant beds available across ${roomsToDisplay.length} rooms in ${sharingLabel}.`
        : isBengali
        ? `আপনার PG-তে বর্তমানে ${snapshot.vacantBeds} টি খালি বেড ${vacantRooms.length} টি রুমে উপলব্ধ রয়েছে। মোট অকুপেন্সি হার ${snapshot.occupancyRatePercentage}%।`
        : isTelugu
        ? `మీ PG లో ప్రస్తుతం ${snapshot.vacantBeds} ఖాళీ బెడ్లు ${vacantRooms.length} గదులలో అందుబాటులో ఉన్నాయి. మొత్తం ఆక్యుపెన్సీ రేటు ${snapshot.occupancyRatePercentage}%.`
        : isHindi
        ? `आपकी प्रॉपर्टी में अभी ${snapshot.vacantBeds} खाली बेड्स ${vacantRooms.length} कमरों में उपलब्ध हैं। कुल ऑक्यूपेंसी दर ${snapshot.occupancyRatePercentage}% है।`
        : `You have ${snapshot.vacantBeds} vacant beds available across ${vacantRooms.length} rooms. Current occupancy is ${snapshot.occupancyRatePercentage}%.`;
    }

    return {
      answer: answerText,
      actionType: "VACANT_ROOMS",
      actionPayload: roomsToDisplay.map((r) => ({
        roomNumber: r.roomNumber,
        floor: r.floorName,
        vacantBeds: r.vacantBedsCount,
        sharingType: r.sharingType,
      })),
      suggestedChips: ["Who owes rent?", "Joined today?", "Open complaints?"],
    };
  }

  // =========================================================================
  // 3. PAID RENT / TOTAL COLLECTION SO FAR THIS MONTH
  // e.g. "who paid", "paid rent", "total collected", "collection this month"
  // =========================================================================
  const paidRentRegex =
    /(who (has )?paid|cleared rent|paid tenants?|total collect[a-z]*|how much collect[a-z]*|rent collect[a-z]*|collection this month|collection kitna|rent vachindi|kattaru evaru|evaru kattaru|kisne diya|diyeche ke|koto taka utheche)/i;

  if (paidRentRegex.test(query)) {
    const collectionPercentage = totalExpectedRent > 0
      ? Math.round((totalCollected / totalExpectedRent) * 100)
      : 0;

    let answerText = "";
    if (paidOccupants.length === 0) {
      answerText = isBengali
        ? `এই মাসে এখনও কোনো ভাড়া আদায় হয়নি (₹০ / ₹${totalExpectedRent.toLocaleString("en-IN")})।`
        : isTelugu
        ? `ఈ నెల ఇంకా అద్దె వసూలు ప్రారంభం కాలేదు (₹0 / ₹${totalExpectedRent.toLocaleString("en-IN")}).`
        : isHindi
        ? `इस महीने अभी तक कोई किराया जमा नहीं हुआ है (₹0 / ₹${totalExpectedRent.toLocaleString("en-IN")})।`
        : `No rent payments recorded yet this month (₹0 collected out of ₹${totalExpectedRent.toLocaleString("en-IN")}).`;
    } else {
      answerText = isBengali
        ? `এই মাসে মোট ${paidOccupants.length} জন ভাড়া পরিশোধ করেছেন। মোট আদায় ₹${totalCollected.toLocaleString("en-IN")} (${collectionPercentage}% আদায় হয়েছে)।`
        : isTelugu
        ? `ఈ నెల మొత్తం ${paidOccupants.length} మంది అద్దె చెల్లించారు. మొత్తం వసూలు ₹${totalCollected.toLocaleString("en-IN")} (${collectionPercentage}% కలెక్ట్ అయ్యింది).`
        : isHindi
        ? `इस महीने कुल ${paidOccupants.length} किरायेदारों ने किराया चुकाया है। कुल वसूली ₹${totalCollected.toLocaleString("en-IN")} (${collectionPercentage}%) हुई है।`
        : `${paidOccupants.length} tenant(s) have cleared rent this month, totaling ₹${totalCollected.toLocaleString("en-IN")} collected (${collectionPercentage}% of expected revenue).`;
    }

    return {
      answer: answerText,
      actionType: "PAID_TENANTS",
      actionPayload: paidOccupants.map((p) => ({
        name: p.name,
        room: p.roomNumber,
        rentAmount: p.rentAmount,
        phone: p.phone,
        occupantId: p.id,
      })),
      suggestedChips: ["Who owes rent?", "Vacant beds?", "Monthly expenses?"],
    };
  }

  // =========================================================================
  // 4. UNPAID RENT / DEFAULTERS / PENDING DUES
  // =========================================================================
  const unpaidRentRegex =
    /(unpaid|not paid|didn't pay|hasn't paid|has not paid|have not paid|who owes|defaulter|pending due|due balance|arrears|baki|baaki|ivvaledu|kattaledu|bhara.*baki|kar.*bhara|kiska.*pending|rent due)/i;

  if (unpaidRentRegex.test(query)) {
    // Check if looking for high dues (> 5000 or > 10000)
    const isHighDues = /(high|highest|heavy|more than|ekkuva|jyada|beshi)/i.test(query);
    const targetDefaulters = isHighDues
      ? defaulters.filter((d) => ((d.rentAmount || 0) + (d.arrearsBalance || 0)) >= 5000)
      : defaulters;

    let answerText = "";
    if (defaulters.length === 0) {
      answerText = isBengali
        ? `সবাই ভাড়া পরিশোধ করেছেন! কোনো বকেয়া নেই (₹০)।`
        : isTelugu
        ? `అందరూ అద్దె చెల్లించారు! పెండింగ్ బకాయిలు ₹0.`
        : isHindi
        ? `सभी किरायेदारों ने किराया चुका दिया है! कुल बकाया ₹0 है।`
        : `All active tenants have fully cleared their rent! Zero dues pending.`;
    } else {
      answerText = isBengali
        ? `মোট ${targetDefaulters.length} জনের ভাড়া বাকি রয়েছে, মোট বকেয়া ₹${totalDues.toLocaleString("en-IN")}।`
        : isTelugu
        ? `మొత్తం ${targetDefaulters.length} మంది అద్దె చెల్లించాల్సి ఉంది. మొత్తం పెండింగ్ బకాయిలు ₹${totalDues.toLocaleString("en-IN")}.`
        : isHindi
        ? `कुल ${targetDefaulters.length} किरायेदारों का किराया बाकी है, कुल बकाया ₹${totalDues.toLocaleString("en-IN")} है।`
        : `There are ${targetDefaulters.length} tenants with unpaid rent totaling ₹${totalDues.toLocaleString("en-IN")}.`;
    }

    return {
      answer: answerText,
      actionType: "UNPAID_TENANTS",
      actionPayload: targetDefaulters.map((d) => ({
        name: d.name,
        room: d.roomNumber,
        dueAmount: (d.rentAmount || 0) + (d.arrearsBalance || 0),
        phone: d.phone,
        occupantId: d.id,
      })),
      suggestedChips: ["Send WhatsApp reminders", "Vacant beds?", "Monthly expenses?"],
    };
  }

  // =========================================================================
  // 5. CHECK-OUTS TODAY / WHO IS CHECKING OUT TODAY / VACATING TODAY
  // =========================================================================
  const checkoutTodayRegex =
    /(check-?out.*today|today.*check-?out|who.*checking out|who.*check-?out|checking out today|leaving today|vacat.*today|ee roju.*khali|aaj.*check-?out|ajke.*check-?out|who.*leaving today|who.*vacating today)/i;

  if (checkoutTodayRegex.test(query)) {
    let answerText = "";
    if (checkoutsToday.length === 0) {
      const noticeNote = noticeOccupants.length > 0
        ? isBengali
          ? ` তবে বর্তমানে ${noticeOccupants.length} জন নোটিশ পিরিয়ডে আছেন যারা শীঘ্রই খালি করবেন।`
          : isTelugu
          ? ` అయితే ప్రస్తుతం ${noticeOccupants.length} మంది అద్దెదారులు నోటీసు పీరియడ్‌లో ఉన్నారు.`
          : isHindi
          ? ` हालाँकि, वर्तमान में ${noticeOccupants.length} किरायेदार नोटिस पर हैं।`
          : ` However, ${noticeOccupants.length} tenant(s) are currently on notice period scheduled to vacate soon.`
        : "";

      answerText = isBengali
        ? `আজ (${todayStr}) কোনো ভাড়াটিয়ার চেক-আউট নেই।${noticeNote}`
        : isTelugu
        ? `ఈ రోజు (${todayStr}) చెక్-అవుట్ లేదా రూమ్ ఖాళీ చేసే వారు ఎవరూ లేరు.${noticeNote}`
        : isHindi
        ? `आज (${todayStr}) कोई किरायेदार चेक-आउट नहीं कर रहा है।${noticeNote}`
        : `No tenants are scheduled to check out today (${todayStr}).${noticeNote}`;
    } else {
      answerText = isBengali
        ? `আজ (${todayStr}) ${checkoutsToday.length} জন ভাড়াটিয়া চেক-আউট করছেন।`
        : isTelugu
        ? `ఈ రోజు (${todayStr}) ${checkoutsToday.length} మంది అద్దెదారులు చెక్-అవుట్ / ఖాళీ చేస్తున్నారు.`
        : isHindi
        ? `आज (${todayStr}) ${checkoutsToday.length} किरायेदार चेक-आउट कर रहे हैं।`
        : `${checkoutsToday.length} tenant(s) are scheduled to check out today (${todayStr}).`;
    }

    return {
      answer: answerText,
      actionType: "NOTICE_TENANTS",
      actionPayload: (checkoutsToday.length > 0 ? checkoutsToday : noticeOccupants).map((n) => ({
        name: n.name,
        room: n.roomNumber,
        vacatingDate: n.vacatingDate || "Today",
        depositAmount: n.depositAmount,
        phone: n.phone,
        occupantId: n.id,
      })),
      suggestedChips: ["Who all are on notice?", "Who owes rent?", "Vacant beds?"],
    };
  }

  // =========================================================================
  // 6. NOTICE PERIOD / WHO ALL ARE ON NOTICE / VACATING LIST
  // e.g. "who all are on notice", "who is on notice", "notice period", "who served notice"
  // =========================================================================
  const noticeRegex =
    /(notice|who.*on notice|who all are on notice|serving notice|served notice|gave notice|giving notice|vacat[a-z]*|leaving|leave this month|move-?out|khali chesthunnaru|khali chestaru|chod rahe hai|chale gaye|basa charche|going to leave)/i;

  if (noticeRegex.test(query)) {
    let answerText = "";
    if (noticeOccupants.length === 0) {
      answerText = isBengali
        ? `বর্তমানে কোনো ভাড়াটিয়া নোটিশ পিরিয়ডে নেই। কেউ খালি করছেন না।`
        : isTelugu
        ? `ప్రస్తుతం ఎవరూ నోటీస్ పీరియడ్‌లో లేరు. గదులు ఖాళీ చేసే వారు ఎవరూ లేరు.`
        : isHindi
        ? `वर्तमान में कोई किरायेदार नोटिस पर नहीं है। कोई कमरा खाली नहीं हो रहा है।`
        : `No tenants are currently on vacating notice. All active stays are continuing.`;
    } else {
      answerText = isBengali
        ? `বর্তমানে ${noticeOccupants.length} জন নোটিশে রয়েছেন। মোট ফেরতযোগ্য সিকিউরিটি ডিপোজিট ₹${totalRefundableDeposit.toLocaleString("en-IN")}।`
        : isTelugu
        ? `ప్రస్తుతం ${noticeOccupants.length} మంది అద్దెదారులు నోటీసు పీరియడ్‌లో ఉన్నారు. రీఫండ్ చేయాల్సిన మొత్తం సెక్యూరిటీ డిపాజిట్ ₹${totalRefundableDeposit.toLocaleString("en-IN")}.`
        : isHindi
        ? `वर्तमान में ${noticeOccupants.length} किरायेदार नोटिस पर हैं। वापस की जाने वाली कुल सिक्योरिटी राशि ₹${totalRefundableDeposit.toLocaleString("en-IN")} है।`
        : `There are ${noticeOccupants.length} tenant(s) currently on vacating notice. Total refundable security deposits: ₹${totalRefundableDeposit.toLocaleString("en-IN")}.`;
    }

    return {
      answer: answerText,
      actionType: "NOTICE_TENANTS",
      actionPayload: noticeOccupants.map((n) => ({
        name: n.name,
        room: n.roomNumber,
        vacatingDate: n.vacatingDate || "Notice Active",
        depositAmount: n.depositAmount,
        phone: n.phone,
        occupantId: n.id,
      })),
      suggestedChips: ["Who owes rent?", "Vacant beds?", "Monthly expenses?"],
    };
  }

  // =========================================================================
  // 7. CHECK-INS TODAY / JOINED THIS WEEK / NEW ADMISSIONS
  // =========================================================================
  const isCheckOutQuery = /(check-?out|checking out|checkout|vacat|leaving|khali)/i.test(query);
  const checkinRegex =
    /(join[a-z]*|\bcheck-?in(s|ing)?\b|checked in|admissions?|new tenant|kotha tenant|naye kirayedar|notun bhara|who joined|who checked in)/i;

  if (!isCheckOutQuery && checkinRegex.test(query)) {
    const isThisWeek = /(week|vaaram|saptaah|shoptaho|past 7 days)/i.test(query);
    const targetCheckins = isThisWeek ? checkinsThisWeek : checkinsToday;
    const timeframeText = isThisWeek ? "this week" : "today";

    let answerText = "";
    if (targetCheckins.length === 0) {
      answerText = isBengali
        ? `${isThisWeek ? "এই সপ্তাহে" : "আজ"} কোনো নতুন ভাড়াটিয়া যোগ দেননি।`
        : isTelugu
        ? `${isThisWeek ? "ఈ వారం" : "ఈ రోజు"} కొత్త అద్దెదారులు ఎవరూ చేరలేదు.`
        : isHindi
        ? `${isThisWeek ? "इस सप्ताह" : "आज"} कोई नया किरायेदार नहीं जुड़ा है।`
        : `No new tenants checked in ${timeframeText}.`;
    } else {
      answerText = isBengali
        ? `${isThisWeek ? "এই সপ্তাহে" : "আজ"} ${targetCheckins.length} জন নতুন ভাড়াটিয়া যোগ দিয়েছেন।`
        : isTelugu
        ? `${isThisWeek ? "ఈ వారం" : "ఈ రోజు"} ${targetCheckins.length} మంది కొత్త అద్దెదారులు చేరారు.`
        : isHindi
        ? `${isThisWeek ? "इस सप्ताह" : "आज"} ${targetCheckins.length} नए किरायेदार जुड़े हैं।`
        : `${targetCheckins.length} new tenant(s) checked in ${timeframeText}.`;
    }

    return {
      answer: answerText,
      actionType: "NEW_CHECKINS",
      actionPayload: targetCheckins.map((c) => ({
        name: c.name,
        room: c.roomNumber,
        joiningDate: c.joiningDate,
        phone: c.phone,
        occupantId: c.id,
      })),
      suggestedChips: ["Who owes rent?", "Vacant beds?", "Open complaints?"],
    };
  }

  // =========================================================================
  // 8. KYC PENDING RESIDENTS (TENANTS & GUESTS) & AADHAAR AUDIT
  // e.g. "kyc pending tenants", "guests kyc", "who has pending kyc", "aadhaar not given"
  // =========================================================================
  const kycRegex =
    /(kyc|aadhaar|aadhar|id proof|id card|document|verification|unverified|pending kyc|missing kyc|ఆధార్|కేవైసీ|आधार|केवाईसी|আধার|কেওয়াইসি)/i;

  if (kycRegex.test(query)) {
    const isGuestsOnly = /(guest|short-?term)/i.test(query) && !/(tenant|monthly)/i.test(query);
    const isTenantsOnly = /(tenant|monthly|long-?term)/i.test(query) && !/(guest|short-?term)/i.test(query);

    let targetKycList = kycPendingOccupants;
    let labelCategory = "residents";
    if (isGuestsOnly) {
      targetKycList = kycPendingGuests;
      labelCategory = "short-term guests";
    } else if (isTenantsOnly) {
      targetKycList = kycPendingTenants;
      labelCategory = "monthly tenants";
    }

    let answerText = "";
    if (targetKycList.length === 0) {
      answerText = isBengali
        ? `দারুণ! সব ${labelCategory}-র কেওয়াইসি (আধার) যাচাইকরণ সম্পূর্ণ হয়েছে। কোনো পেন্ডিং নেই (০)।`
        : isTelugu
        ? `అద్భుతం! అందరు ${labelCategory} కేవైసీ (ఆధార్) ధృవీకరణ పూర్తయింది. పెండింగ్‌లో ఎవరూ లేరు (0).`
        : isHindi
        ? `शानदार! सभी ${labelCategory} का केवाईसी (आधार) सत्यापन पूर्ण हो चुका है। कोई लंबित नहीं है (0)।`
        : `100% KYC verified! All ${labelCategory} have completed their government ID/Aadhaar verification.`;
    } else {
      const breakdownText = isGuestsOnly || isTenantsOnly
        ? ""
        : ` (${kycPendingTenants.length} tenants, ${kycPendingGuests.length} guests)`;

      answerText = isBengali
        ? `মোট ${targetKycList.length} জন ${labelCategory}-র কেওয়াইসি/আধার পেন্ডিং রয়েছে${breakdownText}।`
        : isTelugu
        ? `మొత్తం ${targetKycList.length} మంది ${labelCategory} కేవైసీ/ఆధార్ డాక్యుమెంట్లు పెండింగ్‌లో ఉన్నాయి${breakdownText}.`
        : isHindi
        ? `कुल ${targetKycList.length} ${labelCategory} का केवाईसी/आधार दस्तावेज लंबित है${breakdownText}।`
        : `There are ${targetKycList.length} ${labelCategory} with pending KYC / Aadhaar verification${breakdownText}.`;
    }

    return {
      answer: answerText,
      actionType: "KYC_PENDING",
      actionPayload: targetKycList.map((k) => ({
        name: k.name,
        room: k.roomNumber,
        stayType: k.stayType || "Tenant",
        phone: k.phone,
        occupantId: k.id,
        kycVerified: false,
      })),
      suggestedChips: ["Who owes rent?", "Vacant beds?", "Short-term guests?"],
    };
  }

  // =========================================================================
  // 9. SHORT-TERM GUESTS DIRECTORY
  // e.g. "how many guests", "short term tenants", "daily guests", "guest list"
  // =========================================================================
  const guestQueryRegex =
    /(guest[s]?|short-?term|daily stay|temporary resident|visitor|గెస్ట్|గెస్టులు|గేస్ట్|గేస్టులు|गेस्ट|अतिथि|স্বল্পমেয়াদী|অতিথি)/i;

  if (guestQueryRegex.test(query)) {
    let answerText = "";
    if (allActiveGuests.length === 0) {
      answerText = isBengali
        ? `বর্তমানে কোনো স্বল্পমেয়াদী অতিথি (Guests) এই প্রপার্টিতে নেই। সবাই মাসিক ভাড়াটিয়া।`
        : isTelugu
        ? `ప్రస్తుతం షార్ట్-టర్మ్ గెస్టులు (Guests) ఎవరూ లేరు. ప్రస్తుతం ఉన్నవారంతా నెలవారీ అద్దెదారులు.`
        : isHindi
        ? `वर्तमान में कोई शॉर्ट-टर्म गेस्ट (अतिथि) इस प्रॉपर्टी में नहीं हैं। सभी मासिक किरायेदार हैं।`
        : `There are currently 0 short-term guests staying at the property. All active residents are long-term monthly tenants.`;
    } else {
      answerText = isBengali
        ? `বর্তমানে ${allActiveGuests.length} জন স্বল্পমেয়াদী অতিথি (Guests) অবস্থান করছেন।`
        : isTelugu
        ? `ప్రస్తుతం ${allActiveGuests.length} మంది షార్ట్-టర్మ్ గెస్టులు (Guests) బస చేస్తున్నారు.`
        : isHindi
        ? `वर्तमान में ${allActiveGuests.length} शॉर्ट-टर्म गेस्ट्स (अतिथि) ठहरे हुए हैं।`
        : `There are currently ${allActiveGuests.length} short-term guest(s) residing at the property.`;
    }

    return {
      answer: answerText,
      actionType: "GUEST_LIST",
      actionPayload: allActiveGuests.map((g) => ({
        name: g.name,
        room: g.roomNumber,
        phone: g.phone,
        stayType: "Guest",
        joiningDate: g.joiningDate,
        vacatingDate: g.vacatingDate,
        occupantId: g.id,
      })),
      suggestedChips: ["KYC pending list?", "Who owes rent?", "Vacant beds?"],
    };
  }

  // =========================================================================
  // 10. COMPLAINTS / MAINTENANCE (Wi-Fi, Plumbing, AC, Food)
  // =========================================================================
  const complaintRegex =
    /(complain[a-z]*|issue|repair|plumb[a-z]*|leak[a-z]*|wi-?fi|internet|clean[a-z]*|maintenance|problem|samasyalu|shikayat|ovinog|somossa|geyser|ac.*not.*working)/i;

  if (complaintRegex.test(query)) {
    // Specific category filters
    const isWifi = /(wi-?fi|internet|network|router)/i.test(query);
    const isPlumbing = /(plumb|leak|tap|water|washroom|toilet|bathroom)/i.test(query);
    const isAC = /(ac|air conditioner|cooling|geyser|current|power|light)/i.test(query);

    let filteredTickets = openComplaints;
    let categoryName = "";
    if (isWifi) {
      filteredTickets = openComplaints.filter((c) => c.category?.toLowerCase().includes("wifi") || c.title?.toLowerCase().includes("wifi"));
      categoryName = "Wi-Fi";
    } else if (isPlumbing) {
      filteredTickets = openComplaints.filter((c) => c.category?.toLowerCase().includes("plumb") || c.title?.toLowerCase().includes("water") || c.title?.toLowerCase().includes("leak"));
      categoryName = "Plumbing / Water";
    } else if (isAC) {
      filteredTickets = openComplaints.filter((c) => c.category?.toLowerCase().includes("ac") || c.category?.toLowerCase().includes("elec") || c.title?.toLowerCase().includes("ac"));
      categoryName = "AC / Electrical";
    }

    let answerText = "";
    if (filteredTickets.length === 0) {
      answerText = categoryName
        ? isBengali
          ? `বর্তমানে কোনো ${categoryName} সংক্রান্ত অভিযোগ নেই!`
          : isTelugu
          ? `ప్రస్తుతం ${categoryName} సంబంధిత సమస్యలు ఏమీ లేవు!`
          : isHindi
          ? `वर्तमान में कोई ${categoryName} संबंधी शिकायत नहीं है!`
          : `There are currently 0 open ${categoryName} complaints registered.`
        : isBengali
        ? `বর্তমানে কোনো খোলা অভিযোগ নেই! সব সমস্যা সমাধান করা হয়েছে।`
        : isTelugu
        ? `ప్రస్తుతం ఓపెన్ ఫిర్యాదులు ఏమీ లేవు! అన్ని నిర్వహణ సమస్యలు పరిష్కరించబడ్డాయి.`
        : isHindi
        ? `वर्तमान में कोई खुली शिकायत नहीं है! सभी समस्याएं हल हो चुकी हैं।`
        : `There are currently 0 open complaints registered. All maintenance is up to date!`;
    } else {
      answerText = categoryName
        ? isBengali
          ? `বর্তমানে ${categoryName}-এ ${filteredTickets.length} টি অভিযোগ সমাধানের অপেক্ষায় রয়েছে।`
          : isTelugu
          ? `ప్రస్తుతం ${categoryName} విభాగంలో ${filteredTickets.length} ఓపెన్ ఫిర్యాదులు పరిష్కారం కోసం ఉన్నాయి.`
          : isHindi
          ? `वर्तमान में ${categoryName} में ${filteredTickets.length} खुली शिकायतें दर्ज हैं।`
          : `There are ${filteredTickets.length} open ${categoryName} ticket(s) currently registered.`
        : isBengali
        ? `বর্তমানে ${openComplaints.length} টি অভিযোগ সমাধানের অপেক্ষায় রয়েছে।`
        : isTelugu
        ? `ప్రస్తుతం ${openComplaints.length} ఓపెన్ ఫిర్యాదులు పరిష్కారం కోసం ఎదురుచూస్తున్నాయి.`
        : isHindi
        ? `वर्तमान में ${openComplaints.length} खुली शिकायतें दर्ज हैं।`
        : `There are ${openComplaints.length} unresolved maintenance ticket(s) currently open.`;
    }

    return {
      answer: answerText,
      actionType: "OPEN_COMPLAINTS",
      actionPayload: filteredTickets.map((c) => ({
        id: c.id,
        roomNumber: c.roomNumber,
        category: c.category,
        title: c.title,
        status: c.status,
      })),
      suggestedChips: ["Unpaid rent?", "Vacant beds?", "Monthly expenses?"],
    };
  }

  // =========================================================================
  // 8. MONTHLY EXPENSES, BILLS & NET CASH FLOW
  // =========================================================================
  const expenseRegex = /(expense|spending|spent|kharcha|kharchelu|bills?|cost this month|khoroch|electricity bill|current bill|bijli)/i;

  if (expenseRegex.test(query)) {
    const isElectricity = /(electricity|current bill|power bill|bijli|eb bill)/i.test(query);
    const isFood = /(food|mess|grocery|groceries|kirana|vegetables|sabji)/i.test(query);

    const expenseCatCounts: Record<string, number> = {};
    thisMonthExpenses.forEach((e) => {
      const cat = e.category || "General";
      expenseCatCounts[cat] = (expenseCatCounts[cat] || 0) + (e.amount || 0);
    });

    const categories = Object.entries(expenseCatCounts).map(([category, amount]) => ({
      category,
      amount,
    }));

    let answerText = "";
    if (isElectricity) {
      const ebAmount = thisMonthExpenses
        .filter((e) => e.category?.toLowerCase().includes("elec") || e.category?.toLowerCase().includes("current") || e.notes?.toLowerCase().includes("bill"))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      answerText = isTelugu
        ? `ఈ నెల నమోదైన విద్యుత్ / కరెంట్ బిల్లు మొత్తం: ₹${ebAmount.toLocaleString("en-IN")}.`
        : isHindi
        ? `इस महीने का दर्ज किया गया बिजली बिल: ₹${ebAmount.toLocaleString("en-IN")}.`
        : `Recorded electricity/power bills for this month: ₹${ebAmount.toLocaleString("en-IN")}.`;
    } else if (isFood) {
      const foodAmount = thisMonthExpenses
        .filter((e) => e.category?.toLowerCase().includes("food") || e.category?.toLowerCase().includes("mess") || e.category?.toLowerCase().includes("grocery"))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      answerText = isTelugu
        ? `ఈ నెల భోజనం / కిరాణా సరుకుల ఖర్చు: ₹${foodAmount.toLocaleString("en-IN")}.`
        : isHindi
        ? `इस महीने का भोजन / राशन खर्च: ₹${foodAmount.toLocaleString("en-IN")}.`
        : `Recorded food/mess grocery expenses for this month: ₹${foodAmount.toLocaleString("en-IN")}.`;
    } else if (thisMonthExpenses.length === 0) {
      answerText = isBengali
        ? `এই মাসের জন্য কোনো খরচের হিসাব নথিবদ্ধ নেই।`
        : isTelugu
        ? `ఈ నెలకు సంబంధించిన ఖర్చుల వివరాలు ఏమీ నమోదు కాలేదు.`
        : isHindi
        ? `इस महीने के लिए कोई खर्च दर्ज नहीं किया गया है।`
        : `No expenses have been recorded for this month yet.`;
    } else {
      answerText = isBengali
        ? `এই মাসে মোট খরচ ₹${totalExpenses.toLocaleString("en-IN")} (${thisMonthExpenses.length} টি লেনদেন)।`
        : isTelugu
        ? `ఈ నెల మొత్తం ఖర్చులు ₹${totalExpenses.toLocaleString("en-IN")} (${thisMonthExpenses.length} లావాదేవీలు).`
        : isHindi
        ? `इस महीने का कुल खर्च ₹${totalExpenses.toLocaleString("en-IN")} है (${thisMonthExpenses.length} प्रविष्टियां).`
        : `Total expenses recorded this month are ₹${totalExpenses.toLocaleString("en-IN")} across ${thisMonthExpenses.length} transactions.`;
    }

    return {
      answer: answerText,
      actionType: "EXPENSE_BREAKDOWN",
      actionPayload: {
        totalSpent: totalExpenses,
        categories,
      },
      suggestedChips: ["Who owes rent?", "Vacant beds?", "Open complaints?"],
    };
  }

  // =========================================================================
  // 8.5 PARTNER CASHFLOW, SETTLEMENT & PROFIT SHARE
  // e.g. "partner", "settlement", "partner cash flow", "how much did suresh collect", "inflow outflow"
  // =========================================================================
  const partnerRegex = /(partner|settlement|profit share|equity share|paid to|paid from|inflow|outflow|patner|hisab|hisaab)/i;
  if (partnerRegex.test(query)) {
    const answerText = isTelugu
      ? `పార్టనర్ క్యాష్‌ఫ్లో మరియు సెటిల్‌మెంట్ డ్యాష్‌బోర్డ్‌లో ప్రతి పార్టనర్ ఖాతాలోకి వచ్చిన అద్దె (Paid To) మరియు వారి చేతినుండి చేసిన ఖర్చులు (Paid From) వివరాలు సిద్ధంగా ఉన్నాయి.`
      : isHindi
      ? `पार्टनर कैशफ्लो और सेटलमेंट लेजर में प्रत्येक पार्टनर के खाते में आए किराए (Paid To) और जेब से किए गए खर्चों (Paid From) का पूरा विवरण उपलब्ध है।`
      : isBengali
      ? `পার্টনার ক্যাশফ্লো এবং সেটেলমেন্ট লেজারে প্রতিটি অংশীদারের ইন-ফ্লো (Paid To) এবং আউট-ফ্লো (Paid From) এর সম্পূর্ণ হিসাব রয়েছে।`
      : `Partner Cashflow & Settlement Hub tracks live rent inflows (Paid To) and out-of-pocket expenses (Paid From) per partner with automatic equity reconciliation.`;

    return {
      answer: answerText,
      actionType: "PARTNER_CASHFLOW",
      actionPayload: {
        propertyId: snapshot.propertyId,
        url: `/p/${snapshot.propertyId}/financial-hub?tab=Partner%20Settlement`,
      },
      suggestedChips: ["Monthly expenses?", "Unpaid rent?", "Property overview?"],
    };
  }

  // =========================================================================
  // 9. OVERALL PROPERTY SUMMARY / DASHBOARD KPI / HEALTH
  // e.g. "summary", "property status", "overview", "kpi", "dashboard", "health"
  // =========================================================================
  const summaryRegex =
    /(summary|overview|property status|dashboard|kpi|snapshot|health|motam status|mottham summary|kaisa chal raha|sob miliye)/i;

  if (summaryRegex.test(query)) {
    const answerText = isBengali
      ? `প্রপার্টি সারসংক্ষেপ: অকুপেন্সি ${snapshot.occupancyRatePercentage}% (${snapshot.vacantBeds} টি খালি বেড)। বকেয়া ভাড়া ₹${totalDues.toLocaleString("en-IN")}, এই মাসে খরচ ₹${totalExpenses.toLocaleString("en-IN")} এবং ${openComplaints.length} টি খোলা অভিযোগ রয়েছে।`
      : isTelugu
      ? `ప్రాపర్టీ సారాంశం: ఆక్యుపెన్సీ ${snapshot.occupancyRatePercentage}% (${snapshot.vacantBeds} ఖాళీ బెడ్లు ఉన్నాయి). బకాయిలు ₹${totalDues.toLocaleString("en-IN")}, ఈ నెల ఖర్చులు ₹${totalExpenses.toLocaleString("en-IN")}, మరియు ${openComplaints.length} ఓపెన్ ఫిర్యాదులు ఉన్నాయి.`
      : isHindi
      ? `प्रॉपर्टी सारांश: ऑक्यूपेंसी ${snapshot.occupancyRatePercentage}% (${snapshot.vacantBeds} खाली बेड्स). कुल बकाया ₹${totalDues.toLocaleString("en-IN")}, इस महीने का खर्च ₹${totalExpenses.toLocaleString("en-IN")} और ${openComplaints.length} खुली शिकायतें हैं।`
      : `Property Overview: Occupancy is ${snapshot.occupancyRatePercentage}% with ${snapshot.vacantBeds} vacant beds. Pending dues stand at ₹${totalDues.toLocaleString("en-IN")}, monthly expenses at ₹${totalExpenses.toLocaleString("en-IN")}, and ${openComplaints.length} complaints open.`;

    return {
      answer: answerText,
      actionType: "PROPERTY_SUMMARY",
      actionPayload: {
        totalBeds: snapshot.totalBeds,
        occupiedBeds: snapshot.occupiedBeds,
        vacantBeds: snapshot.vacantBeds,
        occupancyRate: snapshot.occupancyRatePercentage,
        totalPendingDues: totalDues,
        totalExpenses,
        openComplaints: openComplaints.length,
      },
      suggestedChips: ["Who owes rent?", "Vacant beds?", "Monthly expenses?"],
    };
  }

  // =========================================================================
  // 10. ATTRITION / TURNOVER METRICS
  // =========================================================================
  const attritionRegex = /(attrition rate|turnover rate|churn rate|what is (our )?attrition|what is (our )?turnover|past tenants)/i;

  if (attritionRegex.test(query)) {
    const pastOccupants = (snapshot.occupants || []).filter((o) => o.lifecycleStatus === "Past");
    const totalExits = pastOccupants.length;
    const attritionRate =
      activeOccupants.length > 0
        ? ((totalExits / (activeOccupants.length + totalExits)) * 100).toFixed(1)
        : "0.0";

    const answerText = isBengali
      ? `আনুমানিক টার্নওভার/অ্যাট্রিশন হার প্রায় ${attritionRate}%। বর্তমানে ${noticeOccupants.length} জন নোটিশে রয়েছেন।`
      : isTelugu
      ? `టర్నోవర్/అట్రిషన్ రేటు సుమారు ${attritionRate}%. ప్రస్తుతం ${noticeOccupants.length} మంది నోటీసు పీరియడ్‌లో ఉన్నారు.`
      : isHindi
      ? `अनुमानित अटरिशन दर ${attritionRate}% है। वर्तमान में ${noticeOccupants.length} किरायेदार नोटिस पर हैं।`
      : `Estimated room attrition rate is ${attritionRate}%. Currently ${noticeOccupants.length} tenant(s) on vacating notice.`;

    return {
      answer: answerText,
      actionType: "ATTRITION_METRICS",
      actionPayload: {
        exitsCount: totalExits,
        activeCount: activeOccupants.length,
        attritionRate: `${attritionRate}%`,
        onNoticeCount: noticeOccupants.length,
      },
      suggestedChips: ["Vacant beds?", "Unpaid rent?", "Monthly expenses?"],
    };
  }

  // If query is not a deterministic operational query (e.g. creative notice drafting, business advice, complex reasoning),
  // return null to gracefully delegate to Gemini Flash.
  return null;
}
