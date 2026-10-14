import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Tesfood", description: "Laporan test food, menu kalori, dan data makanan" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Font untuk poster (nama menu dan deskripsi); kalau gagal dimuat, dipakai font cadangan. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gaegu:wght@700&family=Playfair+Display+SC:wght@700&family=Hanken+Grotesk:wght@400&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
