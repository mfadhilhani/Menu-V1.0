import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Tesfood", description: "Laporan test food, menu kalori, dan data makanan" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
