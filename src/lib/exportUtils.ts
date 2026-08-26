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

export function exportAccountsToExcel(users: UserModel[], filterName = "جميع_الحسابات", filename = "كشف_حسابات_المنظومة_مؤسسة_الفجر") {
  const data = users.map((u, index) => ({
    "م": index + 1,
    "اسم المستخدم / المنفذ": u.name || u.storeName || "—",
    "البريد الإلكتروني": u.email || "—",
    "رقم الهاتف": u.phone || "—",
    "نوع الحساب": u.role === "merchant" ? "صراف معتمد" : u.role === "admin" ? "مشرف إداري" : u.role === "volunteer" ? "متطوع" : "مستفيد",
    "رقم الكارت الذكي": u.activeCardId || "—",
    "الرقم القومي / الإقامة": u.nationalId || "—",
    "المدينة / المحافظة": u.city || u.residence || "القاهرة",
    "حالة الحساب": u.isApproved === false ? "معلق بانتظار الاعتماد" : u.isActive ? "نشط ومفعل" : "معطل",
    "تاريخ التسجيل": parseDateStr(u.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "كشف الحسابات");
  XLSX.writeFile(workbook, `${filename}_${filterName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function printAccountsReport(users: UserModel[], filterTitle = "كافة الحسابات والاعتمادات") {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const rowsHtml = users.map((u, idx) => `
    <tr>
      <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
      <td style="font-weight: bold;">${u.name || "—"}${u.storeName ? `<br/><small style="color: #666;">(${u.storeName})</small>` : ""}</td>
      <td style="direction: ltr; font-family: monospace; font-size: 11px; text-align: left;">${u.email || "—"}</td>
      <td style="text-align: center;">
        <span style="padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; background: ${
          u.role === 'admin' ? '#f3e8ff; color: #6b21a8;' : u.role === 'merchant' ? '#fef3c7; color: #92400e;' : '#dcfce7; color: #166534;'
        }">${u.role === 'merchant' ? 'صراف' : u.role === 'admin' ? 'إدارة' : u.role === 'volunteer' ? 'متطوع' : 'مستفيد'}</span>
      </td>
      <td style="direction: ltr; font-family: monospace; font-size: 11px; text-align: center; font-weight: bold; color: #0A734D;">${u.activeCardId || "—"}</td>
      <td style="direction: ltr; font-family: monospace; font-size: 11px; text-align: center;">${u.nationalId || u.phone || "—"}</td>
      <td style="text-align: center;">${u.city || u.residence || "القاهرة"}</td>
      <td style="text-align: center; font-size: 11px; font-weight: bold; color: ${u.isActive ? '#166534' : '#991b1b'};">
        ${u.isApproved === false ? "معلق" : u.isActive ? "نشط" : "معطل"}
      </td>
    </tr>
  `).join("");

  const docContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>كشف الحسابات والاعتمادات — مؤسسة الفجر الخيرية</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; color: #0f172a; margin: 0; padding: 10px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #0A734D; padding-bottom: 12px; margin-bottom: 12px; }
        .logo-title { font-size: 18px; font-weight: 900; color: #0A734D; margin: 0; }
        .logo-sub { font-size: 11px; color: #64748b; font-weight: bold; margin-top: 2px; }
        .meta-box { text-align: left; font-size: 11px; color: #334155; line-height: 1.5; }
        .filter-badge { display: inline-flex; align-items: center; background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 12px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #0A734D; color: #ffffff; padding: 7px 6px; font-weight: 800; border: 1px solid #0A734D; font-size: 11px; }
        td { padding: 6px 6px; border: 1px solid #cbd5e1; font-size: 11px; }
        tr:nth-child(even) { background: #f8fafc; }
        .footer { margin-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        @media print {
          body { padding: 0; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="logo-title">مؤسسة الفجر الخيرية</h1>
          <div class="logo-sub">منظومة قُوت الإغاثية الموحدة — الإدارة العامة</div>
        </div>
        <div class="meta-box">
          <div><strong>تاريخ الإصدار:</strong> ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
          <div><strong>إجمالي السجلات:</strong> ${users.length} حساب</div>
        </div>
      </div>

      <div class="filter-badge">
        📋 تقرير: ${filterTitle} — العدد: ${users.length} حساب
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">م</th>
            <th>اسم المستخدم / المنفذ</th>
            <th>البريد الإلكتروني</th>
            <th>نوع الحساب</th>
            <th>رقم الكارت</th>
            <th>الرقم القومي / الهاتف</th>
            <th>المدينة</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div>مؤسسة الفجر الخيرية © ${new Date().getFullYear()} — كشف رسمي معتمد للنظام</div>
        <div>توقيع واعتماد الإدارة: ........................................</div>
      </div>

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(docContent);
  printWindow.document.close();
}
