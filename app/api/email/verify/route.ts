import { NextRequest, NextResponse } from "next/server";
import { sendSESEmail, SESSendResult } from "@/lib/sesService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      apiKey,
      accessKeyId,
      secretAccessKey,
      region,
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

    const customCreds = (accessKeyId && secretAccessKey) || apiKey
      ? {
          apiKey,
          accessKeyId,
          secretAccessKey,
          region,
          senderEmail: senderEmail || undefined,
          senderName: senderName || undefined,
        }
      : undefined;

    const result: SESSendResult = await sendSESEmail({
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
          error: result.error || "Failed to verify email credentials.",
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
      { error: err.message || "Internal server error verifying email gateway." },
      { status: 500 }
    );
  }
}
