import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export interface AuditLogEntry {
  id?: string;
  action: string;
  targetName?: string;
  targetId?: string;
  targetType?: string;
  adminId?: string;
  details?: string;
  adminEmail?: string;
  adminName?: string;
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
