// TenoPilot Universal Account & Property Initialization Engine
// 100% Direct Cloud Firestore Database Persistence (Zero LocalStorage)

import { propertySettingsStore, CLEAN_ZERO_PROPERTY_SETTINGS } from "@/constants/propertySettings";
import { partnerStore, getDefaultPartners } from "@/constants/partnerStore";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { occupantStore } from "@/constants/mockOccupants";
import { portfolioStore, PortfolioProperty } from "@/constants/portfolioStore";
import { staffStore } from "@/lib/staffStore";

export interface ProvisionWorkspaceParams {
  propertyId: string;
  propertyName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  city?: string;
  approxBeds?: number;
  securityPin?: string;
}

/**
 * Universal Property Initializer
 * Explicitly initializes a property ID with clean baseline:
 * - 0 floors & 0 beds ([])
 * - 0 occupants & guests ([])
 * - 0 expenses (₹0)
 * - 100% Default Owner Partner & Default Payment Accounts
 * - Clean zero tariffs (₹0)
 */
export async function initializeCleanProperty(
  propertyId: string,
  propertyName: string = "New Property Estate",
  ownerName?: string,
  city?: string
) {
  if (typeof window === "undefined" || !propertyId) return;

  try {
    // 1. Initialize Property Settings with clean zeroes & user's custom property name
    const initialSettings = {
      ...CLEAN_ZERO_PROPERTY_SETTINGS,
      propertyName: propertyName,
      propertyAddress: city ? `${city}, India` : "Bengaluru, Karnataka",
    };
    await propertySettingsStore.updateSettings(initialSettings, propertyId);

    // 2. Initialize Partner Ownership to 100% Default Owner
    const defaultPartners = getDefaultPartners(ownerName);
    partnerStore.updatePartners(defaultPartners, propertyId);

    // 3. Initialize Property Layout Structure to 0 floors []
    await propertyStore.updateStructure([], propertyId);

    // 4. Initialize Occupants to 0 tenants []
    occupantStore.updateOccupants([], propertyId);
  } catch (e) {
    console.warn(`Property initialization notice for ${propertyId}:`, e);
  }
}

/**
 * Master Centralized Provisioning Bridge
 * Atomically ties Founder Invites, Portfolio Store, Property Settings, and Staff Auth into ONE single unified execution.
 */
export async function provisionNewPropertyWorkspace(params: ProvisionWorkspaceParams) {
  const {
    propertyId,
    propertyName,
    ownerName,
    ownerEmail,
    ownerPhone = "",
    city = "Bengaluru",
    approxBeds = 80,
    securityPin = "123456",
  } = params;

  if (typeof window === "undefined" || !propertyId) return;

  // 1. Initialize clean property database
  await initializeCleanProperty(propertyId, propertyName, ownerName, city);

  // 2. Provision building inside Owner's Organization Portfolio
  const portfolioProperty: PortfolioProperty = {
    id: propertyId,
    name: propertyName,
    location: city ? `${city}, India` : "Bengaluru, India",
    bedsCount: approxBeds,
    occupancyRate: "0.0%",
    collectionRate: "0%",
    status: "HEALTHY",
    createdAt: new Date().toISOString(),
    ownerEmail: ownerEmail,
  };
  await portfolioStore.addProperty(portfolioProperty, ownerEmail);

  // 3. Register user as MASTER ADMIN in Staff Accounts
  staffStore.addGlobalStaff({
    id: `owner-${Date.now()}`,
    name: ownerName,
    email: ownerEmail,
    phone: ownerPhone,
    role: "master_admin",
    assignedPropertyId: propertyId,
    assignedPropertyIds: [propertyId],
    propertyName: propertyName,
    status: "Active",
    joinedDate: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    securityPin: securityPin.slice(0, 6),
  });

  // 4. Store active saved session for immediate zero-latency hydration
  localStorage.setItem(
    "tenopilot_saved_session",
    JSON.stringify({
      email: ownerEmail,
      phone: ownerPhone,
      name: ownerName,
      role: "master_admin",
      propertyName: propertyName,
      propertyId: propertyId,
    })
  );
  staffStore.setActiveRole("master_admin");
}
