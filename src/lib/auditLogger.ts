import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export interface AuditLogEntry {
  id?: string;
  action: string; // e.g. "تفعيل بطاقة", "حذف حساب", "شحن رصيد جماعي", "تعديل جنسيات"
  targetName?: string;
  targetId?: string;
  details?: string;
  adminEmail?: string;
  timestamp: string;
}

export async function logAuditEvent(entry: Omit<AuditLogEntry, "timestamp">) {
  try {
    await addDoc(collection(db, "audit_logs"), {
      ...entry,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
