// TenoPilot Universal Account & Property Initialization Engine
// 100% Direct Cloud Firestore Database Persistence (Zero LocalStorage)

import { propertySettingsStore, CLEAN_ZERO_PROPERTY_SETTINGS } from "@/constants/propertySettings";
import { partnerStore } from "@/constants/partnerStore";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { occupantStore } from "@/constants/mockOccupants";

/**
 * Universal Property Initializer
 * Explicitly initializes a property ID with 100% clean zeroes:
 * - 0 floors & 0 beds ([])
 * - 0 occupants & guests ([])
 * - 0 expenses (₹0)
 * - 0 partners & 0 accounts ([])
 * - Clean zero tariffs (₹0)
 */
export async function initializeCleanProperty(propertyId: string, propertyName: string = "New Property Estate") {
  if (typeof window === "undefined" || !propertyId) return;

  try {
    // 1. Initialize Property Settings with clean zeroes & user's custom property name
    const initialSettings = {
      ...CLEAN_ZERO_PROPERTY_SETTINGS,
      propertyName: propertyName,
    };
    await propertySettingsStore.updateSettings(initialSettings, propertyId);

    // 2. Initialize Partner Ownership & Payment Accounts to clean empty array []
    partnerStore.updatePartners([], propertyId);

    // 3. Initialize Property Layout Structure to 0 floors []
    await propertyStore.updateStructure([], propertyId);

    // 4. Initialize Occupants to 0 tenants []
    occupantStore.updateOccupants([], propertyId);
  } catch (e) {
    console.warn(`Property initialization notice for ${propertyId}:`, e);
  }
}
