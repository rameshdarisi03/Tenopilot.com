import { NextRequest, NextResponse } from "next/server";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Occupant } from "@/constants/mockOccupants";
import { verifyResidentForComplaint } from "@/utils/domainSSOT";

// In-memory property occupant cache for high-speed verification (60s TTL)
interface CacheEntry {
  occupants: Occupant[];
  timestamp: number;
}
const propertyOccupantsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId")?.trim();
    const rawPhone = searchParams.get("phone")?.trim();

    if (!propertyId) {
      return NextResponse.json(
        { success: false, errorMessage: "Missing propertyId parameter." },
        { status: 400 }
      );
    }

    if (!rawPhone) {
      return NextResponse.json(
        { success: false, errorMessage: "Missing phone parameter." },
        { status: 400 }
      );
    }

    const cleanDigits = rawPhone.replace(/\D/g, "").slice(-10);
    if (cleanDigits.length < 10) {
      return NextResponse.json(
        {
          success: true,
          isValid: false,
          status: "NOT_FOUND",
          errorMessage: "Please provide a valid 10-digit mobile number.",
        },
        { status: 200 }
      );
    }

    // Check memory cache
    const now = Date.now();
    let cached = propertyOccupantsCache.get(propertyId);
    let occupants: Occupant[] = [];

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      occupants = cached.occupants;
    } else {
      const snap = await getDocs(collection(db, "properties", propertyId, "occupants"));
      occupants = snap.docs.map((d) => d.data() as Occupant);
      propertyOccupantsCache.set(propertyId, {
        occupants,
        timestamp: now,
      });
    }

    // SSOT Domain Verification
    const res = verifyResidentForComplaint(cleanDigits, occupants);

    if (res.isValid && res.occupant) {
      // Return safe, sanitized resident details needed for complaint logging
      return NextResponse.json({
        success: true,
        isValid: true,
        status: "VALID",
        occupant: {
          id: res.occupant.id,
          name: res.occupant.name,
          phone: res.occupant.phone,
          roomNumber: res.occupant.roomNumber,
          bedCode: res.occupant.bedCode || "Bed A",
          stayType: res.occupant.stayType || "Monthly",
          lifecycleStatus: res.occupant.lifecycleStatus || "Active",
        },
      });
    }

    return NextResponse.json({
      success: true,
      isValid: false,
      status: res.status,
      errorMessage: res.errorMessage,
    });
  } catch (err) {
    console.error("Error in /api/complaints/verify-resident:", err);
    return NextResponse.json(
      {
        success: false,
        isValid: false,
        status: "NOT_FOUND",
        errorMessage: "Failed to verify resident record. Please try again.",
      },
      { status: 500 }
    );
  }
}
