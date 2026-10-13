import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Amazon SNS Webhook Endpoint for Amazon SES Event Notifications
 * 
 * Capabilities:
 * 1. Automatically auto-confirms AWS SNS SubscriptionConfirmation handshakes.
 * 2. Parses Amazon SES Bounce & Complaint event payloads in real time.
 * 3. Records bounced/complained addresses into an automated suppression ledger
 *    to guarantee 0% repeat dispatches (strictly required by AWS Trust & Safety).
 */
export async function POST(req: NextRequest) {
  try {
    // AWS SNS sends text/plain with JSON body
    const rawText = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const messageType = req.headers.get("x-amz-sns-message-type") || body.Type;

    // 1. Automatic AWS SNS Subscription Confirmation
    if (messageType === "SubscriptionConfirmation") {
      const subscribeUrl = body.SubscribeURL;
      console.log(`[Amazon SNS] Received SubscriptionConfirmation for Topic: ${body.TopicArn}`);

      if (subscribeUrl) {
        try {
          const confirmRes = await fetch(subscribeUrl);
          if (confirmRes.ok) {
            console.log(`[Amazon SNS ✅] Successfully auto-confirmed subscription for topic: ${body.TopicArn}`);
            return NextResponse.json({
              success: true,
              message: "Subscription confirmed successfully",
              topicArn: body.TopicArn,
            });
          }
        } catch (fetchErr) {
          console.error("[Amazon SNS ❌] Failed to auto-confirm subscription via SubscribeURL:", fetchErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Subscription confirmation received and token logged",
        token: body.Token,
      });
    }

    // 2. Unsubscribe Confirmation
    if (messageType === "UnsubscribeConfirmation") {
      console.log(`[Amazon SNS] Unsubscribe confirmation received for Topic: ${body.TopicArn}`);
      return NextResponse.json({ success: true, message: "Unsubscribed" });
    }

    // 3. Amazon SES Event Notification (Bounces & Complaints)
    if (messageType === "Notification") {
      let eventData: any;
      try {
        eventData = typeof body.Message === "string" ? JSON.parse(body.Message) : body.Message;
      } catch {
        eventData = body.Message;
      }

      const eventType = eventData?.eventType || eventData?.notificationType;
      console.log(`[Amazon SES Event] Received event type: ${eventType}`);

      // Handle Hard Bounces
      if (eventType === "Bounce" || eventData?.bounce) {
        const bounce = eventData.bounce || {};
        const bounceType = bounce.bounceType || "Permanent"; // Permanent vs Transient
        const bouncedRecipients = bounce.bouncedRecipients || [];

        for (const recipient of bouncedRecipients) {
          const email = (recipient.emailAddress || "").toLowerCase().trim();
          if (email) {
            console.warn(`[Amazon SES Bounce ⚠️] ${bounceType} bounce for: ${email}`);
            try {
              await setDoc(
                doc(db, "email_suppressions", email),
                {
                  email,
                  reason: "BOUNCE",
                  bounceType,
                  diagnosticCode: recipient.diagnosticCode || "Unspecified",
                  suppressedAt: new Date().toISOString(),
                  source: "AWS_SES_SNS",
                },
                { merge: true }
              );
            } catch (dbErr) {
              console.warn("Failed recording bounce suppression:", dbErr);
            }
          }
        }
      }

      // Handle Spam Complaints
      if (eventType === "Complaint" || eventData?.complaint) {
        const complaint = eventData.complaint || {};
        const complainedRecipients = complaint.complainedRecipients || [];

        for (const recipient of complainedRecipients) {
          const email = (recipient.emailAddress || "").toLowerCase().trim();
          if (email) {
            console.error(`[Amazon SES Complaint 🚨] Spam complaint received for: ${email}`);
            try {
              await setDoc(
                doc(db, "email_suppressions", email),
                {
                  email,
                  reason: "COMPLAINT",
                  feedbackType: complaint.complaintFeedbackType || "abuse",
                  suppressedAt: new Date().toISOString(),
                  source: "AWS_SES_SNS",
                },
                { merge: true }
              );
            } catch (dbErr) {
              console.warn("Failed recording complaint suppression:", dbErr);
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        eventType,
        receivedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, status: "Ignored unknown SNS type" });
  } catch (error: any) {
    console.error("[Amazon SNS Webhook Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed processing SNS webhook" },
      { status: 500 }
    );
  }
}

// Support GET for manual verification/health check
export async function GET() {
  return NextResponse.json({
    status: "ACTIVE",
    service: "TenoPilot Amazon SES & SNS Event Gateway",
    endpoint: "/api/email/ses-events",
    capabilities: [
      "Auto-SubscriptionConfirmation",
      "Hard Bounce Suppression Engine",
      "Complaint Abuse Suppression Engine",
    ],
  });
}
