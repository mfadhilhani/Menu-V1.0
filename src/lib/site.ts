// Identitas site: SATU sumber untuk nama site di laporan, poster, kolase, dan video.
// Dipakai di server (login, isolasi data) dan di browser (tampilan). Tidak boleh mengimpor apa pun dari Next.js.
//
// Site standar tetap di kode. Site aktif kalau punya PIN:
//   SITE_PINS   = {"bcp":"1234","dps":"5678","kintap":"9012"}   (APP_PIN lama dipakai untuk BCP kalau bcp tidak diisi)
//   SITE_CUSTOM = [{"nama":"Site Tambang ABC","pin":"4321","laporan":"ABC","camp":"Camp Utama"}]
// Site custom ditemukan lewat nama yang diketik saat login (huruf besar kecil dan awalan "Site" diabaikan).

export type SiteJenis = "standar" | "custom";
export type Site = {
  id: string;        // "bcp" | "dps" | "kintap" | "c-<slug>"; dipakai sebagai kunci penyimpanan
  nama: string;      // nama tampilan, mis. "BCP", "Kintap Project", "Site Tambang ABC"
  jenis: SiteJenis;
  laporan: string;   // isian bawaan "Kode site laporan" di laporan kalori
  camp: string;      // isian bawaan "Camp" di laporan kalori
};
export type SitePublic = Pick<Site, "id" | "nama" | "jenis">;

export const STANDARD: readonly Site[] = Object.freeze([
  { id: "bcp", nama: "BCP", jenis: "standar", laporan: "DH BCP", camp: "Camp Pelangi" },
  { id: "dps", nama: "DPS", jenis: "standar", laporan: "DH DPS", camp: "" },
  { id: "kintap", nama: "Kintap Project", jenis: "standar", laporan: "DH Kintap", camp: "" },
]);
export const DEFAULT_SITE_ID = "bcp";

// Hanya huruf ASCII, angka, dan tanda hubung: id dipakai sebagai nilai header X-Site, kunci penyimpanan, dan nama tab
// Sheet. Huruf beraksen dibuang aksennya ("Ōmura" -> "omura").
export const slug = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "");
const stripSite = (s: string) => s.trim().replace(/^site\b[\s\-_]*/i, "");
// Nama tanpa huruf Latin sama sekali (mis. aksara lain) tetap dapat id stabil dari hash namanya.
const fnv = (s: string) => { let h = 0x811c9dc5; for (const c of s) { h ^= c.codePointAt(0) as number; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const customId = (nama: string) => {
  const base = stripSite(nama).normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  return base ? "c-" + (slug(base) || "x" + fnv(base)) : "c-";
};

// "BCP" -> "Site BCP"; "Site Tambang ABC" tetap (tidak jadi "Site Site Tambang ABC").
export function siteLabel(nama: string, kata = "Site") {
  const n = nama.trim().replace(/\s+/g, " ");
  if (!n) return "";
  return /^site\b/i.test(n) ? n : `${kata} ${n}`;
}

export class SiteConfigError extends Error {}
export type SiteConfig = { pins: Map<string, string>; custom: Site[] };
type Env = Record<string, string | undefined>;

function parseJson(name: string, raw: string): unknown {
  try { return JSON.parse(raw); } catch { throw new SiteConfigError(`${name} bukan JSON yang valid`); }
}
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Membaca konfigurasi site dari environment. Konfigurasi rusak menghasilkan error (gagal tertutup), tidak diabaikan.
export function siteConfig(env: Env = process.env): SiteConfig {
  const pins = new Map<string, string>();
  if (env.SITE_PINS?.trim()) {
    const o = parseJson("SITE_PINS", env.SITE_PINS);
    if (!o || typeof o !== "object" || Array.isArray(o)) throw new SiteConfigError("SITE_PINS harus berupa objek {\"bcp\":\"PIN\"}");
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (!STANDARD.some((s) => s.id === k)) throw new SiteConfigError(`SITE_PINS: site "${k}" tidak dikenal (pakai bcp, dps, kintap; site lain lewat SITE_CUSTOM)`);
      if (str(v)) pins.set(k, str(v));
    }
  }
  if (!pins.has("bcp") && str(env.APP_PIN)) pins.set("bcp", str(env.APP_PIN));
  const custom: Site[] = [];
  if (env.SITE_CUSTOM?.trim()) {
    const a = parseJson("SITE_CUSTOM", env.SITE_CUSTOM);
    if (!Array.isArray(a)) throw new SiteConfigError("SITE_CUSTOM harus berupa daftar [{\"nama\":\"...\",\"pin\":\"...\"}]");
    for (const it of a as Record<string, unknown>[]) {
      const nama = str(it?.nama).replace(/\s+/g, " ").slice(0, 60), pin = str(it?.pin);
      const id = customId(nama);
      if (!nama || id === "c-" || !pin) throw new SiteConfigError("SITE_CUSTOM: tiap site wajib punya nama dan pin");
      if (pins.has(id) || custom.some((c) => c.id === id)) throw new SiteConfigError(`SITE_CUSTOM: nama "${nama}" bentrok dengan site lain`);
      custom.push({ id, nama, jenis: "custom", laporan: str(it.laporan) || nama, camp: str(it.camp) });
      pins.set(id, pin);
    }
  }
  return { pins, custom };
}

export const pinFor = (c: SiteConfig, id: string) => c.pins.get(id);
export const anyPin = (c: SiteConfig) => c.pins.size > 0;
export const enabledStandard = (c: SiteConfig) => STANDARD.filter((s) => c.pins.has(s.id));
// Site aktif menurut id (dipakai saat membaca token).
export function siteById(c: SiteConfig, id: string): Site | null {
  if (!c.pins.has(id)) return null;
  return STANDARD.find((s) => s.id === id) ?? c.custom.find((s) => s.id === id) ?? null;
}
// Site yang dipilih saat login: site standar lewat id, site custom hanya lewat nama.
export function findSite(c: SiteConfig, q: { id?: string; nama?: string }): Site | null {
  if (q.nama !== undefined) return c.custom.find((s) => s.id === customId(q.nama as string)) ?? null;
  const std = STANDARD.find((s) => s.id === q.id);
  return std && c.pins.has(std.id) ? std : null;
}
export const toPublic = (s: Site): SitePublic => ({ id: s.id, nama: s.nama, jenis: s.jenis });
