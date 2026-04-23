import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ClientWidgets from "@/components/ClientWidgets";

export const metadata: Metadata = {
  title: "JP Shopping Intel",
  description: "Personal Japanese shopping tracker with OCR import, wishlist, and discovery",
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
        <Navigation />
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
        <ClientWidgets />
      </body>
    </html>
  );
}


