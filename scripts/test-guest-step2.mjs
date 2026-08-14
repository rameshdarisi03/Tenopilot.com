import { chromium } from "playwright";

async function testStep2() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Navigating to login...");
  await page.goto("https://tenopilot-com.vercel.app/login");
  await page.fill('input[type="email"]', "hifawoh279@playboot.com");
  await page.fill('input[type="password"]', "def12345");
  await page.click('button:has-text("Log In to Dashboard")');
  await page.waitForURL("**/home");
  console.log("Logged in!");

  // Find a property
  const propLink = page.locator('a:has-text("Manage Property"), a:has-text("View Dashboard")').first();
  const href = await propLink.getAttribute("href");
  const propertyId = href.split("/")[2];
  console.log("Using property:", propertyId);

  // Navigate to onboard-guest
  await page.goto(`https://tenopilot-com.vercel.app/p/${propertyId}/tenants/onboard-guest`);
  await page.waitForTimeout(1500);

  // Fill Step 1
  await page.fill('input[placeholder*="Rohan Verma"]', "Test Guest");
  await page.fill('input[placeholder="9876543210"]', "9899988877");
  await page.fill('input[placeholder*="Parent"]', "9899988866");
  await page.click('button:has-text("Proceed to Bed Allocation")');
  await page.waitForTimeout(1500);

  // Check Step 2
  const step2Heading = await page.locator('h2:has-text("Select Bed")').first().innerText();
  console.log("Step 2 Heading:", step2Heading);

  // Click ALL SHARING
  const allSharing = page.locator('button:has-text("ALL SHARING")').first();
  if (await allSharing.isVisible()) {
    await allSharing.click();
    await page.waitForTimeout(1000);
    console.log("Clicked ALL SHARING!");
  }

  // Count bed buttons
  const bedBtns = await page.$$('button:has-text("Available")');
  console.log("Found available bed buttons:", bedBtns.length);

  for (let i = 0; i < Math.min(bedBtns.length, 5); i++) {
    const txt = await bedBtns[i].innerText();
    console.log(`Bed button ${i + 1}:`, txt.replace(/\n/g, " | "));
  }

  await browser.close();
}

testStep2().catch(console.error);
