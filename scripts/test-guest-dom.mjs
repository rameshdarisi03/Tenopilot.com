import { chromium } from "playwright";
import fs from "fs";

async function testGuestDom() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto("https://tenopilot-com.vercel.app/login");
  await page.fill('input[type="email"]', "hifawoh279@playboot.com");
  await page.fill('input[type="password"]', "def12345");
  await page.click('button:has-text("Log In to Dashboard")');
  await page.waitForURL("**/home");

  // Create property
  const addBtn = page.locator('button:has-text("Add First Building"), button:has-text("Add New Property"), button:has-text("Add Property")').first();
  await addBtn.click();
  const propName = `Test PG ${Date.now().toString().slice(-4)}`;
  await page.fill('input[placeholder*="Meridian"], input[placeholder*="Property Name"]', propName);
  await page.click('button:has-text("Onboard Building"), button[type="submit"]');
  await page.waitForTimeout(2000);

  const dashboardLink = page.locator('a:has-text("View Dashboard")').last();
  const href = await dashboardLink.getAttribute("href");
  const propertyId = href.split("/")[2];
  console.log("Created property:", propertyId);

  // Property setup: Add floor and rooms
  await page.goto(`https://tenopilot-com.vercel.app/p/${propertyId}/property-setup`);
  await page.waitForTimeout(1500);

  await page.click('button:has-text("Add Floor")');
  await page.fill('input[placeholder*="FLOOR"]', "FLOOR 01");
  await page.click('button:has-text("Create Floor")');
  await page.waitForTimeout(1500);

  await page.click('button:has-text("Add Room")');
  await page.fill('input[placeholder="601"]', "101");
  await page.fill('input[type="number"][min="1"]', "2");
  await page.click('button:has-text("Create Room")');
  await page.waitForTimeout(1500);

  // Now go to onboard-guest
  console.log("Navigating to onboard-guest...");
  await page.goto(`https://tenopilot-com.vercel.app/p/${propertyId}/tenants/onboard-guest`);
  await page.waitForTimeout(1500);

  // Fill Step 1
  await page.fill('input[placeholder*="Rohan Verma"]', "Ramesh Darisi");
  await page.fill('input[placeholder="9876543210"]', "9866600001");
  await page.fill('input[placeholder*="Parent"]', "9899900001");

  console.log("Clicking Proceed to Bed Allocation...");
  await page.click('button:has-text("Proceed to Bed Allocation")');
  await page.waitForTimeout(2000);

  const html = await page.innerHTML("body");
  fs.writeFileSync("scripts/guest-step2.html", html);
  console.log("Wrote HTML to scripts/guest-step2.html");

  const buttons = await page.$$eval("button", (btns) => btns.map((b) => b.innerText.replace(/\n/g, " | ")));
  console.log("Available Buttons on Step 2:", buttons);

  await browser.close();
}

testGuestDom().catch(console.error);
