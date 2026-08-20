import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "TenoPilot.com — Precision Rental Operating System for PGs & Hostels";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1b1512 0%, #2e1e17 50%, #1b1512 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 80px",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Glow accent */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "450px",
            height: "450px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(194, 101, 42, 0.35) 0%, rgba(194, 101, 42, 0) 70%)",
          }}
        />

        {/* Brand Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            backgroundColor: "rgba(255, 248, 246, 0.12)",
            border: "1px solid rgba(215, 194, 185, 0.3)",
            borderRadius: "9999px",
            padding: "8px 24px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#34d399",
            }}
          />
          <span
            style={{
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "#f8ede3",
              textTransform: "uppercase",
            }}
          >
            Precision Rental OS
          </span>
        </div>

        {/* Logo & Headline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              backgroundColor: "#c2652a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "34px",
              fontWeight: 800,
              fontFamily: "Georgia, serif",
            }}
          >
            T
          </div>
          <span
            style={{
              fontSize: "52px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            TenoPilot<span style={{ color: "#c2652a" }}>.com</span>
          </span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "26px",
            color: "#d7c2b9",
            textAlign: "center",
            maxWidth: "920px",
            lineHeight: 1.4,
            margin: "0 0 36px 0",
            fontWeight: 500,
          }}
        >
          Automated Room Allocation • WhatsApp Rent Invoicing • Partner Settlement Engine • 24/7 Complaints Desk
        </p>

        {/* Feature Pills */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              padding: "10px 20px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#ffffff",
            }}
          >
            🏢 PGs & Hostels
          </div>
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              padding: "10px 20px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#ffffff",
            }}
          >
            ⚡ Date-Aware Allocation
          </div>
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              padding: "10px 20px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#ffffff",
            }}
          >
            💰 ₹999/mo • 10-Day Free Trial
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
