import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { AidCardModel, UserModel } from "@/types";

export function getOfficialSealSvg(size = 125) {
  // Al-Fajr Signature Brand Colors: Emerald Green (#0A734D) and Deep Forest (#063A28)
  const emerald = "#0A734D";
  const forest = "#063A28";
  const wash = "rgba(10, 115, 77, 0.035)";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="${size}" height="${size}" style="transform: rotate(-3.5deg); display: inline-block; filter: drop-shadow(0 2.5px 5px rgba(10,115,77,0.22));">
      <defs>
        <!-- Top Circular Arc -->
        <path id="fajrTopArc" d="M 30 120 A 90 90 0 1 1 210 120" fill="none" />
        <!-- Bottom Circular Arc -->
        <path id="fajrBottomArc" d="M 210 120 A 90 90 0 1 1 30 120" fill="none" />
      </defs>

      <!-- 1. Outer Fine Scalloped / Micro-toothed Security Ring -->
      <circle cx="120" cy="120" r="116" fill="none" stroke="${emerald}" stroke-width="1.8" stroke-dasharray="3.5, 2" opacity="0.95" />
      
      <!-- 2. Concentric Double Border (Signature Emerald Frame) -->
      <circle cx="120" cy="120" r="109" fill="none" stroke="${emerald}" stroke-width="2.8" />
      <circle cx="120" cy="120" r="103" fill="none" stroke="${emerald}" stroke-width="1" />

      <!-- 3. Inner Core Medallion with light emerald wash -->
      <circle cx="120" cy="120" r="68" fill="${wash}" stroke="${emerald}" stroke-width="2" />
      <circle cx="120" cy="120" r="64" fill="none" stroke="${emerald}" stroke-width="0.9" stroke-dasharray="2.5, 2" />

      <!-- 4. Top Arc Text: مؤسسة الفجر الخيرية للتنمية -->
      <text fill="${emerald}" font-size="12" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="900" letter-spacing="0.8px">
        <textPath href="#fajrTopArc" startOffset="50%" text-anchor="middle">
          مؤسسة الفجر الخيرية للتنمية
        </textPath>
      </text>

      <!-- 5. Bottom Arc Text: قطاع الرقابة والاعتماد المركزي -->
      <text fill="${emerald}" font-size="10" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="800" letter-spacing="0.5px">
        <textPath href="#fajrBottomArc" startOffset="50%" text-anchor="middle">
          ❖ قطاع الرقابة والاعتماد المركزي ❖
        </textPath>
      </text>

      <!-- 6. Center Emblem & Calligraphy -->
      <g transform="translate(120, 120)">
        
        <!-- Al-Fajr Dawn Horizon Crest (شعار شروق الفجر الخيري) -->
        <g fill="none" stroke="${emerald}" stroke-width="1.4" opacity="0.9" transform="translate(0, -32) scale(0.85)">
          <!-- Radiating Dawn Rays -->
          <line x1="0" y1="-20" x2="0" y2="-14" stroke-width="2" />
          <line x1="-12" y1="-17" x2="-8" y2="-12" stroke-width="1.6" />
          <line x1="12" y1="-17" x2="8" y2="-12" stroke-width="1.6" />
          <line x1="-20" y1="-9" x2="-14" y2="-6" stroke-width="1.4" />
          <line x1="20" y1="-9" x2="14" y2="-6" stroke-width="1.4" />
          <!-- Rising Sun & Horizon Crescent Arc -->
          <path d="M -18 6 C -10 -8, 10 -8, 18 6" stroke-width="1.8" />
          <path d="M -24 6 C -12 -14, 12 -14, 24 6" stroke-width="1.2" />
          <circle cx="0" cy="5" r="3.5" fill="${emerald}" />
        </g>

        <!-- Grand Diwani Calligraphic Approval: مُـعـتَـمَـد -->
        <text y="-1" text-anchor="middle" fill="${forest}" font-size="18.5" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="900" letter-spacing="-0.3px">
          مُـعـتَـمَـد
        </text>

        <!-- Subtitle: رَسْـمِـيّـاً -->
        <text y="15" text-anchor="middle" fill="${emerald}" font-size="9.5" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="900" letter-spacing="0.8px">
          رَسْـمِـيّـاً
        </text>

        <!-- Department Label -->
        <text y="26" text-anchor="middle" fill="${forest}" font-size="8" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="800">
          إدارة المساعدات الاجتماعية
        </text>

        <!-- Clean Elegant Year & Side Flourish Dividers -->
        <line x1="-36" y1="36" x2="-16" y2="36" stroke="${emerald}" stroke-width="0.9" />
        <circle cx="-13" cy="36" r="1.5" fill="${emerald}" />
        
        <text y="39.5" text-anchor="middle" fill="${emerald}" font-size="9" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="900" letter-spacing="1.5px">
          ٢٠٢٦
        </text>

        <circle cx="13" cy="36" r="1.5" fill="${emerald}" />
        <line x1="16" y1="36" x2="36" y2="36" stroke="${emerald}" stroke-width="0.9" />

        <!-- Side Ornamental Fleuron Diamonds -->
        <g fill="${emerald}" opacity="0.9">
          <circle cx="-47" cy="0" r="2.2" />
          <circle cx="47" cy="0" r="2.2" />
          <path d="M -47 -5 L -45 0 L -47 5 L -49 0 Z" />
          <path d="M 47 -5 L 49 0 L 47 5 L 45 0 Z" />
        </g>
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

// ── EXCEL EXPORTS ──

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

// ── COMMON PRINT ENGINE WITH HIDDEN IFRAME (ZERO about:blank) ──

function executeIframePrint(docTitle: string, filterTitle: string, totalCount: number, tableHeadHtml: string, tableBodyHtml: string) {
  const sealSvg = getOfficialSealSvg(125);

  const docContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${docTitle} — مؤسسة الفجر الخيرية</title>
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
          border-bottom: 2.5px solid #0A734D;
          padding-bottom: 10px;
          margin-bottom: 10px;
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
          background: #f0fdf4;
          border: 1.5px solid #86efac;
          color: #166534;
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
          background: #0A734D !important;
          color: #ffffff !important;
          padding: 7px 6px;
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
          padding: 5.5px 6px;
          border: 1px solid #cbd5e1;
          font-size: 11px;
          vertical-align: middle;
        }
        tr:nth-child(even) {
          background: #f8fafc !important;
        }
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
          width: 125px;
          height: 125px;
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
          <div><strong>إجمالي السجلات:</strong> ${totalCount} سجل</div>
        </div>
      </div>

      <div class="filter-banner">
        <div>📋 نوع التقرير: <strong>${filterTitle}</strong></div>
        <div>العدد الإجمالي بالكشف: <strong>${totalCount}</strong> سجل معتمد</div>
      </div>

      <table>
        <thead>
          ${tableHeadHtml}
        </thead>
        <tbody>
          ${tableBodyHtml}
        </tbody>
      </table>

      <!-- Official Footer with Al-Fajr Signature Stamp -->
      <div class="footer-section">
        <div class="footer-info">
          <div>مؤسسة الفجر الخيرية © ${new Date().getFullYear()} — كشف رسمي معتمد</div>
        </div>

        <div class="approval-box">
          <div class="sign-text">
            <div>اعتماد المشرف العام:</div>
            <div style="font-weight: 900; color: #0A734D; margin-top: 4px;">د. مدير إدارة المساعدات الاجتماعية</div>
          </div>
          <div class="seal-container">
            ${sealSvg}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

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

// 1. PRINT ACCOUNTS REPORT (Al-Fajr Brand Seal)
export function printAccountsReport(users: UserModel[], filterTitle = "كافة الحسابات والاعتمادات") {
  const head = `
    <tr>
      <th style="width: 30px;">م</th>
      <th class="text-start">اسم المستخدم / المنفذ</th>
      <th>البريد الإلكتروني</th>
      <th>نوع الحساب</th>
      <th>رقم الكارت</th>
      <th>الرقم القومي / الهاتف</th>
      <th>المدينة / المحافظة</th>
      <th>الحالة</th>
    </tr>
  `;

  const body = users.map((u, idx) => {
    const cleanNat = cleanId(u.nationalId || u.phone);
    const cleanCard = cleanId(u.activeCardId);
    return `
      <tr>
        <td style="text-align: center; font-weight: 800; color: #475569; width: 30px;">${idx + 1}</td>
        <td style="font-weight: 800; color: #0f172a; padding-right: 8px;">${u.name || "—"}${u.storeName ? `<div style="font-size: 10px; color: #b45309; font-weight: 700;">🏪 ${u.storeName}</div>` : ""}</td>
        <td style="direction: ltr; text-align: left; font-family: monospace; font-size: 10px; font-weight: 700; color: #1e293b;">${u.email || "—"}</td>
        <td style="text-align: center; white-space: nowrap;">
          <span style="display: inline-block; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 800; background: ${u.role === 'admin' ? '#f3e8ff; color: #6b21a8;' : u.role === 'merchant' ? '#fef3c7; color: #92400e;' : '#dcfce7; color: #166534;'}">
            ${u.role === 'merchant' ? 'صراف معتمد' : u.role === 'admin' ? 'مشرف إداري' : u.role === 'volunteer' ? 'متطوع ميداني' : 'مستفيد'}
          </span>
        </td>
        <td style="direction: ltr; text-align: center; font-family: monospace; font-weight: 800; color: #0A734D; font-size: 10.5px;">${cleanCard}</td>
        <td style="direction: ltr; text-align: center; font-family: monospace; font-weight: 700; color: #334155; font-size: 10.5px;">${cleanNat}</td>
        <td style="text-align: center; font-weight: 700; color: #334155;">${u.city || u.residence || "القاهرة"}</td>
        <td style="text-align: center; font-size: 10px; font-weight: 800; color: ${u.isActive ? '#15803d' : '#b91c1c'};">
          ${u.isApproved === false ? "قيد المراجعة" : u.isActive ? "نشط ومفعل" : "معطل"}
        </td>
      </tr>
    `;
  }).join("");

  executeIframePrint("كشف_الحسابات", filterTitle, users.length, head, body);
}

// 2. PRINT BENEFICIARIES REPORT (Al-Fajr Brand Seal)
export function printBeneficiariesReport(cards: AidCardModel[], filterTitle = "كشف بطاقات المستفيدين") {
  const head = `
    <tr>
      <th style="width: 30px;">م</th>
      <th class="text-start">اسم المستفيد</th>
      <th>رقم الكارت</th>
      <th>الرقم القومي / الإقامة</th>
      <th>الجنسية</th>
      <th>محل الإقامة</th>
      <th>الرصيد المتاح</th>
      <th>سلال الغذاء</th>
      <th>الحالة</th>
    </tr>
  `;

  const body = cards.map((c, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 800; color: #475569;">${idx + 1}</td>
      <td style="font-weight: 800; color: #0f172a; padding-right: 8px;">${c.beneficiaryName || "—"}</td>
      <td style="direction: ltr; text-align: center; font-family: monospace; font-weight: 800; color: #0A734D;">${cleanId(c.cardId)}</td>
      <td style="direction: ltr; text-align: center; font-family: monospace; font-weight: 700; color: #334155;">${cleanId(c.nationalId)}</td>
      <td style="text-align: center;">${c.nationality || "مصرية"}</td>
      <td style="text-align: center;">${c.residence || "—"}</td>
      <td style="text-align: center; font-weight: 800; color: #0A734D; font-family: monospace;">${(c.totalBalance ?? c.balance ?? 0)} ج.م</td>
      <td style="text-align: center; font-weight: 800; color: #b45309;">${(c.foodBasketsQuota ?? 0)} سلة</td>
      <td style="text-align: center; font-weight: 800; color: ${c.status === 'active' ? '#15803d' : '#b91c1c'};">${c.status === 'active' ? 'نشط' : 'مجمد'}</td>
    </tr>
  `).join("");

  executeIframePrint("كشف_المستفيدين", filterTitle, cards.length, head, body);
}

// 3. PRINT TRANSACTIONS REPORT (Al-Fajr Brand Seal)
export function printTransactionsReport(transactions: any[], filterTitle = "سجل العمليات المالية") {
  const head = `
    <tr>
      <th style="width: 30px;">م</th>
      <th>رقم المعاملة</th>
      <th>رقم الكارت</th>
      <th class="text-start">اسم المستفيد</th>
      <th>المنفذ / المتجر</th>
      <th>المبلغ المصروف</th>
      <th>السلال</th>
      <th>المدينة</th>
      <th>التاريخ والوقت</th>
    </tr>
  `;

  const body = transactions.map((t, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 800; color: #475569;">${idx + 1}</td>
      <td style="direction: ltr; text-align: center; font-family: monospace; font-weight: 800; color: #0A734D;">${cleanId(t.id || t.transactionId || t.receiptNumber)}</td>
      <td style="direction: ltr; text-align: center; font-family: monospace;">${cleanId(t.cardId)}</td>
      <td style="font-weight: 800; color: #0f172a; padding-right: 8px;">${t.beneficiaryName || "—"}</td>
      <td style="text-align: center; font-weight: 700; color: #334155;">${t.merchantStoreName || t.merchantName || t.distributionCenter || "—"}</td>
      <td style="text-align: center; font-weight: 800; color: #0A734D; font-family: monospace;">${((t.amountDeducted ?? t.amount ?? t.totalAmount ?? 0) || 0).toLocaleString()} ج.م</td>
      <td style="text-align: center; font-weight: 800; color: #b45309;">${(t.foodBasketsDeducted ?? t.basketsCount ?? 0)}</td>
      <td style="text-align: center;">${t.city || t.residence || "—"}</td>
      <td style="text-align: center; font-size: 10px; color: #64748b;">${parseDateTimeStr(t.timestamp || t.date || t.createdAt)}</td>
    </tr>
  `).join("");

  executeIframePrint("سجل_العمليات_المالية", filterTitle, transactions.length, head, body);
}

// 4. PRINT MERCHANTS REPORT (Al-Fajr Brand Seal)
export function printMerchantsReport(merchants: UserModel[], filterTitle = "كشف المتاجر والمنافذ المعتمدة") {
  const head = `
    <tr>
      <th style="width: 30px;">م</th>
      <th class="text-start">اسم المتجر / المنفذ</th>
      <th>اسم المسؤول</th>
      <th>البريد الإلكتروني</th>
      <th>رقم الهاتف</th>
      <th>المدينة</th>
      <th>السجل التجاري</th>
      <th>العهدة المعتمدة</th>
      <th>إجمالي المصروف</th>
      <th>الحالة</th>
    </tr>
  `;

  const body = merchants.map((m, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 800; color: #475569;">${idx + 1}</td>
      <td style="font-weight: 800; color: #0f172a; padding-right: 8px;">${m.storeName || m.name || "—"}</td>
      <td style="font-weight: 700; color: #334155;">${m.name || "—"}</td>
      <td style="direction: ltr; text-align: left; font-family: monospace; font-size: 10px;">${m.email || "—"}</td>
      <td style="direction: ltr; text-align: center; font-family: monospace;">${cleanId(m.phone)}</td>
      <td style="text-align: center;">${m.city || "—"}</td>
      <td style="direction: ltr; text-align: center; font-family: monospace;">${cleanId(m.commercialReg)}</td>
      <td style="text-align: center; font-weight: 800; color: #0A734D; font-family: monospace;">${(m.allocatedBudget || 0).toLocaleString()} ج.م</td>
      <td style="text-align: center; font-weight: 800; color: #b45309; font-family: monospace;">${(m.totalDisbursed || 0).toLocaleString()} ج.م</td>
      <td style="text-align: center; font-weight: 800; color: ${m.isActive ? '#15803d' : '#b91c1c'};">${m.isActive ? 'معتمد ونشط' : 'قيد المراجعة'}</td>
    </tr>
  `).join("");

  executeIframePrint("كشف_المتاجر_والمنافذ", filterTitle, merchants.length, head, body);
}


// 5. PRINT BULK BENEFICIARY QR CARDS (4 Columns x 6 Rows = 24 Cards per A4 Page)
export async function printBulkBeneficiaryCards(
  cards: AidCardModel[],
  filterTitle = "كروت المستفيدين الذكية (QR Cards - 24 بالورقة)"
) {
  if (!cards || cards.length === 0) return;

  // Generate QR Codes for all cards asynchronously
  const cardsWithQr = await Promise.all(
    cards.map(async (c) => {
      try {
        const qrDataUrl = await QRCode.toDataURL(c.cardId || "FAJR-CARD", {
          margin: 1,
          width: 200,
          errorCorrectionLevel: "H",
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        return { ...c, qrDataUrl };
      } catch (err) {
        console.error("Error generating QR for card", c.cardId, err);
        return { ...c, qrDataUrl: "" };
      }
    })
  );

  // Chunk cards into groups of 24 (4 columns * 6 rows)
  const PAGE_SIZE = 24;
  const pages: (typeof cardsWithQr)[] = [];
  for (let i = 0; i < cardsWithQr.length; i += PAGE_SIZE) {
    pages.push(cardsWithQr.slice(i, i + PAGE_SIZE));
  }

  const pagesHtml = pages.map((pageCards, pageIdx) => {
    const stickersHtml = pageCards.map((c) => {
      const cleanCard = cleanId(c.cardId);
      const cleanNat = cleanId(c.nationalId);
      const name = c.beneficiaryName || "مستفيد معتمد";
      const balance = (c.balance ?? c.totalBalance ?? 30);
      const quota = c.foodBasketsQuota ?? 2;

      return `
        <div class="qr-sticker-item">
          <div class="sticker-head">
            <span class="sticker-brand">مؤسسة الفجر</span>
            <span class="sticker-code">${cleanCard}</span>
          </div>

          <div class="sticker-qr-wrap">
            ${
              c.qrDataUrl
                ? `<img src="${c.qrDataUrl}" alt="QR" class="sticker-qr-img" />`
                : `<div class="qr-fallback">${cleanCard}</div>`
            }
          </div>

          <div class="sticker-footer">
            <div class="sticker-name" title="${name}">${name}</div>
            <div class="sticker-meta-row">
              <span class="nat-box">القومي: <strong class="nat-num">${cleanNat}</strong></span>
              <span class="meta-badge">${balance} ج.م</span>
            </div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="print-page">
        <div class="page-micro-header">
          <div class="page-title">مؤسسة الفجر الخيرية — كروت الصرف الذكية (صفحة ${pageIdx + 1} من ${pages.length})</div>
          <div class="page-meta">إجمالي: ${cards.length} كارت — 24 كارت بالورقة (4 أعمدة × 6 صفوف)</div>
        </div>
        <div class="stickers-grid">
          ${stickersHtml}
        </div>
      </div>
    `;
  }).join("");

  const docContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>طباعة_كروت_المستفيدين_مؤسسة_الفجر_24_بالورقة</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=IBM+Plex+Sans+Arabic:wght@700;800;900&family=JetBrains+Mono:wght@700;800;900&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 portrait;
          margin: 4.5mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #000000;
          font-family: 'Cairo', 'IBM Plex Sans Arabic', sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .print-page {
          page-break-after: always;
          break-after: page;
          height: 288mm;
          max-height: 288mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          overflow: hidden;
          padding: 0;
          margin: 0 auto;
        }
        .print-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .page-micro-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 6mm;
          padding: 0 1mm 1mm 1mm;
          border-bottom: 1.5px solid #0A734D;
          margin-bottom: 1.5mm;
          flex-shrink: 0;
        }
        .page-title {
          font-size: 11px;
          font-weight: 900;
          color: #063A28;
        }
        .page-meta {
          font-size: 9px;
          color: #1e293b;
          font-weight: 800;
        }
        .stickers-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(6, 1fr);
          gap: 2mm;
          height: calc(288mm - 9.5mm);
          flex: 1;
          box-sizing: border-box;
        }
        .qr-sticker-item {
          border: 1.2px dashed #0A734D;
          border-radius: 6px;
          padding: 2.5px 3.5px 3px 3.5px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          text-align: center;
          box-sizing: border-box;
          overflow: hidden;
          break-inside: avoid;
          page-break-inside: avoid;
          height: 100%;
        }
        .sticker-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          border-bottom: 0.8px solid #cbd5e1;
          padding-bottom: 1px;
          line-height: 1;
          flex-shrink: 0;
        }
        .sticker-brand {
          font-size: 9px;
          font-weight: 900;
          color: #063A28;
        }
        .sticker-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 900;
          color: #0A734D;
          direction: ltr;
        }
        .sticker-qr-wrap {
          width: 18.5mm;
          height: 18.5mm;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0.5mm auto;
          flex-shrink: 0;
        }
        .sticker-qr-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        .qr-fallback {
          font-size: 8px;
          font-family: 'JetBrains Mono', monospace;
          color: #0A734D;
          font-weight: 900;
        }
        .sticker-footer {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.5px;
          border-top: 0.8px solid #cbd5e1;
          padding-top: 1.5px;
          line-height: 1.1;
          flex-shrink: 0;
        }
        .sticker-name {
          font-size: 11.5px;
          font-weight: 900;
          color: #000000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
          line-height: 1.2;
        }
        .sticker-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          line-height: 1;
        }
        .nat-box {
          font-size: 8px;
          color: #475569;
          font-weight: 800;
        }
        .nat-num {
          font-family: 'JetBrains Mono', monospace;
          direction: ltr;
          font-size: 9.5px;
          color: #000000;
          font-weight: 900;
          letter-spacing: 0.2px;
        }
        .meta-badge {
          color: #0A734D;
          font-weight: 900;
          font-size: 9px;
        }
        @media print {
          html, body {
            margin: 0;
            padding: 0;
          }
          .print-page {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `;

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
    }, 350);
  }
}
