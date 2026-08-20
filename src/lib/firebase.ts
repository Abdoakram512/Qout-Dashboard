import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAEf1L85LIGonn2ivz-gNpCBgOz2XQYy0M",
  authDomain: "qout-f853f.firebaseapp.com",
  projectId: "qout-f853f",
  storageBucket: "qout-f853f.firebasestorage.app",
  messagingSenderId: "974658039816",
  appId: "1:974658039816:web:e102dbe24367498f8b61bd",
  measurementId: "G-ZW8W5TZBRQ",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
