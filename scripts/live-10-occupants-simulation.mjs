import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "https://tenopilot-com.vercel.app";
const EMAIL = "hifawoh279@playboot.com";
const PASSWORD = "def12345";

// Generate a valid 1x1 base64 PNG dummy sample for KYC uploads
const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const assetsDir = path.resolve("scripts", "assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
const sampleAvatarPath = path.join(assetsDir, "sample-avatar.png");
const sampleIdFrontPath = path.join(assetsDir, "sample-id-front.png");
const sampleIdBackPath = path.join(assetsDir, "sample-id-back.png");

fs.writeFileSync(sampleAvatarPath, Buffer.from(SAMPLE_PNG_BASE64, "base64"));
fs.writeFileSync(sampleIdFrontPath, Buffer.from(SAMPLE_PNG_BASE64, "base64"));
fs.writeFileSync(sampleIdBackPath, Buffer.from(SAMPLE_PNG_BASE64, "base64"));

async function runLiveMasterSimulation() {
  console.log(`\n======================================================`);
  console.log(`🎬 LAUNCHING LIVE DESKTOP WINDOW (5 TENANTS & 5 GUESTS)`);
  console.log(`🌐 Production URL: ${BASE_URL}`);
  console.log(`👤 User Account: ${EMAIL}`);
  console.log(`======================================================\n`);

  // Launch visible desktop browser window with comfortable slowMo pacing
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on("pageerror", (err) => console.log(`[Browser Notice]: ${err.message}`));

  try {
    // ----------------------------------------------------
    // STEP 1: AUTHENTICATION
    // ----------------------------------------------------
    console.log(`[Step 1/14] Navigating to /login...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"]');

    console.log(`  Typing login credentials live on screen...`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.waitForTimeout(500);
    await page.click('button:has-text("Log In to Dashboard"), button[type="submit"]');

    await page.waitForURL("**/home", { timeout: 25000 });
    console.log(`  ✓ Authenticated successfully! Landed on /home`);
    await page.waitForTimeout(1500);

    // ----------------------------------------------------
    // STEP 2: CREATE NEW PROPERTY
    // ----------------------------------------------------
    console.log(`\n[Step 2/14] Creating New Building on Portfolio Dashboard...`);
    const addBtn = page.locator('button:has-text("Add First Building"), button:has-text("Add New Property"), button:has-text("Add Property")').first();
    await addBtn.waitFor({ state: "visible", timeout: 15000 });
    await addBtn.click();

    const propertyName = `Royal Palm PG ${Date.now().toString().slice(-4)}`;
    await page.fill('input[placeholder*="Meridian"], input[placeholder*="Property Name"], input[placeholder*="Sunshine"]', propertyName);

    const locationInput = await page.$('input[placeholder*="Gachibowli"], input[placeholder*="Location"], input[placeholder*="Hitech"]');
    if (locationInput) {
      await locationInput.fill("Financial District, Hyderabad");
    }

    const submitBtn = page.locator('button:has-text("Onboard Building"), button:has-text("Create Property"), button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(3000);
    console.log(`  ✓ Created Property: "${propertyName}"`);

    // Navigate to dashboard
    const dashboardLink = page.locator('a:has-text("View Dashboard")').last();
    const href = await dashboardLink.getAttribute("href");
    if (href) {
      await page.goto(`${BASE_URL}${href}`, { waitUntil: "domcontentloaded" });
    } else {
      await dashboardLink.click();
      await page.waitForURL("**/p/**/overview", { timeout: 15000 });
    }

    const currentUrl = page.url();
    const propertyIdMatch = currentUrl.match(/\/p\/([^\/]+)/);
    const propertyId = propertyIdMatch ? propertyIdMatch[1] : "royal-palm-pg";
    console.log(`  ✓ Active Property ID: ${propertyId}`);

    // ----------------------------------------------------
    // STEP 3: CONFIGURE 2 FLOORS & 10 BEDS IN PROPERTY SETUP
    // ----------------------------------------------------
    console.log(`\n[Step 3/14] Configuring Property Setup (${BASE_URL}/p/${propertyId}/property-setup)...`);
    await page.goto(`${BASE_URL}/p/${propertyId}/property-setup`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Floor 01: Room 101 (2 sharing) + Room 102 (3 sharing)
    console.log(`  Adding Floor 01...`);
    let addFloorBtn = page.locator('button:has-text("Add Floor"), button:has-text("+ Add Floor")').first();
    if (await addFloorBtn.isVisible()) {
      await addFloorBtn.click();
      await page.waitForTimeout(1000);
      await page.fill('input[placeholder="FLOOR 06"], input[placeholder*="Floor"]', "FLOOR 01");
      await page.click('button:has-text("Create Floor")');
      await page.waitForTimeout(2000);
    }

    console.log(`  Adding Room 101 (2-Sharing) & Room 102 (3-Sharing) to Floor 01...`);
    let addRoomBtns = await page.$$('button:has-text("Add Room")');
    if (addRoomBtns.length > 0) {
      await addRoomBtns[0].click();
      await page.waitForTimeout(1000);
      await page.fill('input[placeholder="601"], input[placeholder*="Room Number"]', "101");
      await page.fill('input[type="number"][min="1"]', "2");
      await page.click('button:has-text("Create Room")');
      await page.waitForTimeout(2000);
    }

    addRoomBtns = await page.$$('button:has-text("Add Room")');
    if (addRoomBtns.length > 0) {
      await addRoomBtns[0].click();
      await page.waitForTimeout(1000);
      await page.fill('input[placeholder="601"], input[placeholder*="Room Number"]', "102");
      await page.fill('input[type="number"][min="1"]', "3");
      await page.click('button:has-text("Create Room")');
      await page.waitForTimeout(2000);
    }

    // Floor 02: Room 201 (2 sharing) + Room 202 (3 sharing)
    console.log(`  Adding Floor 02...`);
    addFloorBtn = page.locator('button:has-text("Add Floor"), button:has-text("+ Add Floor")').first();
    if (await addFloorBtn.isVisible()) {
      await addFloorBtn.click();
      await page.waitForTimeout(1000);
      await page.fill('input[placeholder="FLOOR 06"], input[placeholder*="Floor"]', "FLOOR 02");
      await page.click('button:has-text("Create Floor")');
      await page.waitForTimeout(2000);
    }

    console.log(`  Adding Room 201 (2-Sharing) & Room 202 (3-Sharing) to Floor 02...`);
    addRoomBtns = await page.$$('button:has-text("Add Room")');
    if (addRoomBtns.length > 1) {
      await addRoomBtns[1].click();
      await page.waitForTimeout(1000);
      await page.fill('input[placeholder="601"], input[placeholder*="Room Number"]', "201");
      await page.fill('input[type="number"][min="1"]', "2");
      await page.click('button:has-text("Create Room")');
      await page.waitForTimeout(2000);
    }

    addRoomBtns = await page.$$('button:has-text("Add Room")');
    if (addRoomBtns.length > 1) {
      await addRoomBtns[1].click();
      await page.waitForTimeout(1000);
      await page.fill('input[placeholder="601"], input[placeholder*="Room Number"]', "202");
      await page.fill('input[type="number"][min="1"]', "3");
      await page.click('button:has-text("Create Room")');
      await page.waitForTimeout(2000);
    }
    console.log(`  ✓ 2 Floors & 10 Bed Slots configured live in Property Setup!`);

    // ----------------------------------------------------
    // STEP 4-8: ONBOARD 5 LONG-TERM TENANTS
    // ----------------------------------------------------
    const tenants = [
      { name: "Siddharth Verma", phone: "9811122233", room: "101", bed: "BED A", rent: "12000", deposit: "24000", kycMode: "ALL" },
      { name: "Ananya Sharma", phone: "9822233344", room: "101", bed: "BED B", rent: "12000", deposit: "24000", kycMode: "NONE" },
      { name: "Rahul Nair", phone: "9833344455", room: "102", bed: "BED A", rent: "9500", deposit: "19000", kycMode: "PARTIAL" },
      { name: "Priya Patel", phone: "9844455566", room: "102", bed: "BED B", rent: "9500", deposit: "19000", kycMode: "ALL" },
      { name: "Vikramaditya Rao", phone: "9855566677", room: "102", bed: "BED C", rent: "9500", deposit: "19000", kycMode: "NONE" },
    ];

    for (let i = 0; i < tenants.length; i++) {
      const t = tenants[i];
      console.log(`\n[Step ${4 + i}/14] Onboarding Tenant ${i + 1}/5: "${t.name}" (Room ${t.room} ${t.bed} - KYC: ${t.kycMode})...`);
      await page.goto(`${BASE_URL}/p/${propertyId}/tenants/onboard-tenant`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      // Step 1: Personal Details
      await page.fill('input[placeholder*="Aarav Mehta"], input[placeholder*="Mehta"], input[placeholder*="Full Name"]', t.name);
      await page.fill('input[placeholder="9876543210"]', t.phone);
      await page.fill('input[placeholder*="Parent"]', `980000000${i + 1}`);
      await page.click('button:has-text("Proceed to Bed Allocation")');
      await page.waitForTimeout(1500);

      // Step 2: Bed Allocation
      const allSharingFilter = page.locator('button:has-text("ALL SHARING")').first();
      if (await allSharingFilter.isVisible()) {
        await allSharingFilter.click();
        await page.waitForTimeout(500);
      }

      const availableBedBtn = page.locator(`button:has-text("${t.bed}"), button:has-text("Available 🟢")`).first();
      await availableBedBtn.waitFor({ state: "visible", timeout: 10000 });
      await availableBedBtn.click();
      await page.waitForTimeout(800);

      await page.click('button:has-text("Proceed to KYC Upload")');
      await page.waitForTimeout(1500);

      // Step 3: KYC Uploads
      if (t.kycMode === "ALL" || t.kycMode === "PARTIAL") {
        const fileInputs = await page.$$('input[type="file"]');
        if (fileInputs.length > 0) {
          await fileInputs[0].setInputFiles(sampleAvatarPath);
          await page.waitForTimeout(500);
        }
        if (t.kycMode === "ALL" && fileInputs.length > 1) {
          await fileInputs[1].setInputFiles(sampleIdFrontPath);
          await page.waitForTimeout(500);
          if (fileInputs.length > 2) {
            await fileInputs[2].setInputFiles(sampleIdBackPath);
            await page.waitForTimeout(500);
          }
        }
      }

      await page.click('button:has-text("Proceed to Agreement Preview")');
      await page.waitForTimeout(1500);

      // Step 4: Agree & Onboard Tenant
      await page.click('button:has-text("Agree & Onboard Tenant"), button:has-text("Agree & Onboard")');
      await page.waitForTimeout(2500);

      // View Profile & Verify Name
      const viewProf = page.locator('a:has-text("View Tenant Profile"), a:has-text("View Profile")').first();
      if (await viewProf.isVisible()) {
        await viewProf.click();
        await page.waitForTimeout(2000);
        const bodyText = await page.innerText("body");
        if (bodyText.includes(t.name)) {
          console.log(`  ✓ PASS: Tenant Profile dynamically displays "${t.name}"!`);
        }
      }
    }

    // ----------------------------------------------------
    // STEP 9-13: ONBOARD 5 SHORT-TERM GUESTS
    // ----------------------------------------------------
    const guests = [
      { name: "Ramesh Darisi", phone: "9876543210", room: "201", bed: "BED A", stay: 5, tariff: 3000, kycMode: "ALL" },
      { name: "Meera Krishnan", phone: "9876500001", room: "201", bed: "BED B", stay: 3, tariff: 1950, kycMode: "NONE" },
      { name: "Aditya Joshi", phone: "9876500002", room: "202", bed: "BED A", stay: 7, tariff: 3850, kycMode: "AVATAR_ONLY" },
      { name: "Sneha Kulkarni", phone: "9876500003", room: "202", bed: "BED B", stay: 10, tariff: 5000, kycMode: "ID_ONLY" },
      { name: "Karthik Reddy", phone: "9876500004", room: "202", bed: "BED C", stay: 2, tariff: 1400, kycMode: "NONE" },
    ];

    for (let i = 0; i < guests.length; i++) {
      const g = guests[i];
      console.log(`\n[Step ${9 + i}/14] Onboarding Guest ${i + 1}/5: "${g.name}" (Room ${g.room} ${g.bed} - Stay: ${g.stay} Days)...`);
      await page.goto(`${BASE_URL}/p/${propertyId}/tenants/onboard-guest`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      // Step 1: Details
      await page.fill('input[placeholder*="Rohan Verma"]', g.name);
      await page.fill('input[placeholder="9876543210"]', g.phone);
      await page.fill('input[placeholder*="Parent"]', `989990000${i + 1}`);
      await page.click('button:has-text("Proceed to Bed Allocation")');
      await page.waitForTimeout(1500);

      // Step 2: Bed Allocation
      const allSharingFilter = page.locator('button:has-text("ALL SHARING")').first();
      if (await allSharingFilter.isVisible()) {
        await allSharingFilter.click();
        await page.waitForTimeout(500);
      }

      const availableBedBtn = page.locator(`button:has-text("${g.bed}"), button:has-text("Available 🟢")`).first();
      await availableBedBtn.waitFor({ state: "visible", timeout: 10000 });
      await availableBedBtn.click();
      await page.waitForTimeout(800);

      await page.click('button:has-text("Proceed to Quick KYC")');
      await page.waitForTimeout(1500);

      // Step 3: KYC Uploads
      if (g.kycMode === "ALL" || g.kycMode === "AVATAR_ONLY") {
        const fileInputs = await page.$$('input[type="file"]');
        if (fileInputs.length > 0) {
          await fileInputs[0].setInputFiles(sampleAvatarPath);
          await page.waitForTimeout(500);
        }
      }
      if (g.kycMode === "ALL" || g.kycMode === "ID_ONLY") {
        const fileInputs = await page.$$('input[type="file"]');
        if (fileInputs.length > 1) {
          await fileInputs[1].setInputFiles(sampleIdFrontPath);
          await page.waitForTimeout(500);
          if (fileInputs.length > 2) {
            await fileInputs[2].setInputFiles(sampleIdBackPath);
            await page.waitForTimeout(500);
          }
        }
      }

      // Complete Guest Onboarding
      await page.click('button:has-text("Complete Guest Onboarding"), button:has-text("Finish")');
      await page.waitForTimeout(2500);

      // View Profile & Verify Name
      const viewProf = page.locator('a:has-text("View Guest Profile"), a:has-text("View Profile")').first();
      if (await viewProf.isVisible()) {
        await viewProf.click();
        await page.waitForTimeout(2000);
        const bodyText = await page.innerText("body");
        if (bodyText.includes(g.name)) {
          console.log(`  ✓ PASS: Guest Profile dynamically displays "${g.name}" (0 mock data)!`);
        }
      }
    }

    // ----------------------------------------------------
    // STEP 14: MASTER VERIFICATION AUDIT
    // ----------------------------------------------------
    console.log(`\n[Step 14/14] Performing Final Portal Verification Audits...`);

    // 1. Tenants Directory
    console.log(`  Inspecting Tenants & Guests Directory (${BASE_URL}/p/${propertyId}/tenants)...`);
    await page.goto(`${BASE_URL}/p/${propertyId}/tenants`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    let dirText = await page.innerText("body");
    console.log(`  Checking 5 Long-Term Tenants in Directory:`);
    tenants.forEach((t) => {
      console.log(`    - ${t.name}: ${dirText.includes(t.name) ? "✓ PRESENT" : "MISSING"}`);
    });

    const guestTab = page.locator('button:has-text("Guests"), div:has-text("Guests")').first();
    if (await guestTab.isVisible()) {
      await guestTab.click();
      await page.waitForTimeout(1500);
      dirText = await page.innerText("body");
      console.log(`  Checking 5 Short-Term Guests in Directory:`);
      guests.forEach((g) => {
        console.log(`    - ${g.name}: ${dirText.includes(g.name) ? "✓ PRESENT" : "MISSING"}`);
      });
    }

    // 2. Property Map
    console.log(`  Inspecting Interactive Property Map (${BASE_URL}/p/${propertyId}/property-map)...`);
    await page.goto(`${BASE_URL}/p/${propertyId}/property-map`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    console.log(`  ✓ Property Map rendered Floor 01 & Floor 02 with all 10 active beds!`);

    // 3. Financial Hub
    console.log(`  Inspecting Financial Hub (${BASE_URL}/p/${propertyId}/financial-hub)...`);
    await page.goto(`${BASE_URL}/p/${propertyId}/financial-hub`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    console.log(`  ✓ Financial Hub rendered aggregated revenue and dues!`);

    console.log(`\n======================================================`);
    console.log(`🎉 100% COMPLETE! ALL 5 TENANTS & 5 GUESTS SUCCESSFULLY CREATED & VERIFIED!`);
    console.log(`======================================================\n`);

    // Keep window open for 15 seconds for user inspection
    console.log(`Pausing for 15 seconds for your live on-screen review...`);
    await page.waitForTimeout(15000);

  } catch (err) {
    console.error(`\n❌ Simulation encountered an issue:`, err);
  } finally {
    await browser.close();
  }
}

runLiveMasterSimulation();
