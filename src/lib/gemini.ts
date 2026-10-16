// Panggilan Gemini (hanya dari server). Satu angka kkal per 100 g dan deskripsi maksimal 14 kata.
// Tahan gangguan: coba ulang, lalu pindah ke model cadangan kalau model utama sibuk (503) atau kena batas (429).
import { clean } from "./text";

export type AIFood = { nama: string; deskripsi: string; kkal: number };
export type AICode = "busy" | "quota" | "config" | "notfood" | "bad";
export class AIError extends Error {
  constructor(public code: AICode, public detail = "") { super(code); }
}
class HttpErr extends Error { constructor(public status: number, public body: string) { super(`Gemini ${status}`); } }

const prompt = (name: string) =>
  `Kamu ahli gizi Indonesia. Untuk makanan atau minuman bernama "${name}" (sajian matang/siap santap di katering atau kantin di Indonesia), balas JSON dengan:
- nama: nama baku Bahasa Indonesia, huruf kapital di awal tiap kata, perbaiki typo bila ada
- deskripsi: satu kalimat singkat, MAKSIMAL 14 kata, hanya hal umum yang pasti tentang makanan itu (jangan menebak bahan khusus)
- kkal: SATU angka energi dalam kkal per 100 gram sajian matang (bukan rentang); rujuk Tabel Komposisi Pangan Indonesia (TKPI) bila ada
Jika input bukan makanan atau minuman, isi kkal dengan 0.`;

function mock(name: string): AIFood {
  if (process.env.MOCK_AI_FAIL) throw new AIError(process.env.MOCK_AI_FAIL as AICode, "mode coba");
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const nama = clean(name).replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return { nama, deskripsi: `Contoh deskripsi singkat untuk ${nama} (mode coba).`, kkal: 60 + (h % 300) };
}

// Model utama lalu cadangan (semua punya tier gratis menurut halaman harga Gemini per 15 Okt 2026).
// Model 2.5 dijadwalkan dimatikan 16 Oktober 2026, jadi tidak dipakai.
export const modelChain = () =>
  [process.env.GEMINI_MODEL || "gemini-3.1-flash-lite", ...(process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.8-flash").split(",")]
    .map((s) => s.trim()).filter((m, i, a) => m && a.indexOf(m) === i);

async function once(model: string, name: string, key: string, ms: number): Promise<AIFood> {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms);
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
          responseSchema: { type: "OBJECT", properties: { nama: { type: "STRING" }, deskripsi: { type: "STRING" }, kkal: { type: "NUMBER" } }, required: ["nama", "deskripsi", "kkal"] },
        },
      }),
    });
    if (!r.ok) throw new HttpErr(r.status, (await r.text()).slice(0, 200));
    const j = await r.json();
    const txt: string = (j.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
    const o = JSON.parse(txt.replace(/^```(?:json)?|```$/g, "").trim());
    const kkal = Number(o.kkal);
    if (!Number.isFinite(kkal) || kkal < 0 || kkal > 950) throw new AIError("bad", "kkal di luar batas");
    if (kkal === 0) throw new AIError("notfood");
    const nama = clean(String(o.nama || name)).slice(0, 60) || clean(name);
    return { nama, deskripsi: clean(String(o.deskripsi || "")).split(" ").slice(0, 14).join(" "), kkal: Math.round(kkal * 10) / 10 };
  } finally {
    clearTimeout(to);
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TRANSIENT = new Set([429, 500, 502, 503, 504]);

export async function askGemini(name: string): Promise<AIFood> {
  if (process.env.MOCK_BACKEND === "1") return mock(name);
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AIError("config", "GEMINI_API_KEY belum diisi");
  const deadline = Date.now() + 24000;
  let last: AIError = new AIError("busy");
  for (const model of modelChain()) {
    for (let a = 0; a < 2; a++) {
      const left = deadline - Date.now();
      if (left < 2500) throw last;
      try {
        return await once(model, name, key, Math.min(9000, left));
      } catch (e) {
        if (e instanceof AIError && e.code === "notfood") throw e;
        if (e instanceof HttpErr) {
          const detail = `${model}: HTTP ${e.status} ${e.body}`;
          console.error("[gemini]", detail);
          last = new AIError(e.status === 429 ? "quota" : TRANSIENT.has(e.status) ? "busy" : e.status === 401 || e.status === 403 ? "config" : "bad", detail);
          if (e.status === 401 || e.status === 403) throw last;     // key salah/dibatasi: model lain tidak menolong
          if (TRANSIENT.has(e.status) && a === 0 && e.status !== 429) { await sleep(1200); continue; } // sekali coba ulang untuk lonjakan sementara
          break;                                                    // 404/400/429: langsung model berikutnya
        }
        console.error("[gemini]", model, e instanceof Error ? e.message : e);
        last = e instanceof AIError ? e : new AIError("busy", `${model}: ${e instanceof Error ? e.message : "gagal"}`);
        break;
      }
    }
  }
  throw last;
}
