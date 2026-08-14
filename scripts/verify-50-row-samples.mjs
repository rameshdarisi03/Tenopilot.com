import fs from "fs";
import { parseRawSpreadsheetText } from "../lib/fastTrackHeuristicParser.js";

console.log("\n=======================================================");
console.log("🧪 TESTING 50-ROW FUZZY TEST SPREADSHEETS (100 TOTAL)");
console.log("=======================================================\n");

// Test Sheet 1
const sheet1Content = fs.readFileSync("public/samples/fuzzy_sample_pg_sheet_1.csv", "utf-8");
const res1 = parseRawSpreadsheetText(sheet1Content);
console.log("📄 Sheet 1 (Bengaluru Gents PG):");
console.log(`  - Total Rows Detected: ${res1.totalDetected} / 50`);
console.log(`  - Valid Rows: ${res1.validCount}`);
console.log(`  - Confidence: ${res1.confidenceScore}%`);
console.log(`  - Inferred Floors: ${res1.inferredFloors.join(", ")}`);
console.log(`  - Inferred Rooms: ${res1.inferredRooms.length} rooms`);

// Test Sheet 2
const sheet2Content = fs.readFileSync("public/samples/fuzzy_sample_pg_sheet_2.csv", "utf-8");
const res2 = parseRawSpreadsheetText(sheet2Content);
console.log("\n📄 Sheet 2 (Hyderabad Co-Living PG with Kholi No & Bhadha):");
console.log(`  - Total Rows Detected: ${res2.totalDetected} / 50`);
console.log(`  - Valid Rows: ${res2.validCount}`);
console.log(`  - Confidence: ${res2.confidenceScore}%`);
console.log(`  - Inferred Floors: ${res2.inferredFloors.join(", ")}`);
console.log(`  - Inferred Rooms: ${res2.inferredRooms.length} rooms`);

if (res1.totalDetected === 50 && res2.totalDetected === 50 && res1.validCount === 50 && res2.validCount === 50) {
  console.log("\n🎉 BOTH 50-ROW FUZZY DATASETS PARSED WITH 100% ACCURACY (100/100 ROWS VALID)!\n");
} else {
  console.log("\n⚠️ Some rows had warnings. Inspecting...");
}
