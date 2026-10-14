import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const COOKIE = "tf_auth";
const secret = () => process.env.AUTH_SECRET || process.env.APP_PIN || "dev-secret";
export const isMock = () => process.env.MOCK_BACKEND === "1";

const sign = (exp: number) => createHmac("sha256", secret()).update(String(exp)).digest("hex");
export function makeToken(days = 30) {
  const exp = Date.now() + days * 86400000;
  return `${exp}.${sign(exp)}`;
}
function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function tokenOk(tok?: string) {
  if (!tok) return false;
  const [e, s] = tok.split(".");
  const exp = Number(e);
  return !!s && Number.isFinite(exp) && exp > Date.now() && same(s, sign(exp));
}
export function pinOk(pin: string) {
  const p = process.env.APP_PIN || "";
  return !!p && same(pin, p);
}
// Dipakai di setiap route yang menyentuh Sheet atau AI.
export function guard(req: NextRequest): NextResponse | null {
  if (isMock() && !process.env.APP_PIN) return null; // mode coba lokal
  if (!process.env.APP_PIN) return NextResponse.json({ error: "APP_PIN belum diisi di server" }, { status: 500 });
  return tokenOk(req.cookies.get(COOKIE)?.value) ? null : NextResponse.json({ error: "login" }, { status: 401 });
}

// Pembatas sederhana (per instance server): percobaan PIN dan panggilan AI per hari.
const tries = new Map<string, { n: number; t: number }>();
export function pinTries(ip: string) {
  const now = Date.now(), r = tries.get(ip);
  if (!r || now - r.t > 600000) { tries.set(ip, { n: 1, t: now }); return true; }
  r.n++;
  return r.n <= 10;
}
let ai = { day: "", n: 0 };
export function aiAllowed() {
  const day = new Date().toISOString().slice(0, 10), max = Number(process.env.AI_DAILY_LIMIT || 100);
  if (ai.day !== day) ai = { day, n: 0 };
  if (ai.n >= max) return false;
  ai.n++;
  return true;
}
