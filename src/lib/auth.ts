import { NextRequest, NextResponse } from "next/server";
import { anyPin, DEFAULT_SITE_ID, siteById, siteConfig, SiteConfigError, STANDARD, type Site, type SiteConfig } from "./site";
import { AuthConfigError, authSecret, COOKIE, readToken } from "./token";

export { COOKIE } from "./token";
export const isMock = () => process.env.MOCK_BACKEND === "1";

type Ctx = { cfg: SiteConfig; secret: string };
type Fail = { error: NextResponse };
const serverError = (msg: string) => NextResponse.json({ error: msg }, { status: 500 });

// Konfigurasi dibaca ulang tiap permintaan (murah), jadi perubahan env langsung berlaku setelah restart/redeploy.
export function authContext(): Ctx | Fail {
  try {
    return { cfg: siteConfig(), secret: authSecret() };
  } catch (e) {
    if (e instanceof SiteConfigError || e instanceof AuthConfigError) return { error: serverError(e.message) };
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
  const info = readToken(c.secret, req.cookies.get(COOKIE)?.value, (id) => c.cfg.pins.get(id));
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
export function clientIp(req: NextRequest) {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = (req.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return xff.at(-1) || "local";
}

// Pembatas sederhana (per instance server): percobaan PIN dan panggilan AI per hari.
const WINDOW = 600000, MAX_TRIES = 10;
const tries = new Map<string, { n: number; t: number }>();
export function pinTries(ip: string) {
  const now = Date.now(), r = tries.get(ip);
  if (tries.size > 5000) for (const [k, v] of tries) if (now - v.t > WINDOW) tries.delete(k); // jangan tumbuh tanpa batas
  if (!r || now - r.t > WINDOW) { tries.set(ip, { n: 1, t: now }); return true; }
  r.n++;
  return r.n <= MAX_TRIES;
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
