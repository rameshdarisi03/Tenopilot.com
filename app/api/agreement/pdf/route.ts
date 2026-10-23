import { NextRequest, NextResponse } from "next/server";
import { generateRentalAgreementPdfBuffer, RentalAgreementPdfData } from "@/lib/pdfGenerator";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantName = searchParams.get("tenantName") || "Resident";
    const phone = searchParams.get("phone") || "N/A";
    const roomNumber = searchParams.get("roomNumber") || "N/A";
    const bedCode = searchParams.get("bedCode") || "Standard Bed";
    const joiningDate = searchParams.get("joiningDate") || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const monthlyRent = Number(searchParams.get("monthlyRent") || searchParams.get("rentAmount") || searchParams.get("amount") || 0);
    const securityDeposit = Number(searchParams.get("securityDeposit") || searchParams.get("depositAmount") || 0);
    const propertyTitle = searchParams.get("propertyName") || searchParams.get("propertyTitle") || "TenoPilot Coliving";
    const propertyAddress = searchParams.get("propertyAddress") || "";
    const houseRulesAndRegulations = searchParams.get("houseRules") || "";
    const billingCycle = searchParams.get("billingCycle") || undefined;
    const ownerName = searchParams.get("ownerName") || undefined;

    const pdfData: RentalAgreementPdfData = {
      tenantName,
      phone,
      roomNumber,
      bedCode,
      joiningDate,
      monthlyRent,
      securityDeposit,
      propertyTitle,
      propertyAddress,
      houseRulesAndRegulations,
      billingCycle,
      ownerName,
    };

    const pdfBuffer = await generateRentalAgreementPdfBuffer(pdfData);

    const safeFilename = `Rental_Agreement_${tenantName.replace(/[^a-zA-Z0-9_-]/g, "_")}_${roomNumber}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("Error generating rental agreement PDF:", error);
    return NextResponse.json({ error: "Failed to generate rental agreement PDF", details: error.message }, { status: 500 });
  }
}
