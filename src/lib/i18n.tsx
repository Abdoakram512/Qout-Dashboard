"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Locale = "ar" | "en";

export const translations = {
  ar: {
    app_title: "منظومة قُوت الإغاثية",
    admin_portal: "لوحة تحكم الإدارة العامة",
    login_title: "تسجيل دخول المشرف",
    login_subtitle: "لوحة التحكم المركزية لإدارة منظومة قُوت والمستفيدين والصرافين",
    email_label: "البريد الإلكتروني",
    password_label: "كلمة المرور",
    login_btn: "دخول للوحة التحكم",
    logging_in: "جاري التحقق...",
    logout_btn: "تسجيل الخروج",
    nav_overview: "الرئيسية والإحصائيات",
    nav_beneficiaries: "إدارة المستفيدين والكروت",
    nav_merchants: "إدارة منافذ الصرف",
    nav_accounts: "إدارة الحسابات والتفعيل",
    nav_transactions: "سجل عمليات الصرف",
    nav_settings: "الإعدادات والملف الشخصي",
    kpi_disbursed: "إجمالي المبالغ المصروفة",
    kpi_beneficiaries: "إجمالي المستفيدين",
    kpi_merchants: "منافذ الصرف المعتمدة",
    kpi_transactions: "إجمالي عمليات الصرف",
    currency: "ج.م",
    baskets: "سلة",
    search_placeholder: "بحث بالاسم، رقم الكارت، الرقم القومي...",
    export_pdf: "تصدير PDF",
    export_excel: "تصدير Excel",
    view_qr: "عرض رمز QR",
    download_qr: "تحميل QR صورة",
    card_id: "رقم الكارت",
    beneficiary_name: "اسم المستفيد",
    national_id: "رقم الجواز / البطاقة",
    nationality: "الجنسية",
    social_status: "الحالة الاجتماعية",
    balance: "الرصيد النقدي",
    food_baskets: "السلال الغذائية",
    status: "الحالة",
    expiry_date: "صالح حتى",
    actions: "الإجراءات",
    active: "نشط",
    frozen: "مجمّد",
    expired: "منتهي",
    pending_approval: "قيد المراجعة والتفعيل",
    pending_badge: "حسابات بانتظار الاعتماد",
    approve_btn: "اعتماد وتفعيل",
    reject_btn: "تعطيل / رفض",
    create_account: "إنشاء حساب جديد",
    merchant_name: "اسم المنفذ / المتجر",
    merchant_owner: "المسؤول",
    commercial_reg: "السجل التجاري",
    city: "المدينة",
    account_status: "حالة الحساب",
    account_role: "نوع الحساب",
    date: "التاريخ والوقت",
    recent_transactions: "أحدث عمليات الصرف الحية",
    filter_all: "الكل",
    filter_role_admin: "إدارة",
    filter_role_merchant: "صرافين",
    filter_role_beneficiary: "مستفيدين",
    filter_role_volunteer: "متطوعين",
    success_activated: "تم تفعيل الحساب بنجاح",
    success_deactivated: "تم تعطيل الحساب",
    error_auth: "بيانات الدخول غير صحيحة أو ليس لديك صلاحية المشرف",
  },
  en: {
    app_title: "QOUT Relief System",
    admin_portal: "Central Administration Portal",
    login_title: "Admin Sign In",
    login_subtitle: "Central Dashboard for Managing Beneficiaries, Aid Cards & Merchants",
    email_label: "Email Address",
    password_label: "Password",
    login_btn: "Sign In to Dashboard",
    logging_in: "Verifying credentials...",
    logout_btn: "Sign Out",
    nav_overview: "Dashboard Overview",
    nav_beneficiaries: "Beneficiaries & Cards",
    nav_merchants: "Disbursement Merchants",
    nav_accounts: "Accounts & Approvals",
    nav_transactions: "Redemption Transactions",
    nav_settings: "Settings & Profile",
    kpi_disbursed: "Total Funds Disbursed",
    kpi_beneficiaries: "Total Beneficiaries",
    kpi_merchants: "Active Merchants",
    kpi_transactions: "Completed Redemptions",
    currency: "EGP",
    baskets: "baskets",
    search_placeholder: "Search by name, card ID, national ID...",
    export_pdf: "Export PDF",
    export_excel: "Export Excel",
    view_qr: "View QR Code",
    download_qr: "Download QR PNG",
    card_id: "Card ID",
    beneficiary_name: "Beneficiary Name",
    national_id: "Passport / National ID",
    nationality: "Nationality",
    social_status: "Social Status",
    balance: "Cash Balance",
    food_baskets: "Food Baskets",
    status: "Status",
    expiry_date: "Expires At",
    actions: "Actions",
    active: "Active",
    frozen: "Frozen",
    expired: "Expired",
    pending_approval: "Pending Approval",
    pending_badge: "Pending Accounts",
    approve_btn: "Approve & Activate",
    reject_btn: "Deactivate / Reject",
    create_account: "Create New Account",
    merchant_name: "Store / Merchant Name",
    merchant_owner: "Owner Name",
    commercial_reg: "Commercial Reg",
    city: "City",
    account_status: "Account Status",
    account_role: "Account Role",
    date: "Date & Time",
    recent_transactions: "Recent Live Redemptions",
    filter_all: "All",
    filter_role_admin: "Admin",
    filter_role_merchant: "Merchants",
    filter_role_beneficiary: "Beneficiaries",
    filter_role_volunteer: "Volunteers",
    success_activated: "Account successfully activated",
    success_deactivated: "Account deactivated",
    error_auth: "Invalid credentials or unauthorized admin role",
  }
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof typeof translations.ar) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType>({
  locale: "ar",
  setLocale: () => {},
  t: (key) => key,
  isRTL: true,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const saved = localStorage.getItem("qout_admin_locale") as Locale;
    if (saved === "ar" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("qout_admin_locale", newLocale);
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLocale;
  };

  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: keyof typeof translations.ar): string => {
    return translations[locale][key] || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isRTL: locale === "ar" }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
