/**
 * ⚡ TenoPilot Fast Intent Query Engine
 * Provides instant (< 50ms) zero-latency client-side answers for high-frequency
 * operational PG questions (vacant beds, unpaid rent, joiners, complaints, expenses)
 * without waiting for cloud network roundtrips or LLM reasoning.
 */

import { CopilotPropertySnapshot, CopilotApiResponse } from "./aiCopilotPrompt";

export function tryFastClientQuery(
  rawQuery: string,
  snapshot: CopilotPropertySnapshot,
  preferredLanguage?: string
): CopilotApiResponse | null {
  if (!rawQuery || !snapshot) return null;

  const query = rawQuery.toLowerCase().trim();
  const lang = (preferredLanguage || "en-IN").toLowerCase();
  const isTelugu = lang.startsWith("te");
  const isHindi = lang.startsWith("hi");
  const isBengali = lang.startsWith("bn");

  // Pre-computed data extraction
  const todayStr = snapshot.currentDateAnchor || new Date().toISOString().split("T")[0];
  const activeOccupants = (snapshot.occupants || []).filter(
    (o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice"
  );
  const defaulters = activeOccupants.filter((o) => {
    const isUnpaid = o.paymentStatus !== "Paid";
    const hasDues = (o.rentAmount || 0) > 0 || (o.arrearsBalance || 0) > 0;
    return isUnpaid && hasDues;
  });
  const totalDues = defaulters.reduce(
    (acc, cur) => acc + (cur.rentAmount || 0) + (cur.arrearsBalance || 0),
    0
  );

  const checkinsToday = activeOccupants.filter((o) => {
    if (!o.joiningDate) return false;
    return o.joiningDate.slice(0, 10) === todayStr;
  });

  const allComplaints = snapshot.complaints || [];
  const openComplaints = allComplaints.filter(
    (c) => c.status === "OPEN" || c.status === "IN_PROGRESS"
  );

  const allExpenses = snapshot.expenses || [];
  const currentMonthPrefix = todayStr.slice(0, 7);
  const thisMonthExpenses = allExpenses.filter((e) => {
    const d = e.date || "";
    return d.slice(0, 7) === currentMonthPrefix;
  });
  const totalExpenses = thisMonthExpenses.reduce((acc, cur) => acc + (cur.amount || 0), 0);

  const vacantRooms = snapshot.vacantRooms || [];

  // =========================================================================
  // 1. VACANT BEDS / ROOM AVAILABILITY
  // =========================================================================
  const vacantBedRegex =
    /(vacant|empty|khali|khaali|kali|available|free|how many).*bed|bed.*(vacant|empty|khali|khaali|kali|available|free)|rooms? (available|vacant|empty|status)|bedlu|koto.*bed/i;

  if (vacantBedRegex.test(query)) {
    let answerText = "";
    if (snapshot.totalBedsConfigured === false && snapshot.totalBeds === 0) {
      answerText = isBengali
        ? `আপনার প্রপার্টি ম্যাপে রুম এবং বেডের লেআউট এখনও কনফিগার করা হয়নি। বর্তমানে ${activeOccupants.length} জন ভাড়াটিয়া রয়েছেন।`
        : isTelugu
        ? `మీ ప్రాపర్టీ మ్యాప్‌లో గదులు మరియు బెడ్ల లేఅవుట్ ఇంకా కాన్ఫిగర్ చేయలేదు. ప్రస్తుతం ${activeOccupants.length} మంది అద్దెదారులు ఉన్నారు.`
        : isHindi
        ? `आपकी प्रॉपर्टी मैप में कमरों और बेड्स का लेआउट अभी कॉन्फ़िगर नहीं किया गया है। वर्तमान में ${activeOccupants.length} किरायेदार रह रहे हैं।`
        : `Physical rooms and beds have not yet been mapped in Property Map. Currently hosting ${activeOccupants.length} active tenants.`;
    } else if (snapshot.vacantBeds === 0) {
      answerText = isBengali
        ? `বর্তমানে কোনো খালি বেড নেই! সব রুম ১০০% পূর্ণ রয়েছে।`
        : isTelugu
        ? `ప్రస్తుతం ఖాళీ బెడ్లు ఏమీ లేవు! అన్ని గదులు 100% ఆక్యుపై అయ్యాయి.`
        : isHindi
        ? `वर्तमान में कोई खाली बेड नहीं है! सभी कमरे 100% भरे हुए हैं।`
        : `All rooms are currently 100% occupied. There are 0 vacant beds.`;
    } else {
      answerText = isBengali
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
      actionPayload: vacantRooms.map((r) => ({
        roomNumber: r.roomNumber,
        floor: r.floorName,
        vacantBeds: r.vacantBedsCount,
        sharingType: r.sharingType,
      })),
      suggestedChips: ["Who owes rent?", "Joined today?", "Open complaints?"],
    };
  }

  // =========================================================================
  // 2. UNPAID RENT / DEFAULTERS
  // =========================================================================
  const unpaidRentRegex =
    /(unpaid|not paid|due|pending|defaulter|who owes|baki|baaki|ivvaledu|kattaledu|bhara).*rent|rent.*(unpaid|not paid|due|pending|defaulter|baki|baaki|ivvaledu|kattaledu|kiska|bhara)|kiska rent|kar.*bhara|bhara.*baki/i;

  if (unpaidRentRegex.test(query)) {
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
        ? `মোট ${defaulters.length} জনের ভাড়া বাকি রয়েছে, মোট বকেয়া ₹${totalDues.toLocaleString("en-IN")}।`
        : isTelugu
        ? `మొత్తం ${defaulters.length} మంది అద్దె చెల్లించాల్సి ఉంది. మొత్తం పెండింగ్ బకాయిలు ₹${totalDues.toLocaleString("en-IN")}.`
        : isHindi
        ? `कुल ${defaulters.length} किरायेदारों का किराया बाकी है, कुल बकाया ₹${totalDues.toLocaleString("en-IN")} है।`
        : `There are ${defaulters.length} tenants with unpaid rent totaling ₹${totalDues.toLocaleString("en-IN")}.`;
    }

    return {
      answer: answerText,
      actionType: "UNPAID_TENANTS",
      actionPayload: defaulters.map((d) => ({
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
  // 3. CHECK-INS TODAY / JOINED TODAY
  // =========================================================================
  const checkinTodayRegex =
    /(join.*today|joined today|today.*join|ee roju.*join|aaj.*join|ajke.*join|check.*in.*today|today.*check.*in|admissions today|who joined)/i;

  if (checkinTodayRegex.test(query)) {
    let answerText = "";
    if (checkinsToday.length === 0) {
      answerText = isBengali
        ? `আজ (${todayStr}) কোনো নতুন ভাড়াটিয়া যোগ দেননি।`
        : isTelugu
        ? `ఈ రోజు (${todayStr}) కొత్త అద్దెదారులు ఎవరూ చేరలేదు.`
        : isHindi
        ? `आज (${todayStr}) कोई नया किरायेदार नहीं जुड़ा है।`
        : `No new tenants checked in today (${todayStr}).`;
    } else {
      answerText = isBengali
        ? `আজ (${todayStr}) ${checkinsToday.length} জন নতুন ভাড়াটিয়া যোগ দিয়েছেন।`
        : isTelugu
        ? `ఈ రోజు (${todayStr}) ${checkinsToday.length} మంది కొత్త అద్దెదారులు చేరారు.`
        : isHindi
        ? `आज (${todayStr}) ${checkinsToday.length} नए किरायेदार जुड़े हैं।`
        : `${checkinsToday.length} new tenant(s) checked in today (${todayStr}).`;
    }

    return {
      answer: answerText,
      actionType: "NEW_CHECKINS",
      actionPayload: checkinsToday.map((c) => ({
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
  // 4. COMPLAINTS / MAINTENANCE
  // =========================================================================
  const complaintRegex =
    /(complaint|issue|repair|plumbing|leakage|wifi|clean|maintenance|problem|samasyalu|shikayat|ovinog|somossa)/i;

  if (complaintRegex.test(query)) {
    let answerText = "";
    if (openComplaints.length === 0) {
      answerText = isBengali
        ? `বর্তমানে কোনো খোলা অভিযোগ নেই! সব সমস্যা সমাধান করা হয়েছে।`
        : isTelugu
        ? `ప్రస్తుతం ఓపెన్ ఫిర్యాదులు ఏమీ లేవు! అన్ని నిర్వహణ సమస్యలు పరిష్కరించబడ్డాయి.`
        : isHindi
        ? `वर्तमान में कोई खुली शिकायत नहीं है! सभी समस्याएं हल हो चुकी हैं।`
        : `There are currently 0 open complaints registered. All maintenance is up to date!`;
    } else {
      answerText = isBengali
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
      actionPayload: openComplaints.map((c) => ({
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
  // 5. MONTHLY EXPENSES
  // =========================================================================
  const expenseRegex = /(expense|spending|spent|kharcha|kharchelu|bills|cost this month|khoroch)/i;

  if (expenseRegex.test(query)) {
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
    if (thisMonthExpenses.length === 0) {
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
  // 6. ATTRITION / TURNOVER
  // =========================================================================
  const attritionRegex = /(attrition|turnover|churn|how many left|leaving|vacating notice)/i;

  if (attritionRegex.test(query)) {
    const pastOccupants = (snapshot.occupants || []).filter((o) => o.lifecycleStatus === "Past");
    const noticeOccupants = activeOccupants.filter((o) => o.lifecycleStatus === "Notice");
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

  // If query requires deeper AI understanding / reasoning, return null to delegate to Gemini
  return null;
}
