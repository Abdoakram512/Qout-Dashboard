import * as XLSX from "xlsx";
import { AidCardModel, UserModel } from "@/types";

export function exportBeneficiariesToExcel(cards: AidCardModel[], filename = "كشف_المستفيدين_مؤسسة_الفجر") {
  const data = cards.map((c, index) => ({
    "م": index + 1,
    "اسم المستفيد": c.beneficiaryName || "—",
    "رقم البطاقة": c.cardId || "—",
    "الرقم القومي / الإقامة": c.nationalId || "—",
    "الجنسية": c.nationality || "مصرية",
    "محل الإقامة / المدينة": c.residence || "—",
    "عدد أفراد الأسرة": c.familyCount || 1,
    "الرصيد المالي المتاح (ج.م)": c.totalBalance || 0,
    "حصة السلال الغذائية": c.foodBasketsQuota || 0,
    "حالة البطاقة": c.status === "active" ? "نشط" : c.status === "frozen" ? "مجمد" : "قيد المراجعة",
    "تاريخ التفعيل": c.activatedAt ? new Date(c.activatedAt).toLocaleDateString("ar-EG") : "—",
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
    "الحالة": m.isActive ? "معتمد ونشط" : "قيد المراجعة",
    "تاريخ التسجيل": m.createdAt ? new Date(m.createdAt).toLocaleDateString("ar-EG") : "—",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "المنافذ المعتمدة");
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportTransactionsToExcel(transactions: any[], filename = "سجل_العمليات_المالية_مؤسسة_الفجر") {
  const data = transactions.map((t, index) => ({
    "م": index + 1,
    "رقم المعاملة": t.id || t.receiptNumber || "—",
    "اسم المستفيد": t.beneficiaryName || "—",
    "رقم البطاقة": t.cardId || "—",
    "المنفذ / المتجر": t.merchantStoreName || t.distributionCenter || "—",
    "المبلغ المصروف (ج.م)": t.totalAmount || t.amount || 0,
    "السلال المصروفة": t.basketsCount || 0,
    "المدينة": t.city || t.residence || "—",
    "التاريخ والوقت": t.timestamp ? new Date(t.timestamp).toLocaleString("ar-EG") : (t.date || "—"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "سجل العمليات");
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
