import { chromium } from "playwright";

async function debugGuest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "hifawoh279@playboot.com");
  await page.fill('input[type="password"]', "def12345");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/home");

  // Get last property
  const lastProp = page.locator('a:has-text("View Dashboard")').last();
  const href = await lastProp.getAttribute("href");
  const propertyId = href.split("/")[2];
  console.log("Property ID:", propertyId);

  // Navigate to onboard-guest
  await page.goto(`http://localhost:3000/p/${propertyId}/tenants/onboard-guest`);
  await page.waitForTimeout(1000);

  // Fill Step 1
  await page.fill('input[placeholder*="Rohan Verma"]', "Ramesh Darisi");
  await page.fill('input[placeholder="9876543210"]', "9866600001");
  await page.fill('input[placeholder*="Parent"]', "9899900001");
  
  await page.click('button:has-text("Proceed to Bed Allocation")');
  await page.waitForTimeout(2000);

  console.log("=== Page HTML after clicking Proceed to Bed Allocation ===");
  const step2Text = await page.innerText("body");
  console.log(step2Text);

  await browser.close();
}

debugGuest();
