import * as XLSX from "xlsx";
import { AidCardModel, UserModel } from "@/types";

export function getOfficialSealSvg(size = 125) {
  // Authentic Royal Stamp Ink Blue (#1e3a8a)
  const ink = "#1e3a8a";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="${size}" height="${size}" style="transform: rotate(-4deg); display: inline-block; filter: drop-shadow(0 2px 4px rgba(30,58,138,0.25));">
      <defs>
        <!-- Top Circular Arc for Institution Title -->
        <path id="royalTopArc" d="M 32 120 A 88 88 0 1 1 208 120" fill="none" />
        <!-- Bottom Circular Arc for Region & Ministry -->
        <path id="royalBottomArc" d="M 208 120 A 88 88 0 1 1 32 120" fill="none" />
      </defs>

      <!-- 1. Royal Scalloped / Beaded Outer Security Ring -->
      <circle cx="120" cy="120" r="115" fill="none" stroke="${ink}" stroke-width="1.8" stroke-dasharray="4, 2.5" opacity="0.9" />
      
      <!-- 2. Concentric Outer Double Rings -->
      <circle cx="120" cy="120" r="108" fill="none" stroke="${ink}" stroke-width="2.8" />
      <circle cx="120" cy="120" r="102" fill="none" stroke="${ink}" stroke-width="1" />

      <!-- 3. Inner Core Medallion with Ornate Security Border -->
      <circle cx="120" cy="120" r="68" fill="rgba(30, 58, 138, 0.03)" stroke="${ink}" stroke-width="2" />
      <circle cx="120" cy="120" r="64" fill="none" stroke="${ink}" stroke-width="1" stroke-dasharray="3, 2" />

      <!-- 4. Top Arc Text: مؤسسة الفجر الخيرية للتنمية -->
      <text fill="${ink}" font-size="12.5" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="900" letter-spacing="0.8px">
        <textPath href="#royalTopArc" startOffset="50%" text-anchor="middle">
          مؤسسة الفجر الخيرية للتنمية
        </textPath>
      </text>

      <!-- 5. Bottom Arc Text: قطاع الرقابة والاعتماد المركزي -->
      <text fill="${ink}" font-size="10.5" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="800" letter-spacing="0.5px">
        <textPath href="#royalBottomArc" startOffset="50%" text-anchor="middle">
          ❖ قطاع الرقابة والاعتماد المركزي ❖
        </textPath>
      </text>

      <!-- 6. Royal Core Heraldic Emblem & Calligraphy -->
      <g transform="translate(120, 120)">
        
        <!-- Royal Radiant Crest (Al-Fajr Emblem) -->
        <g fill="none" stroke="${ink}" stroke-width="1.4" opacity="0.95" transform="translate(0, -32) scale(0.8)">
          <path d="M -22 8 C -14 -4, -6 0, 0 -12 C 6 0, 14 -4, 22 8 Z" fill="rgba(30, 58, 138, 0.08)" />
          <circle cx="0" cy="-14" r="2.5" fill="${ink}" />
          <circle cx="-11" cy="-4" r="2" fill="${ink}" />
          <circle cx="11" cy="-4" r="2" fill="${ink}" />
          <line x1="0" y1="-22" x2="0" y2="-16" stroke-width="1.8" />
          <line x1="-12" y1="-18" x2="-8" y2="-13" stroke-width="1.5" />
          <line x1="12" y1="-18" x2="8" y2="-13" stroke-width="1.5" />
        </g>

        <!-- Ornate Central Calligraphic Text: مُـعـتَـمَـد -->
        <text y="0" text-anchor="middle" fill="${ink}" font-size="18" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="900" letter-spacing="-0.5px">
          مُـعـتَـمَـد
        </text>

        <!-- Subtitle: رَسْـمِـيّـاً -->
        <text y="17" text-anchor="middle" fill="${ink}" font-size="10" font-family="'Cairo', 'Tajawal', Arial, sans-serif" font-weight="900" letter-spacing="1px">
          رَسْـمِـيّـاً
        </text>

        <!-- Foundation Registration Frame -->
        <path d="M -35 26 L -30 34 L 30 34 L 35 26 L 30 28 L -30 28 Z" fill="rgba(30, 58, 138, 0.08)" stroke="${ink}" stroke-width="0.8" />
        <text y="33" text-anchor="middle" fill="${ink}" font-size="8.5" font-family="'Segoe UI', Tahoma, monospace" font-weight="800" letter-spacing="1px">
          ٢٠٢٦ / FAJR
        </text>

        <!-- Decorative Floral Dividers -->
        <g fill="${ink}" opacity="0.9">
          <circle cx="-46" cy="0" r="2.5" />
          <circle cx="46" cy="0" r="2.5" />
          <path d="M -46 -5 L -44 0 L -46 5 L -48 0 Z" />
          <path d="M 46 -5 L 48 0 L 46 5 L 44 0 Z" />
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

      <!-- Official Footer with Royal Ink Stamp -->
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

// 1. PRINT ACCOUNTS REPORT (Royal Seal)
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

// 2. PRINT BENEFICIARIES REPORT (Royal Seal)
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

// 3. PRINT TRANSACTIONS REPORT (Royal Seal)
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

// 4. PRINT MERCHANTS REPORT (Royal Seal)
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
