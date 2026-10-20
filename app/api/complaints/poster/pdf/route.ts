import { NextRequest, NextResponse } from "next/server";
import { generateComplaintsPosterPdf } from "@/lib/posterPdfGenerator";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId") || "prop-default";
    const propertyName = searchParams.get("propertyName") || "Your Property";
    
    // Construct public complaint portal URL
    const host = req.headers.get("host") || "www.tenopilot.com";
    const protocol = host.includes("localhost") ? "http" : "https";
    const portalUrl = `${protocol}://${host}/p/${propertyId}/public-complaint`;

    const pdfBuffer = await generateComplaintsPosterPdf({
      propertyId,
      propertyName,
      portalUrl,
    });

    const safeFilename = `${propertyName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Resident_Care_Poster_A4.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("GET /api/complaints/poster/pdf error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to generate poster PDF" },
      { status: 500 }
    );
  }
}
