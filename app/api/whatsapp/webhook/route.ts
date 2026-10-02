import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatIndianPhoneNumber } from "@/lib/whatsappService";

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

/**
 * Helper: Find matching tenant & property using 3-Tier Multi-Tenant Resolution
 * Tier 1: Outbound Dispatch Session (Exact Property & Tenant from recent rent reminder)
 * Tier 2: Real-Time Firestore Occupant Scan across all registered properties
 * Tier 3: Global Portfolio & Owner Account Mapping
 */
async function findOccupantByPhone(rawPhone: string): Promise<{
  occupant: any | null;
  propertyId: string;
  propertyName: string;
  allPropertyIds: string[];
}> {
  const cleanDigits = rawPhone.replace(/\D/g, "").slice(-10);
  let matchedOccupant: any = null;
  let matchedPropId = "sunshine-pg";
  let matchedPropName = "Sunshine Luxury PG";
  const allPropertyIds = new Set<string>(["sunshine-pg", "prop-1788438308277"]);

  if (!db) {
    return { occupant: null, propertyId: matchedPropId, propertyName: matchedPropName, allPropertyIds: Array.from(allPropertyIds) };
  }

  try {
    // 🔍 TIER 1: Check Outbound Dispatch Session Registry (100% Deterministic Attribution)
    try {
      const dispatchRef = doc(db, "whatsapp_outbound_dispatches", `dispatch_${cleanDigits}`);
      const dispatchSnap = await getDoc(dispatchRef);
      if (dispatchSnap.exists()) {
        const dData = dispatchSnap.data();
        if (dData.propertyId) {
          matchedPropId = dData.propertyId;
          matchedPropName = dData.propertyName || "TenoPilot PG";
          matchedOccupant = {
            id: dData.occupantId || `occ_${cleanDigits}`,
            name: dData.recipientName || "Resident",
            phone: rawPhone,
            roomNumber: dData.roomNumber || null,
            bedCode: dData.bedCode || null,
            propertyName: matchedPropName,
          };
          allPropertyIds.add(dData.propertyId);
          return {
            occupant: matchedOccupant,
            propertyId: matchedPropId,
            propertyName: matchedPropName,
            allPropertyIds: Array.from(allPropertyIds),
          };
        }
      }
    } catch (e) {
      console.warn("Notice checking outbound dispatch session:", e);
    }

    // 🔍 TIER 2: Discover properties and scan occupants in Firestore
    try {
      const propSnap = await getDocs(collection(db, "properties"));
      propSnap.forEach((d) => allPropertyIds.add(d.id));
    } catch (e) {}

    try {
      const portSnap = await getDocs(collection(db, "portfolio_properties"));
      portSnap.forEach((d) => allPropertyIds.add(d.id));
    } catch (e) {}

    for (const propId of Array.from(allPropertyIds)) {
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
              allPropertyIds: Array.from(allPropertyIds),
            };
          }
        }
      } catch (err) {}
    }
  } catch (err) {
    console.warn("Notice in findOccupantByPhone:", err);
  }

  return { occupant: matchedOccupant, propertyId: matchedPropId, propertyName: matchedPropName, allPropertyIds: Array.from(allPropertyIds) };
}

/**
 * Helper: Download media from Meta Graph API
 */
async function getMetaMediaUrl(mediaId: string, token: string): Promise<{ url: string; mimeType: string } | null> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
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
  "amount": number (numerical amount paid, without currency symbols, e.g. 135),
  "utr": string (12-digit UTR, Transaction ID, Reference Number, or UPI Reference ID, e.g. "786476913921"),
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
          const fromPhone = msg.from; // e.g. 919876543210
          const contactObj = contacts.find((c: any) => c.wa_id === fromPhone);
          const contactName = contactObj?.profile?.name || "Resident";
          const msgType = msg.type; // text, image, document, interactive

          // 1. Resolve occupant and property in Firestore
          const { occupant, propertyId, propertyName, allPropertyIds } = await findOccupantByPhone(fromPhone);

          let rawText = "";
          let mediaUrl: string | null = null;
          let mimeType: string | null = null;
          let extractedData: { amount?: number; utr?: string; paymentApp?: string } = {};
          let inboundCategory: "PAYMENT_PROOF" | "PAYMENT_CLAIM" | "TEXT_MESSAGE" | "SUPPORT_QUERY" = "TEXT_MESSAGE";

          if (msgType === "text") {
            rawText = msg.text?.body || "";
            const lower = rawText.toLowerCase();
            if (
              lower.includes("paid") ||
              lower.includes("done") ||
              lower.includes("sent") ||
              lower.includes("completed") ||
              lower.includes("transfer") ||
              lower.includes("gpay") ||
              lower.includes("phonepe") ||
              lower.includes("paytm") ||
              lower.includes("upi")
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
                    headers: { Authorization: `Bearer ${metaToken}` },
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

          const itemId = `inbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const inboxPayload = {
            id: itemId,
            wamid: msg.id,
            senderPhone: fromPhone,
            senderName: contactName,
            occupantId: occupant?.id || null,
            occupantName: occupant?.name || contactName,
            roomNumber: occupant?.roomNumber || null,
            bedCode: occupant?.bedCode || null,
            propertyId,
            type: inboundCategory,
            rawText,
            mediaUrl,
            mimeType,
            extractedData,
            status: "PENDING",
            timestamp: new Date().toISOString(),
          };

          // 2. Dual-Write to Firestore: Matched Property Inbox + Global Shared Inbound Archive
          try {
            await setDoc(
              doc(db, `properties/${propertyId}/whatsapp_inbox`, itemId),
              inboxPayload,
              { merge: true }
            );
          } catch (e) {
            console.warn(`Failed writing to properties/${propertyId}/whatsapp_inbox:`, e);
          }

          try {
            await setDoc(
              doc(db, "whatsapp_global_inbox", itemId),
              inboxPayload,
              { merge: true }
            );
          } catch (e) {
            console.warn("Failed writing to whatsapp_global_inbox:", e);
          }

          // Fan-out replicate to all discovered properties for this management scope
          const otherPropIds = Array.from(allPropertyIds).filter((p) => p !== propertyId);
          for (const pId of otherPropIds) {
            try {
              await setDoc(
                doc(db, `properties/${pId}/whatsapp_inbox`, itemId),
                { ...inboxPayload, propertyId: pId },
                { merge: true }
              );
            } catch (e) {}
          }

          // 3. Dispatch smart auto-acknowledgment within Meta's free 24-hour service window
          if (metaToken && phoneNumberId) {
            let replyText = "";
            if (inboundCategory === "PAYMENT_PROOF") {
              const amountBadge = extractedData.amount ? ` (₹${extractedData.amount.toLocaleString("en-IN")})` : "";
              const utrBadge = extractedData.utr ? ` • Ref: ${extractedData.utr}` : "";
              replyText = `Thank you ${occupant?.name || contactName}! 👋\n\nWe have received your payment screenshot${amountBadge}${utrBadge}.\n\nManagement at *${propertyName}* has been notified. Your verified digital receipt will be issued shortly once confirmed. 🟢\n\n_— ${propertyName} Operations_`;
            } else if (inboundCategory === "PAYMENT_CLAIM") {
              replyText = `Thank you ${occupant?.name || contactName}! 👍\n\nWe noted your payment confirmation. Kindly share the screenshot or 12-digit UTR reference here so *${propertyName}* desk can issue your official digital receipt immediately.\n\n_— ${propertyName} Operations_`;
            } else if (inboundCategory === "SUPPORT_QUERY") {
              replyText = `Hello ${occupant?.name || contactName}! 🛠️\n\nWe have logged your query and forwarded it to the *${propertyName}* front desk team. We will attend to this promptly.\n\n_— ${propertyName} Helpdesk_`;
            } else {
              replyText = `Hello ${occupant?.name || contactName}! 👋\n\nThank you for reaching out to *${propertyName}*. The management team has received your message.\n\n_— Powered by TenoPilot_`;
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
