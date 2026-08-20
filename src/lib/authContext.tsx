"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { UserModel } from "@/types";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  adminData: UserModel | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  adminData: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminData, setAdminData] = useState<UserModel | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedAdmin = localStorage.getItem("qout_active_admin");
    if (storedAdmin) {
      try {
        setAdminData(JSON.parse(storedAdmin));
      } catch (_) {}
    }

    const unsub = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      if (currUser) {
        try {
          const docRef = doc(db, "users", currUser.uid);
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data()?.role === "admin") {
            const data = { uid: snap.id, ...snap.data() } as UserModel;
            setAdminData(data);
            localStorage.setItem("qout_active_admin", JSON.stringify(data));
          }
        } catch (e) {
          console.error("Error fetching admin profile:", e);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Direct Firestore check first
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", cleanEmail), where("role", "==", "admin"));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const adminDoc = snap.docs[0];
      const data = { uid: adminDoc.id, ...adminDoc.data() } as UserModel;

      if (!data.isActive) {
        throw new Error("حساب المشرف موقوف مؤقتاً");
      }

      const storedPass = (adminDoc.data() as any).password;
      if (storedPass && storedPass !== pass) {
        throw new Error("كلمة المرور غير صحيحة");
      }

      try {
        await signInWithEmailAndPassword(auth, cleanEmail, pass);
      } catch (_) {}

      setAdminData(data);
      localStorage.setItem("qout_active_admin", JSON.stringify(data));
      router.push("/dashboard");
      return;
    }

    // 2. Standard Firebase Auth
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const userDoc = await getDoc(doc(db, "users", cred.user.uid));

    if (userDoc.exists() && userDoc.data()?.role === "admin") {
      const data = { uid: userDoc.id, ...userDoc.data() } as UserModel;
      if (!data.isActive) {
        await fbSignOut(auth);
        throw new Error("حساب المشرف موقوف مؤقتاً");
      }
      setAdminData(data);
      localStorage.setItem("qout_active_admin", JSON.stringify(data));
      router.push("/dashboard");
    } else {
      await fbSignOut(auth);
      throw new Error("هذا الحساب ليس لديه صلاحيات إدارة المنظومة");
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (_) {}
    setAdminData(null);
    localStorage.removeItem("qout_active_admin");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, adminData, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
