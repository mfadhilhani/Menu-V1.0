import { NextRequest, NextResponse } from "next/server";
import { anyPin, DEFAULT_SITE_ID, siteById, siteConfig, SiteConfigError, STANDARD, type Site, type SiteConfig } from "./site";
import { AuthConfigError, authSecret, COOKIE, readToken } from "./token";

export { COOKIE } from "./token";
export const isMock = () => process.env.MOCK_BACKEND === "1";

type Ctx = { cfg: SiteConfig; secret: string };
type Fail = { error: NextResponse };
const serverError = (msg: string) => NextResponse.json({ error: msg }, { status: 500 });

// Konfigurasi dibaca ulang tiap permintaan (murah), jadi perubahan env langsung berlaku setelah restart/redeploy.
// Detail kesalahan SITE_PINS/SITE_CUSTOM hanya ditulis ke log server: pesannya bisa memuat nama site custom,
// yang tidak boleh terlihat oleh orang yang belum login.
export function authContext(): Ctx | Fail {
  try {
    return { cfg: siteConfig(), secret: authSecret() };
  } catch (e) {
    if (e instanceof SiteConfigError) {
      console.error("[auth] konfigurasi site tidak valid:", e.message);
      return { error: serverError("Konfigurasi site di server tidak valid (SITE_PINS / SITE_CUSTOM). Detailnya ada di log server.") };
    }
    if (e instanceof AuthConfigError) return { error: serverError(e.message) };
    throw e;
  }
}
// Mode coba lokal tanpa PIN sama sekali: terbuka, dianggap BCP.
export const openMock = (cfg: SiteConfig) => isMock() && !anyPin(cfg);

// Site milik permintaan ini, diambil dari cookie yang ditandatangani server (bukan dari isi permintaan).
export function session(req: NextRequest): { site: Site } | Fail {
  const c = authContext();
  if ("error" in c) return c;
  if (openMock(c.cfg)) return { site: STANDARD.find((s) => s.id === DEFAULT_SITE_ID) as Site };
  if (!anyPin(c.cfg)) return { error: serverError("PIN belum diisi di server. Isi SITE_PINS (atau APP_PIN untuk BCP) dan AUTH_SECRET di .env.local atau Environment Variables, lalu restart/redeploy.") };
  const info = readToken(c.secret, req.cookies.get(COOKIE)?.value, (id) => c.cfg.pins.get(id), { legacyPin: process.env.APP_PIN?.trim() });
  const site = info && siteById(c.cfg, info.siteId);
  return site ? { site } : { error: NextResponse.json({ error: "login" }, { status: 401 }) };
}
// Untuk route yang tidak bergantung site (katalog makanan bersama, video): cukup sudah login.
export function guard(req: NextRequest): NextResponse | null {
  const s = session(req);
  return "error" in s ? s.error : null;
}

// IP klien untuk batas percobaan PIN. X-Real-IP diisi proxy (Nginx/Vercel) dan menimpa kiriman klien;
// di X-Forwarded-For entri TERAKHIR yang ditambahkan proxy terdekat (entri pertama bisa dipalsukan klien).
// PENTING: ini hanya aman kalau aplikasi berada di belakang proxy yang menimpa header itu (Vercel, atau Nginx dengan
// `proxy_set_header X-Real-IP $remote_addr;`). Jangan buka port Node langsung ke internet.
export function clientIp(req: NextRequest) {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = (req.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return xff.at(-1) || "local";
}

// Pembatas sederhana (per instance server): PIN SALAH per IP dan panggilan AI per hari.
// Hanya percobaan gagal yang dihitung: semua HP di satu Wi-Fi site biasanya keluar lewat satu IP,
// jadi menghitung login yang berhasil akan mengunci orang yang PIN-nya benar.
const WINDOW = 600000, MAX_FAILS = 10;
const fails = new Map<string, { n: number; t: number }>();
const live = (ip: string, now: number) => { const r = fails.get(ip); return r && now - r.t <= WINDOW ? r : null; };
// false = IP ini sudah 10 kali salah dalam 10 menit terakhir.
export function pinAllowed(ip: string) {
  return (live(ip, Date.now())?.n ?? 0) < MAX_FAILS;
}
const MAX_KEYS = 5000;
export function pinFailed(ip: string) {
  const now = Date.now(), r = live(ip, now);
  if (r) { r.n++; return; }
  if (fails.size >= MAX_KEYS) {
    // Jangan tumbuh tanpa batas (mis. IP palsu yang terus berganti): buang yang kedaluwarsa, lalu yang paling lama.
    for (const [k, v] of fails) if (now - v.t > WINDOW) fails.delete(k);
    for (const k of fails.keys()) { if (fails.size < MAX_KEYS) break; fails.delete(k); }
  }
  fails.set(ip, { n: 1, t: now });
}
let ai = { day: "", n: 0 };
export function aiAllowed() {
  const day = new Date().toISOString().slice(0, 10), max = Number(process.env.AI_DAILY_LIMIT || 100);
  if (ai.day !== day) ai = { day, n: 0 };
  if (ai.n >= max) return false;
  ai.n++;
  return true;
}
// Kembalikan jatah kalau panggilan AI gagal sebelum menghasilkan jawaban (sibuk, kuota, atau belum diatur).
export function aiRefund() {
  if (ai.n > 0) ai.n--;
}
