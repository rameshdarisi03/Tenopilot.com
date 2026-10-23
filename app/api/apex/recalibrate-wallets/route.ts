import { NextResponse } from "next/server";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const results = [];
    const nowIso = new Date().toISOString();

    // 1. Recalibrate Ramesh Residencies (prop-1792314481132)
    // Starting 1000 base - 4 rent reminders = 996 + 100 Founder Grant = 1096 live credits
    const rameshWalletRef = doc(db, "properties/prop-1792314481132/whatsapp/wallet");
    const rameshTransactions = [
      {
        id: "tx-apex-grant-100",
        type: "PURCHASE",
        amount: 100,
        balanceAfter: 1096,
        description: "Apex Command Grant: +100 WhatsApp Credits (Founder Apex Command)",
        timestamp: nowIso,
        status: "DELIVERED",
      },
      {
        id: "tx-1792767027348-ojqic",
        type: "USAGE",
        amount: -1,
        balanceAfter: 996,
        description: "Auto-sent Rent Reminder to Rahul (Room 104)",
        recipientName: "Rahul",
        recipientPhone: "+91 919999999999",
        messageType: "RENT_REMINDER",
        timestamp: "2026-10-23T14:50:27.348Z",
        status: "DELIVERED",
      },
      {
        id: "tx-1792767025405-byvcp",
        type: "USAGE",
        amount: -1,
        balanceAfter: 997,
        description: "Auto-sent Rent Reminder to aaaa (Room 102)",
        recipientName: "aaaa",
        recipientPhone: "+91 9206651295",
        messageType: "RENT_REMINDER",
        timestamp: "2026-10-23T14:50:25.405Z",
        status: "DELIVERED",
      },
      {
        id: "tx-1792764340883-io372",
        type: "USAGE",
        amount: -1,
        balanceAfter: 998,
        description: "Auto-sent Rent Reminder to Rahul (Room 104)",
        recipientName: "Rahul",
        recipientPhone: "+91 919999999999",
        messageType: "RENT_REMINDER",
        timestamp: "2026-10-23T14:05:40.883Z",
        status: "DELIVERED",
      },
      {
        id: "tx-1792764338824-rti44",
        type: "USAGE",
        amount: -1,
        balanceAfter: 999,
        description: "Auto-sent Rent Reminder to aaaa (Room 102)",
        recipientName: "aaaa",
        recipientPhone: "+91 9206651295",
        messageType: "RENT_REMINDER",
        timestamp: "2026-10-23T14:05:38.824Z",
        status: "DELIVERED",
      },
      {
        id: "tx-pro-bonus-1792764125134",
        type: "PURCHASE",
        amount: 700,
        balanceAfter: 1000,
        description: "+700 Pro Plan Monthly Allocation (1000 Total Messages)",
        timestamp: "2026-10-23T14:02:05.134Z",
        status: "DELIVERED",
      },
      {
        id: "tx-1792580578561-4h4cn",
        type: "USAGE",
        amount: -1,
        balanceAfter: 299,
        description: "Welcome notice dispatched to aaaa (+91 9206651295)",
        recipientName: "aaaa",
        recipientPhone: "+91 9206651295",
        messageType: "ONBOARDING_INVITE",
        timestamp: "2026-10-21T11:02:58.561Z",
        status: "DELIVERED",
      },
      {
        id: "tx-pro-bonus-1792551487891",
        type: "PURCHASE",
        amount: 290,
        balanceAfter: 300,
        description: "+290 Pro Plan Monthly Allocation (300 Total Messages)",
        timestamp: "2026-10-21T02:58:07.891Z",
        status: "DELIVERED",
      },
      {
        id: "tx-bonus-1792315245172",
        type: "STARTER_BONUS",
        amount: 10,
        balanceAfter: 10,
        description: "10 Free Complimentary Cloud WhatsApp Credits",
        timestamp: "2026-10-18T09:20:45.172Z",
        status: "DELIVERED",
      },
    ];

    await setDoc(
      rameshWalletRef,
      {
        credits: 1096,
        transactions: rameshTransactions,
        updatedAt: nowIso,
        updatedBy: "Apex Recalibration Engine",
      },
      { merge: true }
    );

    // Update user docs for Ramesh Darisi
    await setDoc(
      doc(db, "users/uyDCqT5iQmWCMwRUK6PCrfAOJma2"),
      { whatsappCreditsLimit: 1100, updatedAt: nowIso },
      { merge: true }
    );
    await setDoc(
      doc(db, "founder_clients/rameshdarisi03@gmail.com"),
      { whatsappCreditsLimit: 1100, updatedAt: nowIso },
      { merge: true }
    );
    results.push({ account: "Ramesh Residencies", credits: 1096, quotaLimit: 1100 });

    // 2. Recalibrate Friendly Space PG (prop-1792504569569)
    // Starting 300 + 700 Pro adjustment = 1000 live credits (0 messages consumed)
    const friendlyWalletRef = doc(db, "properties/prop-1792504569569/whatsapp/wallet");
    const friendlyTransactions = [
      {
        id: "tx-pro-bonus-1000",
        type: "PURCHASE",
        amount: 700,
        balanceAfter: 1000,
        description: "+700 Pro Plan Monthly Allocation (1000 Total Messages)",
        timestamp: nowIso,
        status: "DELIVERED",
      },
      {
        id: "tx-pro-bonus-1792556678160",
        type: "PURCHASE",
        amount: 290,
        balanceAfter: 300,
        description: "+290 Pro Plan Monthly Allocation (300 Total Messages)",
        timestamp: "2026-10-21T04:24:38.160Z",
        status: "DELIVERED",
      },
      {
        id: "tx-bonus-1792556678160",
        type: "STARTER_BONUS",
        amount: 10,
        balanceAfter: 10,
        description: "10 Free Complimentary Cloud WhatsApp Credits",
        timestamp: "2026-10-21T04:24:38.160Z",
        status: "DELIVERED",
      },
    ];

    await setDoc(
      friendlyWalletRef,
      {
        credits: 1000,
        transactions: friendlyTransactions,
        updatedAt: nowIso,
        updatedBy: "Apex Recalibration Engine",
      },
      { merge: true }
    );

    // Update user docs for Friendly Space PG
    await setDoc(
      doc(db, "users/1gAD4ZCt4bXXBeZHUErAKYrcfof2"),
      { whatsappCreditsLimit: 1000, updatedAt: nowIso },
      { merge: true }
    );
    await setDoc(
      doc(db, "founder_clients/friendlyspacepg@gmail.com"),
      { whatsappCreditsLimit: 1000, updatedAt: nowIso },
      { merge: true }
    );
    results.push({ account: "Friendly Space PG", credits: 1000, quotaLimit: 1000 });

    return NextResponse.json({
      success: true,
      message: "Both accounts successfully recalibrated to accurate live balance and transaction history!",
      results,
    });
  } catch (error: any) {
    console.error("Recalibration error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
