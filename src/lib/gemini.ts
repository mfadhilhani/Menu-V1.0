// Panggilan Gemini (hanya dari server). Satu angka kkal per 100 g dan deskripsi maksimal 14 kata.
// Tahan gangguan: coba ulang, lalu pindah ke model cadangan kalau model utama sibuk (503) atau kena batas (429).
// Hemat dan cepat: tingkat berpikir diatur per model, hasil disimpan sebentar di memori server,
// permintaan nama yang sama digabung, dan model yang sedang bermasalah dilewati sementara.
import { clean, norm, typoOnly } from "./text";

export type AIFood = { nama: string; deskripsi: string; kkal: number };
export type AICode = "busy" | "quota" | "config" | "notfood" | "bad";
export class AIError extends Error {
  constructor(public code: AICode, public detail = "") { super(code); }
}
class HttpErr extends Error { constructor(public status: number, public body: string) { super(`Gemini ${status}`); } }

// Aturan tetap di system instruction; isi permintaan cukup nama makanannya.
const SYSTEM = `Kamu ahli gizi Indonesia. Kamu menerima nama makanan atau minuman (sajian matang/siap santap di katering atau kantin di Indonesia) dan membalas JSON:
- nama: tulis ulang nama yang diketik dengan huruf kapital di awal tiap kata. Tugasmu HANYA membetulkan typo (huruf yang salah ketik, kurang, lebih, atau tertukar).
  ATURAN WAJIB untuk nama:
  1. JANGAN menerjemahkan ke bahasa apa pun. Kata bahasa Inggris, Jepang, Korea, Thailand, Italia, Arab, dan lainnya tetap dalam bahasa aslinya.
  2. Merek dagang (Indomie, Pop Mie, McFlurry, KitKat, Milo, Yakult) dipertahankan; kalau ejaannya salah, betulkan sesuai penulisan resmi merek itu.
  3. Jumlah dan urutan kata tetap sama. Jangan menambah, menghapus, atau mengganti kata dengan sinonim.
  4. Variasi ejaan yang lazim bukan typo, biarkan (Sop/Sup, Mie/Mi, Cabe/Cabai, Sambel/Sambal, Krupuk/Kerupuk).
  5. Kalau sudah benar atau kamu ragu itu typo, kembalikan persis seperti yang diketik.
  Contoh: "Chiken Katsu" -> "Chicken Katsu" (BUKAN "Ayam Katsu"); "Fried Rice Special" -> "Fried Rice Special" (BUKAN "Nasi Goreng Spesial");
  "Beef Teriyaky Bowl" -> "Beef Teriyaki Bowl"; "Indomi Goreng" -> "Indomie Goreng"; "Ice Lemon Tea" -> "Ice Lemon Tea" (BUKAN "Es Teh Lemon");
  "Ayam Bakar Madu" -> "Ayam Bakar Madu" (BUKAN "Honey Grilled Chicken"); "Sop Buntut" -> "Sop Buntut"; "Rendng Sapi" -> "Rendang Sapi".
- deskripsi: satu kalimat singkat dalam bahasa Indonesia, MAKSIMAL 14 kata, hanya hal umum yang pasti tentang makanan itu (jangan menebak bahan khusus).
- kkal: SATU angka energi dalam kkal per 100 gram sajian matang (bukan rentang); rujuk Tabel Komposisi Pangan Indonesia (TKPI) bila ada.
Jika input bukan makanan atau minuman, isi kkal dengan 0. Jawab langsung tanpa penjelasan.`;
const SCHEMA = { type: "OBJECT", properties: { nama: { type: "STRING" }, deskripsi: { type: "STRING" }, kkal: { type: "NUMBER" } }, required: ["nama", "deskripsi", "kkal"] };

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

// Tingkat berpikir per model (dokumentasi "Gemini thinking", diperbarui 14 Okt 2026). Tugas ini sederhana,
// jadi dipakai tingkat serendah mungkin: lebih cepat dan token berpikir (ditagih seperti output) jauh lebih sedikit.
// - Flash-Lite 3.x dan Flash 3 / 3.6: "minimal" (pada 3.6 Flash default-nya "medium").
// - Flash 3.8 dan Gemini 4: "minimal" ditolak (error), jadi "low".
// - Model lain: tidak diatur, supaya tidak memicu error 400.
export function thinkingFor(model: string): string | undefined {
  const m = model.toLowerCase();
  if (/^gemini-3(\.\d+)?-flash-lite/.test(m)) return "minimal";
  if (/^gemini-3\.8-flash/.test(m) || /^gemini-4/.test(m)) return "low";
  if (/^gemini-3(\.[0-6])?-flash/.test(m)) return "minimal";
  return undefined;
}

// Status model per instance server: model yang tidak ada (404) dilewati 6 jam, yang kena batas (429) 60 detik.
const g = globalThis as unknown as {
  __aiSkip?: Map<string, number>;
  __aiCache?: Map<string, { at: number; food: AIFood }>;
  __aiWait?: Map<string, Promise<AIFood>>;
};
const skip = (g.__aiSkip ??= new Map());
const cache = (g.__aiCache ??= new Map());
const waiting = (g.__aiWait ??= new Map());
const CACHE_MS = 15 * 60000;
const skipped = (m: string) => (skip.get(m) ?? 0) > Date.now();

async function once(model: string, name: string, key: string, ms: number, known: Set<string>, useThinking: boolean): Promise<AIFood> {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms);
  const t0 = Date.now();
  const level = useThinking ? thinkingFor(model) : undefined;
  try {
    const generationConfig: Record<string, unknown> = { responseMimeType: "application/json", responseSchema: SCHEMA };
    if (level) generationConfig.thinkingConfig = { thinkingLevel: level };
    // Gemini 3 ke atas: suhu dibiarkan bawaan (1.0) sesuai saran Google; suhu rendah bisa membuat jawaban berulang/menurun.
    if (!/^gemini-[3-9]/.test(model)) generationConfig.temperature = 0.1;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: ctl.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: `Nama yang diketik: "${name}"` }] }],
        generationConfig,
      }),
    });
    if (!r.ok) throw new HttpErr(r.status, (await r.text()).slice(0, 300));
    const j = await r.json();
    const parts: { text?: string; thought?: boolean }[] = j.candidates?.[0]?.content?.parts || [];
    const txt = parts.filter((p) => !p.thought).map((p) => p.text || "").join("");
    const u = j.usageMetadata || {};
    console.info(`[gemini] ${model} ${Date.now() - t0} ms, thinking=${level ?? "-"}, token in/berpikir/out=${u.promptTokenCount ?? "?"}/${u.thoughtsTokenCount ?? 0}/${u.candidatesTokenCount ?? "?"}`);
    const o = JSON.parse(txt.replace(/^```(?:json)?|```$/g, "").trim());
    const kkal = Number(o.kkal);
    if (!Number.isFinite(kkal) || kkal < 0 || kkal > 950) throw new AIError("bad", "kkal di luar batas");
    if (kkal === 0) throw new AIError("notfood");
    // Pengaman: dari usulan AI hanya perbaikan typo per kata yang dipakai. Terjemahan, kata pengganti,
    // atau kata tambahan ditolak dan kata yang diketik dipertahankan (lihat typoOnly di text.ts).
    const gd = typoOnly(name, String(o.nama || "").slice(0, 80), known);
    if (gd.rejected.length) console.info("[gemini] koreksi nama ditolak:", name, "|", gd.rejected.join(", "));
    const nama = gd.nama.slice(0, 60);
    return { nama, deskripsi: clean(String(o.deskripsi || "")).split(" ").slice(0, 14).join(" "), kkal: Math.round(kkal * 10) / 10 };
  } finally {
    clearTimeout(to);
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TRANSIENT = new Set([429, 500, 502, 503, 504]);

async function run(name: string, key: string, known: Set<string>): Promise<AIFood> {
  const deadline = Date.now() + 24000;
  let last: AIError = new AIError("busy");
  const chain = modelChain();
  // Kalau semua model sedang dilewati, tetap coba semuanya (lebih baik daripada langsung gagal).
  const order = chain.every(skipped) ? chain : chain.filter((m) => !skipped(m));
  for (const model of order) {
    let useThinking = true;
    for (let a = 0; a < 3; a++) {
      const left = deadline - Date.now();
      if (left < 2500) throw last;
      try {
        return await once(model, name, key, Math.min(9000, left), known, useThinking);
      } catch (e) {
        if (e instanceof AIError && e.code === "notfood") throw e;
        if (e instanceof HttpErr) {
          const detail = `${model}: HTTP ${e.status} ${e.body}`;
          console.error("[gemini]", detail);
          // Pengaturan berpikir ditolak model ini: ulangi sekali tanpa pengaturan itu.
          if (e.status === 400 && useThinking && /thinking/i.test(e.body)) { useThinking = false; continue; }
          last = new AIError(e.status === 429 ? "quota" : TRANSIENT.has(e.status) ? "busy" : e.status === 401 || e.status === 403 ? "config" : "bad", detail);
          if (e.status === 401 || e.status === 403) throw last;     // key salah/dibatasi: model lain tidak menolong
          if (e.status === 404) skip.set(model, Date.now() + 6 * 3600000);
          if (e.status === 429) skip.set(model, Date.now() + 60000);
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

// Hasil AI yang masih tersimpan di memori server (dipakai sebelum memotong jatah AI harian).
export function cachedAI(name: string): AIFood | null {
  const k = norm(name), c = cache.get(k);
  if (c && Date.now() - c.at < CACHE_MS) return c.food;
  if (c) cache.delete(k);
  return null;
}

// known: kata-kata yang sudah ada di Sheet (dianggap ejaan benar, tidak diubah AI).
export async function askGemini(name: string, known: Set<string> = new Set()): Promise<AIFood> {
  if (process.env.MOCK_BACKEND === "1") return mock(name);
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AIError("config", "GEMINI_API_KEY belum diisi");
  const k = norm(name);
  const hit = cachedAI(name);
  if (hit) return hit;
  // Nama yang sama sedang ditanyakan (mis. dua kolom selesai diketik bersamaan): tunggu jawaban yang sama.
  const w = waiting.get(k);
  if (w) return w;
  const p = run(name, key, known)
    .then((food) => {
      cache.set(k, { at: Date.now(), food });
      if (cache.size > 300) cache.delete(cache.keys().next().value as string);
      return food;
    })
    .finally(() => waiting.delete(k));
  waiting.set(k, p);
  return p;
}
