import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage, WhatsAppSendParams, WhatsAppSendResult } from "@/lib/whatsappService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId, messages }: { propertyId: string; messages: WhatsAppSendParams[] } = body;

    if (!propertyId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: propertyId and messages array are required." },
        { status: 400 }
      );
    }

    const results: WhatsAppSendResult[] = [];

    for (const msgPayload of messages) {
      const result = await sendWhatsAppMessage(msgPayload);
      results.push(result);
    }

    const successfulCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      totalSent: messages.length,
      successfulCount,
      failedCount,
      results,
    });
  } catch (error: any) {
    console.error("WhatsApp API Dispatch route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process WhatsApp dispatch" },
      { status: 500 }
    );
  }
}
