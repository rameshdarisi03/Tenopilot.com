import { NextRequest, NextResponse } from "next/server";
import { sendBrevoEmail, BrevoSendResult } from "@/lib/brevoService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      apiKey,
      senderEmail,
      senderName,
      testRecipientEmail,
      propertyName = "TenoPilot Property",
    } = body;

    if (!testRecipientEmail) {
      return NextResponse.json(
        { error: "testRecipientEmail is required to verify the gateway." },
        { status: 400 }
      );
    }

    const customCreds = apiKey
      ? {
          apiKey,
          senderEmail: senderEmail || undefined,
          senderName: senderName || undefined,
        }
      : undefined;

    const result: BrevoSendResult = await sendBrevoEmail({
      toEmail: testRecipientEmail,
      recipientName: "Administrator",
      propertyId: "verify-test",
      propertyName,
      type: "TEST_PING",
      customCredentials: customCreds,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to verify Brevo credentials.",
          mode: result.mode,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully dispatched to ${testRecipientEmail}!`,
      messageId: result.messageId,
      mode: result.mode,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error verifying Brevo gateway." },
      { status: 500 }
    );
  }
}
