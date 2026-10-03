import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Helper API to trigger an end-to-end simulated Meta WhatsApp Inbound Webhook
 * Useful for verifying mobile tracking, organization/property routing, and OCR extraction.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fromPhone = "916360443162",
      senderName = "Darisi",
      text = "PAYEMT DONE",
      type = "image", // "text" | "image"
      mediaUrl = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
    } = body;

    const simulatedMetaWebhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+1 555 123 4567",
                  phone_number_id: "1379712951886965",
                },
                contacts: [
                  {
                    profile: { name: senderName },
                    wa_id: fromPhone.replace(/\D/g, ""),
                  },
                ],
                messages: [
                  type === "image"
                    ? {
                        from: fromPhone.replace(/\D/g, ""),
                        id: `wamid.HBg.${Date.now()}`,
                        timestamp: `${Math.floor(Date.now() / 1000)}`,
                        type: "image",
                        image: {
                          caption: text || "PAYEMT DONE",
                          mime_type: "image/jpeg",
                          sha256: "dummy_sha",
                          id: "simulated_media_id",
                        },
                      }
                    : {
                        from: fromPhone.replace(/\D/g, ""),
                        id: `wamid.HBg.${Date.now()}`,
                        timestamp: `${Math.floor(Date.now() / 1000)}`,
                        type: "text",
                        text: {
                          body: text || "Ok..i will pay in a while",
                        },
                      },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    // Forward to the real webhook handler
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const webhookRes = await fetch(`${protocol}://${host}/api/whatsapp/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(simulatedMetaWebhookPayload),
    });

    const data = await webhookRes.json();
    return NextResponse.json({ success: true, webhookResponse: data, payload: simulatedMetaWebhookPayload }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
