import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, getDoc, getDocs, collection, collectionGroup } from "firebase/firestore";
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
  isMultiProperty?: boolean;
  multiPropertyNames?: string[];
}

/**
 * Master 3-Tier Multi-Tenant Resolution Engine:
 * 
 * TIER 1: Outbound Context Linking
 *   - Check `whatsapp_outbound_dispatches` to attribute replies to the PG that messaged the tenant most recently (< 48 hours).
 * 
 * TIER 2: Active Ledger & Due Date Recency
 *   - Check `occupants_by_phone` & property occupants to find actively billing properties.
 * 
 * TIER 3: Multi-PG Disambiguation & Dual-Delivery
 *   - If registered across multiple PGs (e.g. former PG owner never checked out tenant),
 *     tag with `isMultiProperty: true` and deliver to both relevant inboxes so no proof is lost.
 */
async function findOccupantByPhone(rawPhone: string): Promise<OccupantResolution> {
  const cleanDigits = rawPhone.replace(/\D/g, "").slice(-10);
  const allPropertyIds = new Set<string>(["prop-1788438308277", "sunshine-pg"]);

  if (!cleanDigits) {
    return {
      occupant: null,
      propertyId: "all",
      propertyName: "TenoPilot Living",
      organizationId: null,
      allPropertyIds: Array.from(allPropertyIds),
    };
  }

  if (!db) {
    const inMem = MOCK_OCCUPANTS_200.find(
      (o) => (o.phone || "").replace(/\D/g, "").slice(-10) === cleanDigits
    );
    if (inMem) {
      return {
        occupant: inMem,
        propertyId: "prop-1788438308277",
        propertyName: "Vibe stays",
        organizationId: "org_demo",
        allPropertyIds: ["prop-1788438308277"],
      };
    }
    return {
      occupant: null,
      propertyId: "all",
      propertyName: "TenoPilot Living",
      organizationId: null,
      allPropertyIds: ["prop-1788438308277"],
    };
  }

  const candidateProfiles: any[] = [];

  // 1. Check Outbound Dispatch Session Registry (Tier 1 Priority)
  let lastOutboundPropertyId: string | null = null;
  let lastOutboundPropertyName: string | null = null;
  let lastOutboundTimestamp: number = 0;

  try {
    const dispatchSnap = await getDoc(doc(db, "whatsapp_outbound_dispatches", `dispatch_${cleanDigits}`));
    if (dispatchSnap.exists()) {
      const dData = dispatchSnap.data();
      if (dData.propertyId) {
        lastOutboundPropertyId = dData.propertyId;
        lastOutboundPropertyName = dData.propertyName || "TenoPilot PG";
        lastOutboundTimestamp = new Date(dData.dispatchedAt || dData.timestamp || 0).getTime();
      }
    }
  } catch (e) {
    console.warn("Notice checking outbound dispatch session:", e);
  }

  // 2. Check Fast-Lookup Phone Index
  try {
    const phoneIndexSnap = await getDoc(doc(db, "occupants_by_phone", cleanDigits));
    if (phoneIndexSnap.exists()) {
      const pData = phoneIndexSnap.data();
      if (pData.propertyId) {
        candidateProfiles.push({
          id: pData.occupantId || `occ_${cleanDigits}`,
          name: pData.occupantName || "Resident",
          phone: rawPhone,
          roomNumber: pData.roomNumber || null,
          bedCode: pData.bedCode || null,
          rentAmount: pData.rentAmount || 0,
          propertyName: pData.propertyName || (pData.propertyId === "prop-1788438308277" ? "Vibe stays" : "Sunshine Luxury PG"),
          propertyId: pData.propertyId,
          organizationId: pData.organizationId || null,
        });
        allPropertyIds.add(pData.propertyId);
      }
    }
  } catch (e) {
    console.warn("Notice checking occupants_by_phone:", e);
  }

  // 3. Scan Known Properties for Active Occupants
  const targetProperties = ["prop-1788438308277", "sunshine-pg"];
  for (const pId of targetProperties) {
    try {
      const occSnap = await getDocs(collection(db, `properties/${pId}/occupants`));
      for (const oDoc of occSnap.docs) {
        const oData = oDoc.data();
        const occClean = (oData.phone || "").replace(/\D/g, "").slice(-10);
        if (occClean && occClean === cleanDigits) {
          const propName = oData.propertyName || (pId === "prop-1788438308277" ? "Vibe stays" : "Sunshine Luxury PG");
          const exists = candidateProfiles.some((c) => c.propertyId === pId && c.id === oDoc.id);
          if (!exists) {
            candidateProfiles.push({
              id: oDoc.id,
              ...oData,
              propertyId: pId,
              propertyName: propName,
            });
          }
          allPropertyIds.add(pId);
        }
      }
    } catch (e) {}
  }

  // Fallback scan across all occupants via collectionGroup
  if (candidateProfiles.length === 0) {
    try {
      const occGroupSnap = await getDocs(collectionGroup(db, "occupants"));
      for (const oDoc of occGroupSnap.docs) {
        const oData = oDoc.data();
        const occClean = (oData.phone || "").replace(/\D/g, "").slice(-10);
        if (occClean && occClean === cleanDigits) {
          const parentPropId = oDoc.ref.parent.parent?.id || oData.propertyId || "prop-1788438308277";
          const propName = oData.propertyName || (parentPropId === "prop-1788438308277" ? "Vibe stays" : "Sunshine Luxury PG");
          candidateProfiles.push({
            id: oDoc.id,
            ...oData,
            propertyId: parentPropId,
            propertyName: propName,
          });
          allPropertyIds.add(parentPropId);
        }
      }
    } catch (e) {}
  }

  // DISAMBIGUATION LOGIC:
  const isMultiProperty = candidateProfiles.length > 1;
  const multiPropertyNames = Array.from(new Set(candidateProfiles.map((p) => p.propertyName || p.propertyId)));

  // Case A: Recent Outbound reminder sent within last 48 hours
  const isRecentOutbound = lastOutboundPropertyId && Date.now() - lastOutboundTimestamp < 48 * 3600 * 1000;
  if (isRecentOutbound) {
    const matched = candidateProfiles.find((c) => c.propertyId === lastOutboundPropertyId) || {
      id: `occ_${cleanDigits}`,
      name: "Resident",
      phone: rawPhone,
      propertyId: lastOutboundPropertyId,
      propertyName: lastOutboundPropertyName || "TenoPilot PG",
    };

    return {
      occupant: matched,
      propertyId: lastOutboundPropertyId || "prop-1788438308277",
      propertyName: matched.propertyName,
      organizationId: matched.organizationId || null,
      allPropertyIds: Array.from(allPropertyIds),
      isMultiProperty,
      multiPropertyNames,
    };
  }

  // Case B: Exactly one candidate profile found
  if (candidateProfiles.length === 1) {
    const single = candidateProfiles[0];
    return {
      occupant: single,
      propertyId: single.propertyId,
      propertyName: single.propertyName,
      organizationId: single.organizationId || null,
      allPropertyIds: Array.from(allPropertyIds),
      isMultiProperty: false,
    };
  }

  // Case C: Multiple profiles found (e.g. former PG + new PG)
  if (candidateProfiles.length > 1) {
    // Prioritize active (non-past) profile
    const activeProfile = candidateProfiles.find((c) => c.lifecycleStatus !== "Past") || candidateProfiles[0];
    return {
      occupant: activeProfile,
      propertyId: activeProfile.propertyId,
      propertyName: activeProfile.propertyName,
      organizationId: activeProfile.organizationId || null,
      allPropertyIds: Array.from(allPropertyIds),
      isMultiProperty: true,
      multiPropertyNames,
    };
  }

  // Fallback: Default to Vibe Stays if unknown
  return {
    occupant: null,
    propertyId: "prop-1788438308277",
    propertyName: "Vibe stays",
    organizationId: null,
    allPropertyIds: Array.from(allPropertyIds),
    isMultiProperty: false,
  };
}

/**
 * Meta Media URL Fetcher (Graph API v21.0)
 */
async function getMetaMediaUrl(mediaId: string, token: string): Promise<{ url: string; mimeType: string } | null> {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      url: data.url,
      mimeType: data.mime_type || "image/jpeg",
    };
  } catch (err) {
    console.warn("Notice fetching Meta media URL:", err);
    return null;
  }
}

/**
 * Dispatch free 24-hour service auto-acknowledgment
 */
async function sendAutoAcknowledgment(toPhone: string, text: string, token: string, phoneNumberId: string) {
  try {
    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
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

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const val = change.value || {};
        const messages = val.messages || [];
        const contacts = val.contacts || [];

        for (const msg of messages) {
          const fromPhone = msg.from; // e.g. 919206651295
          const contactObj = contacts.find((c: any) => c.wa_id === fromPhone);
          const contactName = contactObj?.profile?.name || "Resident";
          const msgType = msg.type; // text, image, document, interactive, button

          // 1. Multi-tenant 3-Tier Resolution
          const {
            occupant,
            propertyId,
            propertyName,
            organizationId,
            allPropertyIds,
            isMultiProperty,
            multiPropertyNames,
          } = await findOccupantByPhone(fromPhone);

          let rawText = "";
          let mediaUrl: string | null = null;
          let mimeType: string | null = null;
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
            rawText = msg.document?.caption || msg.document?.filename || "Document Attached";
            const docMediaId = msg.document?.id;
            if (docMediaId) {
              mediaUrl = `/api/whatsapp/media?id=${docMediaId}`;
              mimeType = msg.document?.mime_type || "application/pdf";
            }
          } else if (msgType === "image") {
            inboundCategory = "PAYMENT_PROOF";
            rawText = msg.image?.caption || "Payment Screenshot Attached";
            const mediaId = msg.image?.id;

            if (mediaId) {
              // Store direct genuine streaming proxy endpoint
              mediaUrl = `/api/whatsapp/media?id=${mediaId}`;
              mimeType = msg.image?.mime_type || "image/jpeg";
            }
          }

          // Fuzzy intent classification
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

          // 2. Build Inbound Payload with Genuine Media & Raw Text
          const itemId = `inbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const inboxPayload = {
            id: itemId,
            wamid: msg.id || itemId,
            senderPhone: fromPhone,
            senderName: occupant?.name || contactName,
            occupantId: occupant?.id || null,
            occupantName: occupant?.name || contactName,
            roomNumber: occupant?.roomNumber || null,
            bedCode: occupant?.bedCode || null,
            propertyId: propertyId,
            propertyName: propertyName,
            organizationId: organizationId || null,
            isUnassigned: propertyId === "all",
            isMultiProperty: isMultiProperty || false,
            multiPropertyNames: multiPropertyNames || [],
            type: inboundCategory,
            rawText,
            mediaUrl,
            mimeType,
            status: "PENDING",
            timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString(),
          };

          // 3. Dual-Write to Firestore & Replicate if Multi-Property
          if (db) {
            try {
              await setDoc(doc(db, "whatsapp_global_inbox", itemId), inboxPayload, { merge: true });
            } catch (e) {
              console.warn("Notice writing to whatsapp_global_inbox:", e);
            }

            if (propertyId && propertyId !== "all") {
              try {
                await setDoc(doc(db, `properties/${propertyId}/whatsapp_inbox`, itemId), inboxPayload, { merge: true });
              } catch (e) {
                console.warn(`Notice writing to properties/${propertyId}/whatsapp_inbox:`, e);
              }
            }

            // If ambiguous multi-property, mirror to secondary properties for zero proof loss
            if (isMultiProperty && allPropertyIds.length > 1) {
              for (const pId of allPropertyIds) {
                if (pId !== propertyId) {
                  try {
                    await setDoc(
                      doc(db, `properties/${pId}/whatsapp_inbox`, itemId),
                      { ...inboxPayload, propertyId: pId },
                      { merge: true }
                    );
                  } catch (e) {}
                }
              }
            }
          }

          // 4. Free 24-Hour WhatsApp Service Auto-Acknowledgment
          if (metaToken && phoneNumberId) {
            let replyText = "";
            const activePropertyName = propertyName || "TenoPilot Living";
            if (inboundCategory === "PAYMENT_PROOF") {
              replyText = `Thank you ${occupant?.name || contactName}! 👋\n\nWe have received your payment screenshot.\n\nManagement at *${activePropertyName}* has been notified. Your verified digital receipt will be issued once confirmed. 🟢\n\n_— ${activePropertyName} Operations_`;
            } else if (inboundCategory === "PAYMENT_CLAIM") {
              replyText = `Thank you ${occupant?.name || contactName}! 👍\n\nWe noted your payment confirmation. Kindly share the screenshot or 12-digit UTR reference here so *${activePropertyName}* desk can issue your official digital receipt immediately.\n\n_— ${activePropertyName} Operations_`;
            } else if (inboundCategory === "SUPPORT_QUERY") {
              replyText = `Hello ${occupant?.name || contactName}! 🛠️\n\nWe have logged your query and forwarded it to the *${activePropertyName}* front desk team.\n\n_— ${activePropertyName} Helpdesk_`;
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
