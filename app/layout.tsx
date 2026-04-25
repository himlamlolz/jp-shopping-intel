import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ClientWidgets from "@/components/ClientWidgets";
import ThemeProvider from "@/components/ThemeProvider";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

export const metadata: Metadata = {
  title: "JP Shopping Intel",
  description: "Personal Japanese shopping tracker with OCR import, wishlist, and discovery",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JP Shopping Intel",
  },
  icons: {
    apple: "/icon-192.png",
    icon: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#312e81",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <ThemeProvider>
          <Navigation />
          <main className="min-h-[calc(100vh-4rem)]">
            {children}
          </main>
          <ClientWidgets />
          <KeyboardShortcuts />
        </ThemeProvider>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {})
          }
        `}</Script>
      </body>
    </html>
  );
}


