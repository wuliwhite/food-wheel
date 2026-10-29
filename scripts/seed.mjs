import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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

const HONG_KONG_RESTAURANTS = [
  {
    id: "yat-lok-roast-goose",
    name: "Yat Lok (一樂燒鵝)",
    category: "Siu Mei",
    district: "Central",
    address: "34-38 Stanley Street, Central",
    priceRange: "$$",
    openingHours: "10:00 - 20:30",
    ratingSum: 37,
    ratingCount: 8,
    averageRating: 4.6,
  },
  {
    id: "ichiran-tst",
    name: "Ichiran Ramen (一蘭)",
    category: "Japanese",
    district: "Tsim Sha Tsui",
    address: "8 Minden Ave, Tsim Sha Tsui",
    priceRange: "$$",
    openingHours: "10:00 - 23:00",
    ratingSum: 26,
    ratingCount: 6,
    averageRating: 4.3,
  },
  {
    id: "samsen-central",
    name: "Samsen (泰麵)",
    category: "Thai",
    district: "Central",
    address: "23 Jervois Street, Sheung Wan / Central",
    priceRange: "$$",
    openingHours: "12:00 - 22:00",
    ratingSum: 38,
    ratingCount: 8,
    averageRating: 4.7,
  },
  {
    id: "cheung-hing-kee",
    name: "Cheung Hing Kee Shanghai Pan-fried Buns",
    category: "Street Food",
    district: "Tsim Sha Tsui",
    address: "48 Lock Road, Tsim Sha Tsui",
    priceRange: "$",
    openingHours: "10:00 - 21:00",
    ratingSum: 18,
    ratingCount: 4,
    averageRating: 4.5,
  },
  {
    id: "butao-ramen-tst",
    name: "Butao Ramen (豚王)",
    category: "Japanese",
    district: "Tsim Sha Tsui",
    address: "28 Minden Ave, Tsim Sha Tsui",
    priceRange: "$$",
    openingHours: "11:30 - 22:00",
    ratingSum: 16,
    ratingCount: 4,
    averageRating: 4.0,
  }
];

async function seed() {
  console.log("Seeding Hong Kong culinary dataset into Firestore...");
  for (const item of HONG_KONG_RESTAURANTS) {
    const { id, ...data } = item;
    await setDoc(doc(db, "restaurants", id), data);
    console.log(`✓ Inserted: ${data.name}`);
  } // <--- Added the missing closing bracket for the loop here!

  console.log("\nSeeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});