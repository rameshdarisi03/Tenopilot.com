import type { Metadata } from "next";
import { Playfair_Display, Manrope } from "next/font/google";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TenoPilot — Rental Operating System for PG & Hostel Management",
  description:
    "Automate room allocation, tenant & guest onboarding, rent collections, partner profit settlements, and expense tracking for PG & Hostel owners.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans bg-[#fff8f6] text-[#201a17]">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
