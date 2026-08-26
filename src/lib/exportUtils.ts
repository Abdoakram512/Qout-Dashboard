import * as XLSX from "xlsx";
import { AidCardModel, UserModel } from "@/types";

function cleanId(raw: any): string {
  if (!raw) return "—";
  return raw.toString().trim().replace(/\s+/g, "");
}

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
    "رقم البطاقة": cleanId(c.cardId),
    "الرقم القومي / الإقامة": cleanId(c.nationalId),
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
    "رقم الهاتف": cleanId(m.phone),
    "المدينة": m.city || "—",
    "السجل التجاري": cleanId(m.commercialReg),
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
    "رقم المعاملة": cleanId(t.id || t.transactionId || t.receiptNumber),
    "اسم المستفيد": t.beneficiaryName || "—",
    "رقم البطاقة": cleanId(t.cardId),
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
    "رقم الهاتف": cleanId(u.phone),
    "نوع الحساب": u.role === "merchant" ? "صراف معتمد" : u.role === "admin" ? "مشرف إداري" : u.role === "volunteer" ? "متطوع" : "مستفيد",
    "رقم الكارت الذكي": cleanId(u.activeCardId),
    "الرقم القومي / الإقامة": cleanId(u.nationalId),
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

  const rowsHtml = users.map((u, idx) => {
    const cleanNat = cleanId(u.nationalId || u.phone);
    const cleanCard = cleanId(u.activeCardId);
    return `
      <tr>
        <td class="num-cell">${idx + 1}</td>
        <td class="name-cell">${u.name || "—"}${u.storeName ? `<div class="store-badge">🏪 ${u.storeName}</div>` : ""}</td>
        <td class="email-cell">${u.email || "—"}</td>
        <td class="role-cell">
          <span class="badge badge-${u.role}">
            ${u.role === 'merchant' ? 'صراف معتمد' : u.role === 'admin' ? 'مشرف إداري' : u.role === 'volunteer' ? 'متطوع ميداني' : 'مستفيد'}
          </span>
        </td>
        <td class="card-cell">${cleanCard}</td>
        <td class="id-cell">${cleanNat}</td>
        <td class="city-cell">${u.city || u.residence || "القاهرة"}</td>
        <td class="status-cell">
          <span class="status-${u.isApproved === false ? 'pending' : u.isActive ? 'active' : 'inactive'}">
            ${u.isApproved === false ? "قيد المراجعة" : u.isActive ? "نشط ومفعل" : "معطل"}
          </span>
        </td>
      </tr>
    `;
  }).join("");

  const docContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>كشف الحسابات والاعتمادات — مؤسسة الفجر الخيرية</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@500;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm 12mm 12mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 8px;
          line-height: 1.4;
          font-size: 11px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2.5px solid #0A734D;
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .logo-title {
          font-size: 20px;
          font-weight: 900;
          color: #0A734D;
          margin: 0;
          letter-spacing: -0.3px;
        }
        .logo-sub {
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
          margin-top: 2px;
        }
        .meta-box {
          text-align: left;
          font-size: 11px;
          color: #334155;
          font-weight: 600;
          line-height: 1.6;
        }
        .meta-box strong {
          color: #0f172a;
          font-weight: 800;
        }
        .filter-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f0fdf4;
          border: 1.5px solid #86efac;
          color: #166534;
          padding: 6px 14px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 12px;
          margin-bottom: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        th {
          background: #0A734D !important;
          color: #ffffff !important;
          padding: 8px 6px;
          font-weight: 800;
          border: 1px solid #0A734D;
          font-size: 11px;
          text-align: center;
        }
        th.text-start {
          text-align: right;
          padding-right: 10px;
        }
        td {
          padding: 6px 6px;
          border: 1px solid #cbd5e1;
          font-size: 11px;
          vertical-align: middle;
        }
        tr:nth-child(even) {
          background: #f8fafc !important;
        }
        .num-cell {
          text-align: center;
          font-weight: 800;
          color: #475569;
          width: 32px;
        }
        .name-cell {
          font-weight: 800;
          color: #0f172a;
          padding-right: 10px;
        }
        .store-badge {
          font-size: 10px;
          color: #b45309;
          font-weight: 700;
          margin-top: 2px;
        }
        .email-cell {
          direction: ltr;
          text-align: left;
          font-family: 'Segoe UI', Tahoma, monospace;
          font-size: 10.5px;
          font-weight: 700;
          color: #1e293b;
        }
        .role-cell {
          text-align: center;
          white-space: nowrap;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 800;
        }
        .badge-beneficiary {
          background: #dcfce7 !important;
          color: #166534 !important;
          border: 1px solid #bbf7d0;
        }
        .badge-merchant {
          background: #fef3c7 !important;
          color: #92400e !important;
          border: 1px solid #fde68a;
        }
        .badge-admin {
          background: #f3e8ff !important;
          color: #6b21a8 !important;
          border: 1px solid #e9d5ff;
        }
        .badge-volunteer {
          background: #e0f2fe !important;
          color: #0369a1 !important;
          border: 1px solid #bae6fd;
        }
        .card-cell {
          direction: ltr;
          text-align: center;
          font-family: 'Segoe UI', Tahoma, monospace;
          font-weight: 800;
          color: #0A734D;
          font-size: 11px;
          white-space: nowrap;
        }
        .id-cell {
          direction: ltr;
          text-align: center;
          font-family: 'Segoe UI', Tahoma, monospace;
          font-weight: 700;
          color: #334155;
          font-size: 11px;
          letter-spacing: 0.3px;
          white-space: nowrap;
        }
        .city-cell {
          text-align: center;
          font-weight: 700;
          color: #334155;
        }
        .status-cell {
          text-align: center;
          font-size: 10.5px;
          font-weight: 800;
        }
        .status-active {
          color: #15803d;
          font-weight: 800;
        }
        .status-inactive {
          color: #b91c1c;
          font-weight: 800;
        }
        .status-pending {
          color: #b45309;
          font-weight: 800;
        }
        .footer {
          margin-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #64748b;
          border-top: 1.5px solid #cbd5e1;
          padding-top: 8px;
          font-weight: 600;
        }
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
          <div class="logo-sub">منظومة قُوت الإغاثية الموحدة — الإدارة العامة والرقابة المركزية</div>
        </div>
        <div class="meta-box">
          <div><strong>تاريخ الإصدار:</strong> ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
          <div><strong>إجمالي السجلات بالكشف:</strong> ${users.length} حساب</div>
        </div>
      </div>

      <div class="filter-banner">
        <div>📋 نوع التقرير: <strong>${filterTitle}</strong></div>
        <div>العدد الإجمالي: <strong>${users.length}</strong> حساب معتمد</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>م</th>
            <th class="text-start">اسم المستخدم / المنفذ</th>
            <th>البريد الإلكتروني</th>
            <th>نوع الحساب</th>
            <th>رقم الكارت الذكي</th>
            <th>الرقم القومي / الهاتف</th>
            <th>المدينة / المحافظة</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div>مؤسسة الفجر الخيرية © ${new Date().getFullYear()} — وثيقة رسمية معتمدة من الإدارة المركزية</div>
        <div>اعتماد وتوقيع المشرف العام: ....................................................</div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 200);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(docContent);
  printWindow.document.close();
}
