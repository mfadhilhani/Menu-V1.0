// Token login (isi cookie). Tidak mengimpor Next.js supaya bisa diuji langsung.
// Format V2: v2.<siteId>.<versiKunci>.<kedaluwarsa>.<tanda tangan>
// - versiKunci diturunkan dari PIN site: mengganti PIN site mencabut semua token site itu (site lain tidak terpengaruh).
// - Token V1 (<kedaluwarsa>.<tanda tangan>) dari versi sebelumnya tetap diterima sebagai BCP sampai kedaluwarsa,
//   supaya pengguna lama tidak harus login ulang saat pembaruan. Untuk mencabutnya, ganti AUTH_SECRET.
import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "tf_auth";
export const TOKEN_DAYS = 30;
export class AuthConfigError extends Error {}
type Env = Record<string, string | undefined>;

let warned = false;
export function authSecret(env: Env = process.env): string {
  const s = env.AUTH_SECRET || "";
  if (s) {
    if (s.length < 32 && !warned) { warned = true; console.warn("[auth] AUTH_SECRET sebaiknya minimal 32 karakter acak"); }
    return s;
  }
  if (env.MOCK_BACKEND === "1") return "mock-secret-bukan-untuk-produksi";
  if (env.NODE_ENV === "production") throw new AuthConfigError("AUTH_SECRET belum diisi di server. Isi dengan teks acak minimal 32 karakter, lalu redeploy/restart.");
  return "dev-secret-bukan-untuk-produksi";
}

const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");
export function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
const keyVersion = (secret: string, siteId: string, pin: string) => hmac(secret, `kv:${siteId}:${pin}`).slice(0, 12);

export function makeToken(secret: string, siteId: string, pin: string, days = TOKEN_DAYS, now = Date.now()) {
  const body = `v2.${siteId}.${keyVersion(secret, siteId, pin)}.${now + days * 86400000}`;
  return `${body}.${hmac(secret, body)}`;
}

export type TokenInfo = { siteId: string; legacy: boolean };
// pinOf: PIN site yang sedang berlaku (undefined = site tidak aktif).
export function readToken(secret: string, tok: string | undefined, pinOf: (id: string) => string | undefined, now = Date.now()): TokenInfo | null {
  if (!tok) return null;
  const p = tok.split(".");
  if (p.length === 5 && p[0] === "v2") {
    const [, id, kv, e, sig] = p, exp = Number(e);
    if (!id || !Number.isFinite(exp) || exp <= now) return null;
    if (!same(sig, hmac(secret, p.slice(0, 4).join(".")))) return null;
    const pin = pinOf(id);
    if (!pin || !same(kv, keyVersion(secret, id, pin))) return null;
    return { siteId: id, legacy: false };
  }
  if (p.length === 2) {
    const exp = Number(p[0]);
    if (!Number.isFinite(exp) || exp <= now || !same(p[1], hmac(secret, String(exp)))) return null;
    return pinOf("bcp") ? { siteId: "bcp", legacy: true } : null;
  }
  return null;
}
