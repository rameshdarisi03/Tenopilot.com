---
name: whatsapp-cloud-credit-gateway
description: >
  Complete architectural guide and implementation blueprint for integrating centralized
  Meta WhatsApp Business Cloud API with multi-tenant credit wallet management, automated
  transactional messaging (rent reminders, invoices, KYC invites), 1-tap bulk dispatches,
  and zero-config hybrid sandbox simulation. Use when adding WhatsApp messaging and
  credit monetization to any SaaS platform.
---

# Centralized WhatsApp Cloud API & Credit Wallet Gateway

A battle-tested skill and design pattern for embedding automated WhatsApp messaging and credit-based monetization into SaaS applications.

---

## 1. Architectural Model: Shared Platform Gateway (SaaS Pattern)

Instead of requiring individual tenants/clients to register developer accounts or buy phone numbers, the platform owns a **single verified Meta WhatsApp Business Cloud API account**.

```
[Tenant / Property Admin]
       │
       ▼ (1-Tap "Send Rent Reminders")
[SaaS Backend: /api/whatsapp/send]
       │
       ├──> 1. Check & Deduct Wallet Credit (e.g. 1 Credit / Message)
       ├──> 2. Render Dynamic Template with Property Branding & UPI Links
       │
       ▼
[Meta WhatsApp Cloud API: graph.facebook.com/v19.0/{PhoneID}/messages]
       │
       ▼
[Customer / Resident's WhatsApp]
```

---

## 2. Credit Wallet & Monetization Engine

### Unit Economics & Pricing Model
- **Meta Base Cost**: ~₹0.60 to ₹0.80 per utility/service conversation (India region).
- **Platform Selling Price**: ₹0.85 to ₹1.20 per credit.
- **Packages**:
  - **Starter**: 250 Credits @ ₹299 (₹1.20 / msg)
  - **Growth**: 750 Credits @ ₹749 (₹1.00 / msg)
  - **Enterprise**: 2,000 Credits @ ₹1,699 (₹0.85 / msg)

### Transaction Ledger Schema
```typescript
export interface WhatsAppCreditTransaction {
  id: string;
  type: "PURCHASE" | "USAGE" | "STARTER_BONUS";
  amount: number; // Positive for purchase, negative for usage
  balanceAfter: number;
  description: string;
  recipientPhone?: string;
  recipientName?: string;
  messageType?: "RENT_REMINDER" | "PAYMENT_RECEIPT" | "ONBOARDING_INVITE" | "COMPLAINT_UPDATE";
  timestamp: string;
  status: "DELIVERED" | "SENT" | "FAILED" | "PENDING";
}
```

---

## 3. Dynamic Template Engine

Always format messages with clear emojis, bold labels, dynamic amounts, and actionable links/VPA IDs:

```typescript
export function generateRentReminder(tenantName: string, propertyName: string, amount: number, dueDate: string, upiId: string, room: string) {
  return (
    `👋 *Hello ${tenantName}*,\n\n` +
    `Friendly rent payment reminder for *${propertyName}*:\n` +
    `🏠 *Room*: ${room}\n` +
    `💰 *Amount Due*: ₹${amount.toLocaleString("en-IN")}\n` +
    `📅 *Due Date*: ${dueDate}\n\n` +
    `💳 *Pay via UPI ID*: ${upiId}\n` +
    `👉 Tap to pay or visit the reception desk.\n\n` +
    `_Sent via TenoPilot Operating System._`
  );
}
```

---

## 4. Zero-Config Hybrid Dispatch Engine (Live + Simulator)

When developer credentials are missing or in staging, the system must seamlessly fall back to **Simulator Mode** without crashing:

```typescript
export async function sendWhatsAppMessage(payload: WhatsAppSendParams): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (token && phoneId) {
    // 1. Live Meta Cloud API Dispatch
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: payload.toPhone,
        type: "text",
        text: { preview_url: true, body: payload.messageText },
      }),
    });
    return await response.json();
  }

  // 2. Simulated Sandbox Dispatch (300ms realistic network latency)
  await new Promise((r) => setTimeout(r, 300));
  return {
    success: true,
    messageId: `sim-${Date.now()}`,
    mode: "SIMULATOR_SANDBOX",
    timestamp: new Date().toISOString(),
  };
}
```

---

## 5. Webhook Handshake & Inbound Auto-Bot

Meta requires a verification handshake endpoint (`GET`) with `hub.verify_token`:

```typescript
// Webhook Verification (GET)
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(params.get("hub.challenge"), { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}
```
