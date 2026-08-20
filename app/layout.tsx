import type { Metadata, Viewport } from "next";
import { Playfair_Display, Manrope } from "next/font/google";
import QueryProvider from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
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

export const viewport: Viewport = {
  themeColor: "#c2652a",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tenopilot.com"),
  title: {
    default: "TenoPilot.com — Precision Rental Operating System for PG & Hostel Management",
    template: "%s | TenoPilot.com",
  },
  description:
    "Automate room allocation, tenant & guest onboarding, automated rent collections, partner profit settlements, and 24/7 maintenance tracking for PG & Hostel owners.",
  keywords: [
    "PG management software",
    "hostel management software",
    "PG management app India",
    "rental operating system",
    "paying guest management software",
    "PG rent collection software",
    "hostel daily guest check-in",
    "PG room allocation tool",
    "automated rent receipts WhatsApp",
    "PG partner profit settlement",
    "co-living management platform",
    "student housing management app",
    "PG maintenance complaint portal",
    "TenoPilot",
  ],
  authors: [{ name: "TenoPilot Inc.", url: "https://www.tenopilot.com" }],
  creator: "TenoPilot Inc.",
  publisher: "TenoPilot Inc.",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://www.tenopilot.com",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://www.tenopilot.com",
    siteName: "TenoPilot.com",
    title: "TenoPilot.com — Precision Rental OS for PGs & Hostels",
    description:
      "Automate room allocation, tenant & guest onboarding, rent collections, partner profit settlements, and 24/7 maintenance tracking.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TenoPilot — Precision Rental Operating System for PGs & Hostels",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TenoPilot.com — Precision Rental OS for PGs & Hostels",
    description:
      "Automate room allocation, tenant & guest onboarding, rent collections, partner profit settlements, and maintenance tracking.",
    images: ["/og-image.png"],
    creator: "@tenopilot",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TenoPilot",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#c2652a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="TenoPilot" />
      </head>
      <body className="min-h-full font-sans bg-[#fff8f6] text-[#201a17]">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>

        {/* Service Worker Auto-Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('TenoPilot PWA ServiceWorker registered with scope: ', registration.scope);
                  }, function(err) {
                    console.log('TenoPilot PWA ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
