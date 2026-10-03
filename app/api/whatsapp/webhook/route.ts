import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, getDoc, getDocs, collection, collectionGroup, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatIndianPhoneNumber } from "@/lib/whatsappService";
import { MOCK_OCCUPANTS_200 } from "@/constants/mockOccupants";

/**
 * Meta WhatsApp Webhook Verification Handshake (GET)
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const allowedTokens = [
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    "tenopilot_wa_webhook_secret_2026",
    "tenopilot_meta_webhook_secret",
    "tenopilot_webhook_secret",
    "tenopilot_secret_key",
  ].filter(Boolean);

  if (mode === "subscribe" && token && allowedTokens.includes(token)) {
    console.info("Meta WhatsApp Webhook successfully verified with challenge token!");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden: Invalid verification token", { status: 403 });
}

export interface OccupantResolution {
  occupant: any | null;
  propertyId: string;
  propertyName: string;
  organizationId: string | null;
  allPropertyIds: string[];
}

/**
 * Master 4-Step Flow:
 * STEP 1: Track the Sender's Mobile Number (extract clean 10 digits).
 * STEP 2: Check which Mobile Number is linked to which Organisation ID in Firestore.
 * STEP 3: Verify which Property ID & Room/Bed the tenant belongs to.
 * STEP 4: Pass that info into the WhatsApp Inbound Box & Dual-Write to Firestore.
 */
async function findOccupantByPhone(rawPhone: string): Promise<OccupantResolution> {
  // STEP 1: Track Mobile Number (Clean 10 digits)
  const cleanDigits = rawPhone.replace(/\D/g, "").slice(-10);
  let matchedOccupant: any = null;
  let matchedPropId = "all";
  let matchedPropName = "TenoPilot Living";
  let matchedOrgId: string | null = null;
  const allPropertyIds = new Set<string>(["sunshine-pg", "prop-1788438308277"]);

  if (!cleanDigits) {
    return {
      occupant: null,
      propertyId: matchedPropId,
      propertyName: matchedPropName,
      organizationId: matchedOrgId,
      allPropertyIds: Array.from(allPropertyIds),
    };
  }

  if (!db) {
    // In-memory lookup when Firestore is uninitialized
    const inMem = MOCK_OCCUPANTS_200.find(
      (o) => (o.phone || "").replace(/\D/g, "").slice(-10) === cleanDigits
    );
    if (inMem) {
      return {
        occupant: inMem,
        propertyId: "sunshine-pg",
        propertyName: "Sunshine Luxury PG",
        organizationId: "org_demo",
        allPropertyIds: ["sunshine-pg"],
      };
    }
    return {
      occupant: null,
      propertyId: "all",
      propertyName: "TenoPilot Living",
      organizationId: null,
      allPropertyIds: ["sunshine-pg"],
    };
  }

  try {
    // 🔍 STEP 2A: Check Direct Fast-Lookup Phone Index (occupants_by_phone)
    try {
      const phoneIndexSnap = await getDoc(doc(db, "occupants_by_phone", cleanDigits));
      if (phoneIndexSnap.exists()) {
        const pData = phoneIndexSnap.data();
        if (pData.propertyId) {
          matchedPropId = pData.propertyId;
          matchedPropName = pData.propertyName || "TenoPilot PG";
          matchedOrgId = pData.organizationId || null;
          matchedOccupant = {
            id: pData.occupantId || `occ_${cleanDigits}`,
            name: pData.occupantName || "Resident",
            phone: rawPhone,
            roomNumber: pData.roomNumber || null,
            bedCode: pData.bedCode || null,
            rentAmount: pData.rentAmount || 0,
            propertyName: matchedPropName,
            propertyId: matchedPropId,
            organizationId: matchedOrgId,
          };
          allPropertyIds.add(matchedPropId);

          return {
            occupant: matchedOccupant,
            propertyId: matchedPropId,
            propertyName: matchedPropName,
            organizationId: matchedOrgId,
            allPropertyIds: Array.from(allPropertyIds),
          };
        }
      }
    } catch (e) {
      console.warn("Notice checking occupants_by_phone index:", e);
    }

    // 🔍 STEP 2B: Check Outbound Dispatch Session Registry (whatsapp_outbound_dispatches)
    try {
      const dispatchSnap = await getDoc(doc(db, "whatsapp_outbound_dispatches", `dispatch_${cleanDigits}`));
      if (dispatchSnap.exists()) {
        const dData = dispatchSnap.data();
        if (dData.propertyId) {
          matchedPropId = dData.propertyId;
          matchedPropName = dData.propertyName || "TenoPilot PG";
          matchedOrgId = dData.organizationId || null;
          matchedOccupant = {
            id: dData.occupantId || `occ_${cleanDigits}`,
            name: dData.recipientName || "Resident",
            phone: rawPhone,
            roomNumber: dData.roomNumber || null,
            bedCode: dData.bedCode || null,
            propertyName: matchedPropName,
            propertyId: matchedPropId,
            organizationId: matchedOrgId,
          };
          allPropertyIds.add(dData.propertyId);

          return {
            occupant: matchedOccupant,
            propertyId: matchedPropId,
            propertyName: matchedPropName,
            organizationId: matchedOrgId,
            allPropertyIds: Array.from(allPropertyIds),
          };
        }
      }
    } catch (e) {
      console.warn("Notice checking outbound dispatch session:", e);
    }

    // 🔍 STEP 2C: Global collectionGroup Scan across all occupants in Firestore
    try {
      const occGroupSnap = await getDocs(collectionGroup(db, "occupants"));
      for (const oDoc of occGroupSnap.docs) {
        const oData = oDoc.data();
        const occClean = (oData.phone || "").replace(/\D/g, "").slice(-10);
        if (occClean && occClean === cleanDigits) {
          const parentPropId = oDoc.ref.parent.parent?.id || oData.propertyId || "sunshine-pg";
          matchedPropId = parentPropId;
          matchedPropName = oData.propertyName || (parentPropId === "sunshine-pg" ? "Sunshine Luxury PG" : "TenoPilot PG");
          matchedOrgId = oData.organizationId || null;
          matchedOccupant = {
            id: oDoc.id,
            ...oData,
            propertyName: matchedPropName,
            propertyId: matchedPropId,
          };
          allPropertyIds.add(matchedPropId);

          return {
            occupant: matchedOccupant,
            propertyId: matchedPropId,
            propertyName: matchedPropName,
            organizationId: matchedOrgId,
            allPropertyIds: Array.from(allPropertyIds),
          };
        }
      }
    } catch (e) {
      console.warn("Notice scanning collectionGroup occupants:", e);
    }

    // 🔍 STEP 2D: Organization & Property Portfolio Discovery
    try {
      const portSnap = await getDocs(collection(db, "portfolio_properties"));
      portSnap.forEach((d) => {
        allPropertyIds.add(d.id);
        const data = d.data();
        if (data?.id) allPropertyIds.add(data.id);
      });
    } catch (e) {}

    try {
      const usersSnap = await getDocs(collection(db, "users"));
      usersSnap.forEach((d) => {
        const uData = d.data();
        if (uData?.organizationId) matchedOrgId = uData.organizationId;
        if (uData?.assignedPropertyId) allPropertyIds.add(uData.assignedPropertyId);
        if (uData?.propertyId) allPropertyIds.add(uData.propertyId);
        if (Array.isArray(uData?.assignedPropertyIds)) {
          uData.assignedPropertyIds.forEach((pid: string) => pid && allPropertyIds.add(pid));
        }
      });
    } catch (e) {}

    try {
      const staffSnap = await getDocs(collection(db, "staff_accounts"));
      staffSnap.forEach((d) => {
        const sData = d.data();
        if (sData?.assignedPropertyId) allPropertyIds.add(sData.assignedPropertyId);
        if (Array.isArray(sData?.assignedPropertyIds)) {
          sData.assignedPropertyIds.forEach((pid: string) => pid && allPropertyIds.add(pid));
        }
      });
    } catch (e) {}

    try {
      const clientSnap = await getDocs(collection(db, "founder_clients"));
      clientSnap.forEach((d) => {
        const cData = d.data();
        if (cData?.assignedPropertyId) allPropertyIds.add(cData.assignedPropertyId);
      });
    } catch (e) {}

    // 🔍 STEP 3: Scan all discovered properties for matching occupant
    for (const propId of Array.from(allPropertyIds)) {
      if (!propId) continue;
      try {
        const occSnap = await getDocs(collection(db, `properties/${propId}/occupants`));
        for (const oDoc of occSnap.docs) {
          const oData = oDoc.data();
          const occPhone = (oData.phone || "").replace(/\D/g, "").slice(-10);
          if (occPhone && occPhone === cleanDigits) {
            matchedOccupant = { id: oDoc.id, ...oData };
            matchedPropId = propId;
            matchedPropName = oData.propertyName || (propId === "sunshine-pg" ? "Sunshine Luxury PG" : "TenoPilot PG");
            return {
              occupant: matchedOccupant,
              propertyId: matchedPropId,
              propertyName: matchedPropName,
              organizationId: matchedOrgId,
              allPropertyIds: Array.from(allPropertyIds),
            };
          }
        }
      } catch (err) {}
    }

    // 🔍 In-Memory mock occupants fallback (handles demo names like Darisi or Aarav)
    const inMem = MOCK_OCCUPANTS_200.find(
      (o) => (o.phone || "").replace(/\D/g, "").slice(-10) === cleanDigits
    );
    if (inMem) {
      matchedOccupant = inMem;
      matchedPropId = "sunshine-pg";
      matchedPropName = "Sunshine Luxury PG";
    }
  } catch (err) {
    console.warn("Notice in findOccupantByPhone:", err);
  }

  return {
    occupant: matchedOccupant,
    propertyId: matchedPropId,
    propertyName: matchedPropName,
    organizationId: matchedOrgId,
    allPropertyIds: Array.from(allPropertyIds),
  };
}

/**
 * Helper: Download media from Meta Graph API
 */
async function getMetaMediaUrl(mediaId: string, token: string): Promise<{ url: string; mimeType: string } | null> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "TenoPilot-WhatsApp-Engine/1.0",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { url: data.url, mimeType: data.mime_type || "image/jpeg" };
  } catch (err) {
    console.warn("Failed to fetch media metadata from Meta:", err);
    return null;
  }
}

/**
 * Helper: Run Gemini Vision OCR directly on base64 image bytes
 */
async function runGeminiVisionOcrWithBytes(
  base64Data: string,
  mimeType: string,
  apiKey: string
): Promise<{ amount?: number; utr?: string; paymentApp?: string }> {
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze this payment confirmation screenshot (PhonePe, Google Pay, Paytm, BHIM, Bank Transfer).
Extract the following fields in strict JSON format:
{
  "amount": number (numerical amount paid, without currency symbols, e.g. 135 or 8500),
  "utr": string (12-digit UTR, Transaction ID, Reference Number, or UPI Reference ID, e.g. "202609048821"),
  "paymentApp": string ("PhonePe" | "Google Pay" | "Paytm" | "Cred" | "BHIM" | "Bank Transfer" | "Other"),
  "status": string ("SUCCESS" | "PENDING" | "FAILED")
}
Return ONLY valid raw JSON, without any markdown formatting or explanations.`,
                },
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiRes.ok) return {};
    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    return {
      amount: typeof parsed.amount === "number" ? parsed.amount : Number(parsed.amount) || undefined,
      utr: parsed.utr ? String(parsed.utr).trim() : undefined,
      paymentApp: parsed.paymentApp ? String(parsed.paymentApp).trim() : undefined,
    };
  } catch (e) {
    console.warn("Gemini Vision OCR extraction notice:", e);
    return {};
  }
}

/**
 * Helper: Dispatch free 24-hour service auto-acknowledgment
 */
async function sendAutoAcknowledgment(toPhone: string, text: string, token: string, phoneNumberId: string) {
  try {
    await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formatIndianPhoneNumber(toPhone),
        type: "text",
        text: { preview_url: false, body: text },
      }),
    });
  } catch (err) {
    console.warn("Auto acknowledgment dispatch notice:", err);
  }
}

/**
 * Meta WhatsApp Inbound Message / Status Callback (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const metaToken = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1379712951886965";
    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const val = change.value || {};
        const messages = val.messages || [];
        const contacts = val.contacts || [];

        for (const msg of messages) {
          const fromPhone = msg.from; // e.g. 916360443162
          const contactObj = contacts.find((c: any) => c.wa_id === fromPhone);
          const contactName = contactObj?.profile?.name || "Resident";
          const msgType = msg.type; // text, image, document, interactive, button

          // STEP 1, 2, 3: Track mobile number, link to organisation ID, verify property ID
          const { occupant, propertyId, propertyName, organizationId, allPropertyIds } = await findOccupantByPhone(fromPhone);

          let rawText = "";
          let mediaUrl: string | null = null;
          let mimeType: string | null = null;
          let extractedData: { amount?: number; utr?: string; paymentApp?: string } = {};
          let inboundCategory: "PAYMENT_PROOF" | "PAYMENT_CLAIM" | "TEXT_MESSAGE" | "SUPPORT_QUERY" = "TEXT_MESSAGE";

          if (msgType === "text") {
            rawText = msg.text?.body || "";
          } else if (msgType === "interactive") {
            rawText =
              msg.interactive?.button_reply?.title ||
              msg.interactive?.list_reply?.title ||
              msg.interactive?.button_reply?.id ||
              "Interactive Response";
          } else if (msgType === "button") {
            rawText = msg.button?.text || msg.button?.payload || "Button Response";
          } else if (msgType === "document") {
            rawText = msg.document?.caption || msg.document?.filename || "Document / Receipt Attached";
            const docMediaId = msg.document?.id;
            if (docMediaId && metaToken) {
              const metaMedia = await getMetaMediaUrl(docMediaId, metaToken);
              if (metaMedia) {
                mimeType = metaMedia.mimeType;
                mediaUrl = `/api/whatsapp/media?id=${docMediaId}`;
              }
            }
          } else if (msgType === "image" && metaToken) {
            inboundCategory = "PAYMENT_PROOF";
            rawText = msg.image?.caption || "Payment Screenshot Attached";
            const mediaId = msg.image?.id;

            if (mediaId) {
              const metaMedia = await getMetaMediaUrl(mediaId, metaToken);
              if (metaMedia) {
                mimeType = metaMedia.mimeType;
                mediaUrl = `/api/whatsapp/media?id=${mediaId}`;

                try {
                  const imgRes = await fetch(metaMedia.url, {
                    headers: {
                      Authorization: `Bearer ${metaToken}`,
                      "User-Agent": "TenoPilot-WhatsApp-Engine/1.0",
                    },
                  });
                  if (imgRes.ok) {
                    const arrayBuffer = await imgRes.arrayBuffer();
                    const base64Data = Buffer.from(arrayBuffer).toString("base64");
                    mediaUrl = `data:${metaMedia.mimeType};base64,${base64Data}`;

                    if (geminiKey) {
                      extractedData = await runGeminiVisionOcrWithBytes(base64Data, metaMedia.mimeType, geminiKey);
                    }
                  }
                } catch (e) {
                  console.warn("Failed to fetch image binary for OCR:", e);
                }
              }
            }
          }

          // Intelligent Inbound Intent Classification with Fuzzy Spelling Support (e.g. PAYEMT, PAID, DONE)
          const lower = rawText.toLowerCase();
          if (msgType === "image" || (msgType === "document" && (mimeType?.includes("pdf") || mimeType?.includes("image")))) {
            inboundCategory = "PAYMENT_PROOF";
          } else if (
            lower.includes("paid") ||
            lower.includes("paymt") ||
            lower.includes("payemt") ||
            lower.includes("payment") ||
            lower.includes("done") ||
            lower.includes("sent") ||
            lower.includes("transferred") ||
            lower.includes("transfer") ||
            lower.includes("completed") ||
            lower.includes("gpay") ||
            lower.includes("phonepe") ||
            lower.includes("paytm") ||
            lower.includes("upi") ||
            lower.includes("utr") ||
            lower.includes("screenshot")
          ) {
            inboundCategory = "PAYMENT_CLAIM";
          } else if (
            lower.includes("wifi") ||
            lower.includes("leak") ||
            lower.includes("clean") ||
            lower.includes("food") ||
            lower.includes("water") ||
            lower.includes("help") ||
            lower.includes("issue") ||
            lower.includes("complaint")
          ) {
            inboundCategory = "SUPPORT_QUERY";
          }

          // STEP 4: Build Inbound Box Payload and Pass to Inbound Feeds
          const itemId = `inbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const inboxPayload = {
            id: itemId,
            wamid: msg.id || itemId,
            senderPhone: fromPhone,
            senderName: contactName,
            occupantId: occupant?.id || null,
            occupantName: occupant?.name || contactName,
            roomNumber: occupant?.roomNumber || null,
            bedCode: occupant?.bedCode || null,
            propertyId: propertyId,
            propertyName: propertyName,
            organizationId: organizationId || null,
            isUnassigned: propertyId === "all",
            type: inboundCategory,
            rawText,
            mediaUrl,
            mimeType,
            extractedData,
            status: "PENDING",
            timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString(),
          };

          if (db) {
            // A) Always write to Global Inbound Archive
            try {
              await setDoc(
                doc(db, "whatsapp_global_inbox", itemId),
                inboxPayload,
                { merge: true }
              );
            } catch (e) {
              console.warn("Failed writing to whatsapp_global_inbox:", e);
            }

            // B) If attributed to a specific property, write to property inbox
            if (propertyId && propertyId !== "all") {
              try {
                await setDoc(
                  doc(db, `properties/${propertyId}/whatsapp_inbox`, itemId),
                  inboxPayload,
                  { merge: true }
                );
              } catch (e) {
                console.warn(`Failed writing to properties/${propertyId}/whatsapp_inbox:`, e);
              }
            } else {
              // C) If unassigned, replicate to all discovered properties
              for (const pId of Array.from(allPropertyIds)) {
                if (!pId) continue;
                try {
                  await setDoc(
                    doc(db, `properties/${pId}/whatsapp_inbox`, itemId),
                    { ...inboxPayload, propertyId: pId },
                    { merge: true }
                  );
                } catch (e) {}
              }
            }

            // D) If organizationId is resolved, write to organization inbox
            if (organizationId) {
              try {
                await setDoc(
                  doc(db, `organizations/${organizationId}/whatsapp_inbox`, itemId),
                  inboxPayload,
                  { merge: true }
                );
              } catch (e) {}
            }
          }

          // Dispatch free 24-hour auto-acknowledgment
          if (metaToken && phoneNumberId) {
            let replyText = "";
            const activePropertyName = propertyName || "TenoPilot Living";
            if (inboundCategory === "PAYMENT_PROOF") {
              const amountBadge = extractedData.amount ? ` (₹${extractedData.amount.toLocaleString("en-IN")})` : "";
              const utrBadge = extractedData.utr ? ` • Ref: ${extractedData.utr}` : "";
              replyText = `Thank you ${occupant?.name || contactName}! 👋\n\nWe have received your payment screenshot${amountBadge}${utrBadge}.\n\nManagement at *${activePropertyName}* has been notified. Your verified digital receipt will be issued shortly once confirmed. 🟢\n\n_— ${activePropertyName} Operations_`;
            } else if (inboundCategory === "PAYMENT_CLAIM") {
              replyText = `Thank you ${occupant?.name || contactName}! 👍\n\nWe noted your payment confirmation. Kindly share the screenshot or 12-digit UTR reference here so *${activePropertyName}* desk can issue your official digital receipt immediately.\n\n_— ${activePropertyName} Operations_`;
            } else if (inboundCategory === "SUPPORT_QUERY") {
              replyText = `Hello ${occupant?.name || contactName}! 🛠️\n\nWe have logged your query and forwarded it to the *${activePropertyName}* front desk team. We will attend to this promptly.\n\n_— ${activePropertyName} Helpdesk_`;
            } else {
              replyText = `Hello ${occupant?.name || contactName}! 👋\n\nThank you for reaching out to *${activePropertyName}*. The management team has received your message.\n\n_— Powered by TenoPilot_`;
            }

            await sendAutoAcknowledgment(fromPhone, replyText, metaToken, phoneNumberId);
          }
        }
      }
    }

    return NextResponse.json({ status: "EVENT_PROCESSED" }, { status: 200 });
  } catch (err: any) {
    console.error("Error processing Meta webhook POST:", err);
    return NextResponse.json({ error: err.message || "Failed to parse webhook" }, { status: 500 });
  }
}
