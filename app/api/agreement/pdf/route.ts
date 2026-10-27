import { NextRequest, NextResponse } from "next/server";
import { generateRentalAgreementPdfBuffer, RentalAgreementPdfData } from "@/lib/pdfGenerator";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId") || "";
    const tenantName = searchParams.get("tenantName") || "Resident";
    const phone = searchParams.get("phone") || "N/A";
    const roomNumber = searchParams.get("roomNumber") || "N/A";
    const bedCode = searchParams.get("bedCode") || "Standard Bed";
    const joiningDate = searchParams.get("joiningDate") || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const monthlyRent = Number(searchParams.get("monthlyRent") || searchParams.get("rentAmount") || searchParams.get("amount") || 0);
    const securityDeposit = Number(searchParams.get("securityDeposit") || searchParams.get("depositAmount") || 0);
    let propertyTitle = searchParams.get("propertyName") || searchParams.get("propertyTitle") || "TenoPilot Coliving";
    let propertyAddress = searchParams.get("propertyAddress") || "";
    let houseRulesAndRegulations = searchParams.get("houseRules") || "";
    let billingCycle = searchParams.get("billingCycle") || undefined;
    let ownerName = searchParams.get("ownerName") || undefined;

    // If propertyId is provided and rules/ownerName are missing, fetch directly from Firestore settings
    if (propertyId && db && (!houseRulesAndRegulations || !ownerName || !billingCycle)) {
      try {
        let propDocId = propertyId;
        let cfgSnap = await getDoc(doc(db, "properties", propDocId, "settings", "config"));

        if (!cfgSnap.exists()) {
          const pQuery = query(collection(db, "properties"), where("propertyName", "==", propertyTitle));
          const pSnap = await getDocs(pQuery);
          if (!pSnap.empty) {
            propDocId = pSnap.docs[0].id;
            cfgSnap = await getDoc(doc(db, "properties", propDocId, "settings", "config"));
          }
        }

        if (cfgSnap.exists()) {
          const cfg = cfgSnap.data();
          if (!houseRulesAndRegulations && cfg.houseRulesAndRegulations) {
            houseRulesAndRegulations = cfg.houseRulesAndRegulations;
          }
          if (!ownerName && cfg.ownerName) {
            ownerName = cfg.ownerName;
          }
          if (!billingCycle && cfg.billingCycleDates) {
            billingCycle = cfg.billingCycleDates === "Anniversary Date"
              ? "Anniversary Date (Due on Move-in Date)"
              : `1st to End of Month (Due by ${cfg.desiredDueDate || 5}th)`;
          }
          if (!propertyAddress && cfg.propertyAddress) {
            propertyAddress = cfg.propertyAddress;
          }
          if (cfg.propertyName) {
            propertyTitle = cfg.propertyName;
          }
        }
      } catch (err) {
        console.warn("Notice: Fetching property config in agreement pdf route:", err);
      }
    }

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

    const isDownload = searchParams.get("download") === "true";
    const dispositionType = isDownload ? "attachment" : "inline";

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${safeFilename}"`,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("Error generating rental agreement PDF:", error);
    return NextResponse.json({ error: "Failed to generate rental agreement PDF", details: error.message }, { status: 500 });
  }
}
