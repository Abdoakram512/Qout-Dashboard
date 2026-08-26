import * as XLSX from "xlsx";
import { AidCardModel, UserModel } from "@/types";

export function getOfficialSealSvg(size = 120) {
  // Authentic Royal Stamp Ink Blue (#1e3a8a)
  const inkColor = "#1e3a8a";
  const lightWash = "rgba(30, 58, 138, 0.04)";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}" style="transform: rotate(-5deg); display: inline-block; filter: drop-shadow(0 2px 4px rgba(30,58,138,0.2));">
      <defs>
        <!-- Top Arc Path for Main Name -->
        <path id="topSealArc" d="M 26 100 A 74 74 0 1 1 174 100" fill="none" />
        <!-- Bottom Arc Path for Department -->
        <path id="bottomSealArc" d="M 174 100 A 74 74 0 1 1 26 100" fill="none" />
      </defs>

      <!-- 1. Outer Security Beaded Border (100% Vector) -->
      <circle cx="100" cy="100" r="96" fill="none" stroke="${inkColor}" stroke-width="1.8" stroke-dasharray="3.5, 2" opacity="0.9" />
      
      <!-- 2. Concentric Outer Double Rings -->
      <circle cx="100" cy="100" r="90" fill="none" stroke="${inkColor}" stroke-width="2.5" />
      <circle cx="100" cy="100" r="85" fill="none" stroke="${inkColor}" stroke-width="1" />

      <!-- 3. Inner Core Medallion with light ink wash -->
      <circle cx="100" cy="100" r="56" fill="${lightWash}" stroke="${inkColor}" stroke-width="1.8" />
      <circle cx="100" cy="100" r="52" fill="none" stroke="${inkColor}" stroke-width="0.8" stroke-dasharray="2.5, 2" />

      <!-- 4. Top Curved Text: مؤسسة الفجر الخيرية -->
      <text fill="${inkColor}" font-size="11" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="900" letter-spacing="0.8px">
        <textPath href="#topSealArc" startOffset="50%" text-anchor="middle">
          مؤسسة الفجر الخيرية للتنمية
        </textPath>
      </text>

      <!-- 5. Bottom Curved Text: قطاع الرقابة والاعتماد المالي -->
      <text fill="${inkColor}" font-size="9" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="800" letter-spacing="0.4px">
        <textPath href="#bottomSealArc" startOffset="50%" text-anchor="middle">
          • قطاع الرقابة والاعتماد المالي •
        </textPath>
      </text>

      <!-- 6. Center Official Stamp Core -->
      <g transform="translate(100, 100)">
        <!-- Elegant Dawn / Sunburst Geometric Crest (Al-Fajr Emblem) -->
        <g stroke="${inkColor}" stroke-width="1.2" fill="none" opacity="0.9" transform="translate(0, -26) scale(0.65)">
          <path d="M -16 6 C -8 -8, 8 -8, 16 6" />
          <path d="M -22 6 C -10 -14, 10 -14, 22 6" />
          <line x1="0" y1="-18" x2="0" y2="-8" stroke-width="1.5" />
          <line x1="-12" y1="-15" x2="-6" y2="-6" stroke-width="1.5" />
          <line x1="12" y1="-15" x2="6" y2="-6" stroke-width="1.5" />
          <line x1="-18" y1="-7" x2="-10" y2="-1" stroke-width="1.5" />
          <line x1="18" y1="-7" x2="10" y2="-1" stroke-width="1.5" />
          <circle cx="0" cy="4" r="3" fill="${inkColor}" />
        </g>
        
        <!-- Center Main Arabic Approval Text -->
        <text y="-2" text-anchor="middle" fill="${inkColor}" font-size="13" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="900">
          معتمد رسميـاً
        </text>

        <!-- Center Subtitle: الإدارة العامة -->
        <text y="12" text-anchor="middle" fill="${inkColor}" font-size="8" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="800" letter-spacing="0.5px">
          إدارة المساعدات الاجتماعية
        </text>
        
        <!-- Registration & Year -->
        <text y="26" text-anchor="middle" fill="${inkColor}" font-size="8.5" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="800" letter-spacing="0.5px">
          قيد رسمي: ٢٠٢٦
        </text>

        <!-- Fine Geometric Horizontal Division Lines with Diamonds -->
        <line x1="-36" y1="-14" x2="-18" y2="-14" stroke="${inkColor}" stroke-width="1" />
        <line x1="18" y1="-14" x2="36" y2="-14" stroke="${inkColor}" stroke-width="1" />
        <polygon points="-14,-14 -11,-16 -8,-14 -11,-12" fill="${inkColor}" />
        <polygon points="8,-14 11,-16 14,-14 11,-12" fill="${inkColor}" />
      </g>
    </svg>
  `;
}

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

export function exportAccountsToExcel(users: UserModel[], filterName = "جميع_الحسابات", filename = "كشف_حسابات_مؤسسة_الفجر") {
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

  const sealSvg = getOfficialSealSvg(115);

  const docContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>كشف الحسابات — مؤسسة الفجر الخيرية</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@500;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 landscape;
          margin: 8mm 10mm 8mm 10mm;
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
          border-bottom: 2.5px solid #1e3a8a;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .logo-title {
          font-size: 20px;
          font-weight: 900;
          color: #1e3a8a;
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
          line-height: 1.5;
        }
        .meta-box strong {
          color: #0f172a;
          font-weight: 800;
        }
        .filter-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #eff6ff;
          border: 1.5px solid #93c5fd;
          color: #1e40af;
          padding: 5px 12px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 11.5px;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        th {
          background: #1e3a8a !important;
          color: #ffffff !important;
          padding: 7px 6px;
          font-weight: 800;
          border: 1px solid #1e3a8a;
          font-size: 11px;
          text-align: center;
        }
        th.text-start {
          text-align: right;
          padding-right: 10px;
        }
        td {
          padding: 5.5px 6px;
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
          width: 30px;
        }
        .name-cell {
          font-weight: 800;
          color: #0f172a;
          padding-right: 8px;
        }
        .store-badge {
          font-size: 10px;
          color: #b45309;
          font-weight: 700;
          margin-top: 1px;
        }
        .email-cell {
          direction: ltr;
          text-align: left;
          font-family: 'Segoe UI', Tahoma, monospace;
          font-size: 10px;
          font-weight: 700;
          color: #1e293b;
        }
        .role-cell {
          text-align: center;
          white-space: nowrap;
        }
        .badge {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 5px;
          font-size: 10px;
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
          color: #1e3a8a;
          font-size: 10.5px;
          white-space: nowrap;
        }
        .id-cell {
          direction: ltr;
          text-align: center;
          font-family: 'Segoe UI', Tahoma, monospace;
          font-weight: 700;
          color: #334155;
          font-size: 10.5px;
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
          font-size: 10px;
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
        
        /* ── Official Stamp Footer Section ── */
        .footer-section {
          margin-top: 15px;
          page-break-inside: avoid;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-top: 1.5px solid #cbd5e1;
          padding-top: 10px;
        }
        .footer-info {
          font-size: 10.5px;
          color: #64748b;
          font-weight: 700;
          line-height: 1.6;
        }
        .approval-box {
          display: flex;
          align-items: center;
          gap: 18px;
          text-align: right;
        }
        .sign-text {
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.6;
        }
        .seal-container {
          position: relative;
          width: 120px;
          height: 120px;
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
          <div class="logo-sub">الإدارة العامة للمساعدات الإنسانية والرقابة المركزية</div>
        </div>
        <div class="meta-box">
          <div><strong>تاريخ الإصدار:</strong> ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
          <div><strong>إجمالي السجلات:</strong> ${users.length} حساب</div>
        </div>
      </div>

      <div class="filter-banner">
        <div>📋 نوع التقرير: <strong>${filterTitle}</strong></div>
        <div>العدد الإجمالي بالكشف: <strong>${users.length}</strong> حساب معتمد</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>م</th>
            <th class="text-start">اسم المستخدم / المنفذ</th>
            <th>البريد الإلكتروني</th>
            <th>نوع الحساب</th>
            <th>رقم الكارت</th>
            <th>الرقم القومي / الهاتف</th>
            <th>المدينة / المحافظة</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Official Footer with Ink Stamp -->
      <div class="footer-section">
        <div class="footer-info">
          <div>مؤسسة الفجر الخيرية © ${new Date().getFullYear()} — كشف رسمي معتمد</div>
        </div>

        <div class="approval-box">
          <div class="sign-text">
            <div>اعتماد المشرف العام:</div>
            <div style="font-weight: 900; color: #1e3a8a; margin-top: 4px;">د. مدير إدارة المساعدات الاجتماعية</div>
          </div>
          <div class="seal-container">
            ${sealSvg}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Use Hidden Iframe to completely prevent "about:blank" in headers/footers
  let iframe = document.getElementById("printReportIframe") as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "printReportIframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(docContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  }
}
