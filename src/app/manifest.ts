import type { MetadataRoute } from "next";

// Supaya bisa dipasang di layar utama HP ("Tambahkan ke layar utama") dan dibuka seperti aplikasi.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tesfood", short_name: "Tesfood", description: "Laporan test food, menu kalori, poster, dan data makanan",
    start_url: "/", display: "standalone", background_color: "#f3f6fb", theme_color: "#0b2a5b", lang: "id",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
