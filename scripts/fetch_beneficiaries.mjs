import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAEf1L85LIGonn2ivz-gNpCBgOz2XQYy0M",
  authDomain: "qout-f853f.firebaseapp.com",
  projectId: "qout-f853f",
  storageBucket: "qout-f853f.firebasestorage.app",
  messagingSenderId: "974658039816",
  appId: "1:974658039816:web:e102dbe24367498f8b61bd",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getBeneficiaries() {
  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", "beneficiary"),
      limit(5)
    );
    const snap = await getDocs(q);

    console.log(=== FOUND  BENEFICIARY USER(S) ===\n);

    for (const doc of snap.docs) {
      const data = doc.data();
      console.log("-----------------------------------------");
      console.log(User ID (UID): );
      console.log(Name: );
      console.log(Email / Login: );
      console.log(Phone: );
      console.log(National ID: );
      console.log(Card ID: );
      console.log(City / District: );
      console.log(Is Active: );
      console.log(Is Approved: );
      console.log(Social Status: );
      console.log(Field Research: );
      console.log(Family Members: );
      console.log(Monthly Balance: );
    }

    // Also fetch aid_cards
    const cardsQ = query(collection(db, "aid_cards"), limit(5));
    const cardsSnap = await getDocs(cardsQ);
    console.log(\n=== FOUND  AID CARD(S) ===\n);
    for (const doc of cardsSnap.docs) {
      const data = doc.data();
      console.log("-----------------------------------------");
      console.log(Card ID (QR/Search): );
      console.log(Beneficiary Name: );
      console.log(Beneficiary UID: );
      console.log(National ID: );
      console.log(Total Balance:  EGP);
      console.log(Food Baskets Balance:  Baskets);
      console.log(Card Status: );
      console.log(Security PIN: );
    }
  } catch (err) {
    console.error("Error fetching beneficiaries:", err);
  }
}

getBeneficiaries();
