// Panggilan Gemini (hanya dari server). Mengembalikan satu angka kkal per 100 g dan deskripsi maksimal 14 kata.
import { clean } from "./text";

export type AIFood = { nama: string; deskripsi: string; kkal: number };

const prompt = (name: string) =>
  `Kamu ahli gizi Indonesia. Untuk makanan atau minuman bernama "${name}" (sajian matang/siap santap di katering atau kantin di Indonesia), balas JSON dengan:
- nama: nama baku Bahasa Indonesia, huruf kapital di awal tiap kata, perbaiki typo bila ada
- deskripsi: satu kalimat singkat, MAKSIMAL 14 kata, hanya hal umum yang pasti tentang makanan itu (jangan menebak bahan khusus)
- kkal: SATU angka energi dalam kkal per 100 gram sajian matang (bukan rentang); rujuk Tabel Komposisi Pangan Indonesia (TKPI) bila ada
Jika input bukan makanan atau minuman, isi kkal dengan 0.`;

function mock(name: string): AIFood {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const nama = clean(name).replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return { nama, deskripsi: `Contoh deskripsi singkat untuk ${nama} (mode coba).`, kkal: 60 + (h % 300) };
}

export async function askGemini(name: string): Promise<AIFood> {
  if (process.env.MOCK_BACKEND === "1") return mock(name);
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY belum diisi");
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: ctl.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt(name) }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: { nama: { type: "STRING" }, deskripsi: { type: "STRING" }, kkal: { type: "NUMBER" } },
            required: ["nama", "deskripsi", "kkal"],
          },
        },
      }),
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 160)}`);
    const j = await r.json();
    const txt: string = (j.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
    const o = JSON.parse(txt.replace(/^```(?:json)?|```$/g, "").trim());
    const kkal = Number(o.kkal);
    if (!Number.isFinite(kkal) || kkal <= 0 || kkal > 950) throw new Error("Tidak dikenali sebagai makanan atau minuman");
    const nama = clean(String(o.nama || name)).slice(0, 60);
    const deskripsi = clean(String(o.deskripsi || "")).split(" ").slice(0, 14).join(" ");
    return { nama: nama || clean(name), deskripsi, kkal: Math.round(kkal * 10) / 10 };
  } finally {
    clearTimeout(to);
  }
}
