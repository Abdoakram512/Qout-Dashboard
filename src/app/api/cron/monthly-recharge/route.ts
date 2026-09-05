import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  doc,
  writeBatch,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

// Helper to get formatted cycle key e.g. "2026-09"
function getCurrentCycleKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Arabic Month Name Helper
function getArabicMonthName(monthIndex: number): string {
  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  return months[monthIndex] || "";
}

export async function GET(request: NextRequest) {
  return handleMonthlyRecharge();
}

export async function POST(request: NextRequest) {
  return handleMonthlyRecharge();
}

async function handleMonthlyRecharge() {
  const now = new Date();
  const cycleKey = getCurrentCycleKey();
  const cycleDisplayAr = `دورة شهر ${getArabicMonthName(now.getMonth())} ${now.getFullYear()}`;

  try {
    // 1. Check if this month's cycle was already executed globally
    const cycleRef = doc(db, "system_settings", "monthly_cycles");
    const cycleDoc = await getDoc(cycleRef);

    if (cycleDoc.exists()) {
      const data = cycleDoc.data();
      if (data?.lastProcessedCycle === cycleKey) {
        return NextResponse.json({
          status: "already_processed",
          message: `Cycle ${cycleKey} was already processed on ${data.processedAt}`,
          cycle: cycleKey,
          totalBeneficiaries: data.totalBeneficiaries || 0,
        });
      }
    }

    // 2. Fetch all active aid cards
    const cardsQuery = query(
      collection(db, "aid_cards"),
      where("status", "==", "active")
    );
    const cardsSnapshot = await getDocs(cardsQuery);

    if (cardsSnapshot.empty) {
      return NextResponse.json({
        status: "no_active_cards",
        message: "No active aid cards found to recharge",
        cycle: cycleKey,
      });
    }

    const nowIso = now.toISOString();
    const docs = cardsSnapshot.docs;
    const chunkSize = 400; // Firestore batch limit is 500
    let totalUpdated = 0;

    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const cardDoc of chunk) {
        const cardData = cardDoc.data();
        
        // Ensure this specific card hasn't already received this cycle
        if (cardData.lastMonthlyCycle === cycleKey) {
          continue;
        }

        const currentBalance = Number(cardData.balance ?? cardData.totalBalance ?? 0);
        const currentQuota = Number(cardData.foodBasketsQuota ?? 0);

        batch.update(cardDoc.ref, {
          balance: currentBalance + 30,
          totalBalance: currentBalance + 30,
          foodBasketsQuota: currentQuota + 1,
          lastMonthlyCycle: cycleKey,
          lastRechargedAt: nowIso,
          updatedAt: Timestamp.now(),
        });

        // Sync linked user document if exists
        if (cardData.beneficiaryId) {
          const userRef = doc(db, "users", cardData.beneficiaryId);
          batch.update(userRef, {
            balance: currentBalance + 30,
            totalBalance: currentBalance + 30,
            foodBasketsQuota: currentQuota + 1,
            lastMonthlyCycle: cycleKey,
            lastRechargedAt: nowIso,
          });
        }

        totalUpdated++;
      }

      await batch.commit();
    }

    // 3. Record cycle metadata in system_settings
    await setDoc(
      cycleRef,
      {
        lastProcessedCycle: cycleKey,
        cycleNameArabic: cycleDisplayAr,
        processedAt: nowIso,
        totalBeneficiaries: totalUpdated,
        quotaPerBeneficiary: {
          cash: 30,
          foodBaskets: 1,
        },
        executionMethod: "automated_cron",
      },
      { merge: true }
    );

    // 4. Log Audit Event in audit_logs
    try {
      const auditRef = doc(collection(db, "audit_logs"));
      await setDoc(auditRef, {
        id: auditRef.id,
        action: "automated_monthly_quota_deposit",
        adminEmail: "system.cron@alfajr.org",
        targetType: "system_cycle",
        targetId: cycleKey,
        details: `تم إيداع الحصة الشهرية تلقائياً لدورة (${cycleDisplayAr}) لعدد ${totalUpdated} مستفيد نشط بمبلغ 30 ج.م وسلة غذائية لكل مستفيد مع ترحيل الفائض.`,
        timestamp: nowIso,
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      status: "completed",
      cycle: cycleKey,
      cycleName: cycleDisplayAr,
      totalUpdated,
      message: `Successfully deposited 30 EGP + 1 food basket for ${totalUpdated} active beneficiaries.`,
    });
  } catch (error: any) {
    console.error("Automated monthly recharge cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error during monthly recharge",
      },
      { status: 500 }
    );
  }
}
