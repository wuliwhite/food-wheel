import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runImporter() {
  const filePath = path.resolve(process.cwd(), "restaurants.xlsx");

  if (!fs.existsSync(filePath)) {
    console.error("\n❌ Could not find 'restaurants.xlsx' in the project root folder.");
    process.exit(1);
  }

  console.log("📖 Reading restaurants.xlsx...");
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);

  if (rows.length === 0) {
    console.warn("⚠️ The spreadsheet appears to be empty.");
    process.exit(0);
  }

  console.log(`Found ${rows.length} restaurant entries. Importing with 0 starting ratings...\n`);

  let count = 0;
  for (const row of rows) {
    // Normalize keys to lowercase so 'Name', 'Category', etc. become lowercase
    const normalizedRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalizedRow[key.trim().toLowerCase()] = value;
    }

    const rawName = String(normalizedRow["name"] || "").trim();
    if (!rawName) continue; // Skip if name is missing

    const cleanId = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `item-${Math.random().toString(36).substring(2, 8)}`;

    const price = normalizedRow["price range"] || normalizedRow["pricerange"] || "$$";
    const validPrice = ["$", "$$", "$$$", "$$$$"].includes(price) ? price : "$$";

    const restaurantPayload = {
      name: rawName,
      category: String(normalizedRow["category"] || "General").trim(),
      district: String(normalizedRow["district"] || "Hong Kong").trim(),
      address: String(normalizedRow["address"] || "").trim(),
      priceRange: validPrice,
      openingHours: String(normalizedRow["opening hours"] || normalizedRow["openinghours"] || "11:00 - 22:00").trim(),
      ratingSum: 0,
      ratingCount: 0,
      averageRating: 0,
    };

    await setDoc(doc(db, "restaurants", cleanId), restaurantPayload, { merge: true });
    count++;
    console.log(`[${count}/${rows.length}] ✓ Added: ${restaurantPayload.name}`);
  }

  console.log(`\n🎉 Success! Added ${count} unrated restaurants to Firestore.`);
  process.exit(0);
}

runImporter().catch((err) => {
  console.error("Fatal error during import:", err);
  process.exit(1);
});