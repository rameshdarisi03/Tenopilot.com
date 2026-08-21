import { NextRequest, NextResponse } from "next/server";

/**
 * Meta WhatsApp Webhook Verification Handshake (GET)
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "tenopilot_meta_webhook_secret";

  if (mode === "subscribe" && token === verifyToken) {
    console.info("Meta WhatsApp Webhook successfully verified!");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden: Invalid verification token", { status: 403 });
}

/**
 * Meta WhatsApp Inbound Message / Status Callback (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.info("Received Meta WhatsApp Webhook payload:", JSON.stringify(body, null, 2));

    // Handle inbound status updates (delivered, read) or customer messages
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (err) {
    console.warn("Error processing Meta webhook POST:", err);
    return NextResponse.json({ error: "Failed to parse webhook" }, { status: 400 });
  }
}
