import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("pageerror", (e) => console.log("[Browser Error]:", e.message));

  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "hifawoh279@playboot.com");
  await page.fill('input[type="password"]', "def12345");
  await page.click('button:has-text("Log In to Dashboard")');
  await page.waitForURL("**/home");

  // Create Property
  const addBtn = page.locator('button:has-text("Add First Building"), button:has-text("Add New Property"), button:has-text("Add Property")').first();
  await addBtn.click();
  const rawId = Date.now().toString().slice(-4);
  const propName = `Debug PG ${rawId}`;
  const slugId = `debug-pg-${rawId}`;

  await page.fill('input[placeholder*="Meridian"], input[placeholder*="Property Name"]', propName);
  await page.click('button:has-text("Onboard Building"), button[type="submit"]');
  await page.waitForTimeout(2000);

  console.log("Property ID:", slugId);

  // Property Setup
  await page.goto(`http://localhost:3000/p/${slugId}/property-setup`);
  await page.waitForTimeout(1000);

  // Add Floor 01
  console.log("Adding Floor 01...");
  await page.click('button:has-text("Add New Floor"), button:has-text("Add Floor 1 Now")');
  await page.waitForTimeout(500);
  await page.fill('input[placeholder*="FLOOR"]', "FLOOR 01");
  await page.click('button:has-text("Create Floor")');
  await page.waitForTimeout(1200);

  // Add Room 101 to Floor 01
  console.log("Adding Room 101 to Floor 01...");
  let fl1AddRoom = page.locator('div', { has: page.locator('h2:has-text("FLOOR 01")') }).locator('button:has-text("Add Room")').first();
  await fl1AddRoom.click();
  await page.waitForTimeout(500);
  await page.fill('input[placeholder="601"]', "101");
  await page.fill('input[type="number"][min="1"]', "2");
  await page.click('button:has-text("Create Room")');
  await page.waitForTimeout(1200);

  // Add Room 102 to Floor 01
  console.log("Adding Room 102 to Floor 01...");
  fl1AddRoom = page.locator('div', { has: page.locator('h2:has-text("FLOOR 01")') }).locator('button:has-text("Add Room")').first();
  await fl1AddRoom.click();
  await page.waitForTimeout(500);
  await page.fill('input[placeholder="601"]', "102");
  await page.fill('input[type="number"][min="1"]', "3");
  await page.click('button:has-text("Create Room")');
  await page.waitForTimeout(1200);

  // Add Floor 02
  console.log("Adding Floor 02...");
  await page.click('button:has-text("Add New Floor")');
  await page.waitForTimeout(500);
  await page.fill('input[placeholder*="FLOOR"]', "FLOOR 02");
  await page.click('button:has-text("Create Floor")');
  await page.waitForTimeout(1200);

  // Add Room 201 to Floor 02
  console.log("Adding Room 201 to Floor 02...");
  let fl2AddRoom = page.locator('div', { has: page.locator('h2:has-text("FLOOR 02")') }).locator('button:has-text("Add Room")').first();
  await fl2AddRoom.click();
  await page.waitForTimeout(500);
  await page.fill('input[placeholder="601"]', "201");
  await page.fill('input[type="number"][min="1"]', "2");
  await page.click('button:has-text("Create Room")');
  await page.waitForTimeout(1200);

  // Add Room 202 to Floor 02
  console.log("Adding Room 202 to Floor 02...");
  fl2AddRoom = page.locator('div', { has: page.locator('h2:has-text("FLOOR 02")') }).locator('button:has-text("Add Room")').first();
  await fl2AddRoom.click();
  await page.waitForTimeout(500);
  await page.fill('input[placeholder="601"]', "202");
  await page.fill('input[type="number"][min="1"]', "3");
  await page.click('button:has-text("Create Room")');
  await page.waitForTimeout(1200);

  console.log("✓ Floor 01 & Floor 02 configured with 10 total beds!");

  // Onboard 5 Tenants into Floor 01
  const tenants = [
    { name: "Siddharth Verma", phone: "9811100001", bed: "BED A" },
    { name: "Ananya Sharma", phone: "9811100002", bed: "BED B" },
    { name: "Rahul Nair", phone: "9811100003", bed: "BED A" },
    { name: "Priya Patel", phone: "9811100004", bed: "BED B" },
    { name: "Vikramaditya Rao", phone: "9811100005", bed: "BED C" },
  ];

  for (let i = 0; i < tenants.length; i++) {
    const t = tenants[i];
    console.log(`Onboarding tenant ${i + 1}/5: ${t.name}...`);
    await page.goto(`http://localhost:3000/p/${slugId}/tenants/onboard-tenant`);
    await page.waitForTimeout(800);
    await page.fill('input[placeholder*="Aarav Mehta"], input[placeholder*="Mehta"], input[placeholder*="Full Name"]', t.name);
    await page.fill('input[placeholder="9876543210"]', t.phone);
    await page.fill('input[placeholder*="Parent"]', `980000000${i + 1}`);
    await page.click('button:has-text("Proceed to Bed Allocation")');
    await page.waitForTimeout(800);

    const allSharing = page.locator('button:has-text("ALL SHARING")').first();
    if (await allSharing.isVisible()) {
      await allSharing.click();
      await page.waitForTimeout(300);
    }
    const bedBtn = page.locator(`button:has-text("${t.bed}")`).first();
    await bedBtn.click();
    await page.click('button:has-text("Proceed to KYC Upload")');
    await page.waitForTimeout(400);
    await page.click('button:has-text("Proceed to Agreement Preview")');
    await page.waitForTimeout(400);
    await page.click('button:has-text("Agree & Onboard Tenant")');
    await page.waitForTimeout(1000);
    console.log(`  ✓ Tenant ${t.name} onboarded!`);
  }

  // Now Onboard 5 Guests into Floor 02
  const guests = [
    { name: "Ramesh Darisi", phone: "9866600001", bed: "BED A" },
    { name: "Meera Krishnan", phone: "9866600002", bed: "BED B" },
    { name: "Aditya Joshi", phone: "9866600003", bed: "BED A" },
    { name: "Sneha Kulkarni", phone: "9866600004", bed: "BED B" },
    { name: "Karthik Reddy", phone: "9866600005", bed: "BED C" },
  ];

  for (let i = 0; i < guests.length; i++) {
    const g = guests[i];
    console.log(`Onboarding guest ${i + 1}/5: ${g.name} (${g.bed})...`);
    await page.goto(`http://localhost:3000/p/${slugId}/tenants/onboard-guest`);
    await page.waitForTimeout(800);

    await page.fill('input[placeholder*="Rohan Verma"]', g.name);
    await page.fill('input[placeholder="9876543210"]', g.phone);
    await page.fill('input[placeholder*="Parent"]', `989990000${i + 1}`);
    await page.click('button:has-text("Proceed to Bed Allocation")');
    await page.waitForTimeout(800);

    const allSharing = page.locator('button:has-text("ALL SHARING")').first();
    if (await allSharing.isVisible()) {
      await allSharing.click();
      await page.waitForTimeout(300);
    }
    const bedBtn = page.locator(`button:has-text("${g.bed}")`).first();
    await bedBtn.click();
    await page.click('button:has-text("Proceed to Quick KYC")');
    await page.waitForTimeout(400);
    await page.click('button:has-text("Complete Guest Onboarding")');
    await page.waitForTimeout(1000);
    console.log(`  ✓ Guest ${g.name} onboarded!`);
  }

  console.log("\n🎉 ALL 5 TENANTS AND 5 GUESTS SUCCESSFULLY ONBOARDED!");

  await browser.close();
}

main().catch(console.error);
