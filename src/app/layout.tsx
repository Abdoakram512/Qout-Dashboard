import type { Metadata } from "next";
import { Cairo, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/authContext";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "مؤسسة الفجر الخيرية | لوحة تحكم الإدارة العامة",
  description: "البوابة الإدارية والرقابية المعتمدة - مؤسسة الفجر الخيرية للتنمية",
  icons: {
    icon: [
      { url: "/app_icon.png", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/app_icon.png",
    shortcut: "/app_icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="icon" href="/app_icon.png" type="image/png" />
        <link rel="shortcut icon" href="/app_icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/app_icon.png" />
      </head>
      <body className="antialiased min-h-screen bg-[#F8FAF9]">
        <I18nProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
