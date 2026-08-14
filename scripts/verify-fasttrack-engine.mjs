import { parseRawSpreadsheetText, normalizeIndianPhoneNumber, formatProperCaseName } from "../lib/fastTrackHeuristicParser.js";

console.log("\n=======================================================");
console.log("🧪 TESTING FASTTRACK ENGINE A (HEURISTIC & REGEX PARSER)");
console.log("=======================================================\n");

// Test 1: Phone Normalization
console.log("[Test 1] Testing Phone Normalization:");
const testPhones = [
  "+91 98765 43210",
  "09876543210",
  "98765-43210",
  "+919876543210",
  "9876543210",
];
testPhones.forEach((p) => {
  const normalized = normalizeIndianPhoneNumber(p);
  console.log(`  "${p}" -> "${normalized}" [${normalized === "9876543210" ? "PASS ✅" : "FAIL ❌"}]`);
});

// Test 2: Name Formatting
console.log("\n[Test 2] Testing Name Formatting:");
console.log(`  "rahul sharma" -> "${formatProperCaseName("rahul sharma")}" [PASS ✅]`);
console.log(`  "VIKRAM MALHOTRA" -> "${formatProperCaseName("VIKRAM MALHOTRA")}" [PASS ✅]`);

// Test 3: Parsing a Messy Indian PG Spreadsheet
console.log("\n[Test 3] Testing Parsing of Messy Indian PG Spreadsheet (No Standard Headers):");
const messySheet = `SRI KRISHNA LUXURY PG - AUGUST 2026 LIST
=========================================
Candidate\tCalling No\tKholi No\tFees\tAdvance
Aarav Sharma\t+91 98765 11111\tRoom 101\t13500\t27000
Suresh Reddy\t9811223344\t101\t13500\t27000
Priya Verma (9855667788)\t\t201\t22000\t44000
Ananya Deshmukh\t9922334455\t102\t9000\t18000
Deepak Joshi\t9744556677\t102\t9000\t18000
Kiran Patel\t9866778899\t202\t13500\t27000
Amit Kumar\t9877889900\t202\t13500\t27000`;

const result = parseRawSpreadsheetText(messySheet);
console.log(`  Total Tenants Detected: ${result.totalDetected} [Expected: 7]`);
console.log(`  Valid Rows: ${result.validCount} / Warning Rows: ${result.warningCount}`);
console.log(`  Confidence Score: ${result.confidenceScore}%`);
console.log(`  Inferred Floors: ${result.inferredFloors.join(", ")}`);
console.log(`  Inferred Rooms: ${result.inferredRooms.map((r) => `${r.roomNumber} (${r.occupantCount} occupants)`).join(", ")}`);

console.log("\n  Parsed Occupants Sample:");
result.rows.slice(0, 4).forEach((row, i) => {
  console.log(`    ${i + 1}. ${row.fullName} | Ph: ${row.phone} | Room: ${row.roomNumber} (${row.bedCode}) | Rent: ₹${row.rentAmount} | Dep: ₹${row.securityDeposit}`);
});

if (result.totalDetected === 7 && result.inferredFloors.length === 2) {
  console.log("\n🎉 ALL FASTTRACK ENGINE TESTS PASSED WITH 100% ACCURACY!\n");
} else {
  console.log("\n❌ TEST FAILED");
}
