import * as XLSX from "xlsx";
import { AidCardModel, UserModel } from "@/types";

function parseDateStr(raw: any): string {
  if (!raw) return "—";
  try {
    if (raw.toDate) return raw.toDate().toLocaleDateString("ar-EG");
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ar-EG");
  } catch {
    return "—";
  }
}

function parseDateTimeStr(raw: any): string {
  if (!raw) return "—";
  try {
    if (raw.toDate) return raw.toDate().toLocaleString("ar-EG");
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString("ar-EG");
  } catch {
    return "—";
  }
}

export function exportBeneficiariesToExcel(cards: AidCardModel[], filename = "كشف_المستفيدين_مؤسسة_الفجر") {
  const data = cards.map((c, index) => ({
    "م": index + 1,
    "اسم المستفيد": c.beneficiaryName || "—",
    "رقم البطاقة": c.cardId || "—",
    "الرقم القومي / الإقامة": c.nationalId || "—",
    "الجنسية": c.nationality || "مصرية",
    "محل الإقامة / المدينة": c.residence || "—",
    "عدد أفراد الأسرة": c.familyCount || 1,
    "الرصيد المالي المتاح (ج.م)": (c.totalBalance ?? c.balance ?? 0),
    "حصة السلال الغذائية": (c.foodBasketsQuota ?? 0),
    "حالة البطاقة": c.status === "active" ? "نشط" : c.status === "frozen" ? "مجمد" : "قيد المراجعة",
    "تاريخ التفعيل": parseDateStr(c.activatedAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "المستفيدين");
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportMerchantsToExcel(merchants: UserModel[], filename = "كشف_المنافذ_والمتاجر_مؤسسة_الفجر") {
  const data = merchants.map((m, index) => ({
    "م": index + 1,
    "اسم المتجر / المنفذ": m.storeName || m.name || "—",
    "اسم المسؤول": m.name || "—",
    "البريد الإلكتروني": m.email || "—",
    "رقم الهاتف": m.phone || "—",
    "المدينة": m.city || "—",
    "السجل التجاري": m.commercialReg || "—",
    "العهدة المعتمدة (ج.م)": m.allocatedBudget || 0,
    "إجمالي المصروف (ج.م)": m.totalDisbursed || 0,
    "الحالة": m.isActive ? "معتمد ونشط" : "قيد المراجعة",
    "تاريخ التسجيل": parseDateStr(m.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "المنافذ المعتمدة");
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportTransactionsToExcel(transactions: any[], filename = "سجل_العمليات_المالية_مؤسسة_الفجر") {
  const data = transactions.map((t, index) => ({
    "م": index + 1,
    "رقم المعاملة": t.id || t.transactionId || t.receiptNumber || "—",
    "اسم المستفيد": t.beneficiaryName || "—",
    "رقم البطاقة": t.cardId || "—",
    "المنفذ / المتجر": t.merchantStoreName || t.merchantName || t.distributionCenter || "—",
    "المبلغ المصروف (ج.م)": (t.amountDeducted ?? t.amount ?? t.totalAmount ?? 0),
    "السلال المصروفة": (t.foodBasketsDeducted ?? t.basketsCount ?? 0),
    "المدينة": t.city || t.residence || "—",
    "التاريخ والوقت": parseDateTimeStr(t.timestamp || t.date || t.createdAt),
    "ملاحظات": t.notes || "—",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "سجل العمليات");
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
