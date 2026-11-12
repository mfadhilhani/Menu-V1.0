// Penyusun teks laporan (port dari versi HTML).
import { dateParts, fmt, icon, num, pad, siteKeyOf, toTitle } from "./text";

// k = keterangan bebas (format lama, mis. "Ok"); sc = nilai 1-5 (format baru, bawaan 5).
export type TF = { id: string; n: string; k: string; sc?: number; sid?: string };
export type KR = { id: string; n: string; kkal: string; gram: string; ic?: string; sid?: string; pf?: boolean };
export type Slot = { id: string; n: string; kkal: string; desc: string; sid?: string };
export type MealKey = "Breakfast" | "Lunch" | "Dinner" | "Supper";
export type MealData = { menu: TF[]; snack: TF[]; buah: TF[]; rows: KR[]; slots: Slot[] };
export type Origin = "menu" | "snack" | "buah" | "rows" | "slots";
export type FoodLite = { nama: string; kkal: number | null; deskripsi: string; ikon: string };
// Sinkronisasi baris yang sid-nya sama (nama, kalori, dan data dari Sheet) di semua daftar pada waktu makan yang sedang dipilih.
export type Sync = {
  name: (origin: Origin, sid: string, v: string) => void;
  food: (sid: string, f: FoodLite) => void;
  kkal: (sid: string, v: string) => void;
};
export type State = {
  tab: "tf" | "kal" | "his";
  pukul: boolean; jam: string; zona: string;
  mealAuto: boolean; jn: string; live: boolean; liveMenu: string; dt: string; meal: string; site: string; sxi: string; ks: string;
  ksite: string; camp: string; rule: boolean;
  tfFmt: 1 | 2;                       // format laporan Test Food: 2 = nilai 1-5 (bawaan), 1 = keterangan bebas (lama)
  md: Record<MealKey, MealData>;
};
// Bagian isian yang disinkronkan per site. Tab yang dibuka dan pilihan site milik perangkat masing-masing.
export const synced = (s: State) => {
  const { tab, site, sxi, ...rest } = s;
  void tab; void site; void sxi;
  return rest;
};
export const DEFAULT_SITE = "BCP";
export const KS = { 1: "Makanan dalam kondisi layak untuk dikonsumsi", 2: "Makanan layak untuk dikonsumsi" } as const;
export const SKOR: [number, string][] = [[5, "Baik Sekali"], [4, "Baik"], [3, "Cukup"], [2, "Kurang"], [1, "Sangat Kurang"]];
export const skorOf = (r: TF) => (r.sc && r.sc >= 1 && r.sc <= 5 ? Math.round(r.sc) : 5);
export const cur = (s: State): MealData => s.md[s.meal as MealKey] ?? s.md.Breakfast;
export const LIMIT = 1800;
const EXC = /sambal|sambel|kerupuk|krupuk/i;

export const siteName = (s: State) => (s.site === "__x" ? s.sxi.trim() || "-" : s.site);
// Kunci site ("" kalau site Lainnya belum diberi nama). Site bawaan (BCP) memakai desain poster asli.
export const siteKey = (s: Pick<State, "site" | "sxi">) => siteKeyOf(s.site === "__x" ? s.sxi : s.site);
export const isDefaultSite = (s: Pick<State, "site" | "sxi">) => siteKey(s) === siteKeyOf(DEFAULT_SITE);
// Baris Live Cooking: hanya untuk Dinner (kosong kalau bukan Dinner, tidak dicentang, atau belum diisi).
const liveText = (s: State) => (s.meal === "Dinner" && s.live && s.liveMenu.trim() ? toTitle(s.liveMenu) : "");
// Baris "Pukul" (hanya kalau dicentang dan jamnya valid), format "10.34 WITA".
const pukulText = (s: State) => (s.pukul && /^\d{1,2}:\d{2}$/.test(s.jam) ? `${s.jam.replace(":", ".")} ${s.zona}` : "");
const dateText = (s: State, baku = false) => { const p = dateParts(s.dt, baku); return `${p.hari}, ${pad(p.d)} ${p.m} ${p.y}`; };

// Format lama: "1. Nasi Putih: Ok"
function lines(arr: TF[], always: boolean) {
  const a = arr.filter((i) => i.n.trim());
  return a.map((i, x) => (always || a.length > 1 ? `${x + 1}. ` : "") + toTitle(i.n) + ": " + i.k.trim()).join("\n");
}
// Format baru: "1. Nasi Putih : 5"
function lines2(arr: TF[], always: boolean) {
  const a = arr.filter((i) => i.n.trim());
  return a.map((i, x) => (always || a.length > 1 ? `${x + 1}. ` : "") + toTitle(i.n) + " : " + skorOf(i)).join("\n");
}
function extras(s: State, fn: (arr: TF[], always: boolean) => string) {
  if (s.meal !== "Dinner") return "";
  let t = "";
  ([["Snack", cur(s).snack], ["Buah", cur(s).buah]] as [string, TF[]][]).forEach(([h, arr]) => {
    const l = fn(arr, false);
    if (l) t += `\n\n*${h}*\n${l}`;
  });
  return t;
}
function testFoodV1(s: State) {
  const live = liveText(s);
  const t = `*${("Test Food Menu " + s.jn.trim()).trim()}*\n${live ? `*Live Cooking : ${live}*\n` : ""}*${dateText(s)}*${pukulText(s) ? `\n*Pukul : ${pukulText(s)}*` : ""}\n\n*Menu ${s.meal} Site ${siteName(s)}*\n${lines(cur(s).menu, true)}`;
  return `${t}${extras(s, lines)}\n\n*Kesimpulan :*\n${s.ks.trim()}`;
}
// Format baru (bawaan): nilai 1-5 per menu, keterangan nilai, lalu kesimpulan satu baris.
// Jenis menu hanya ditulis di judul kalau bukan "Reguler" (contoh format dari pengguna: "*Test Food Menu*").
function testFoodV2(s: State) {
  const live = liveText(s), jn = s.jn.trim();
  const judul = "Test Food Menu" + (jn && jn.toLowerCase() !== "reguler" ? ` ${jn}` : "");
  const t = `*${judul}*\n${live ? `*Live Cooking : ${live}*\n` : ""}*${dateText(s, true)}*${pukulText(s) ? `\n*Pukul : ${pukulText(s)}*` : ""}\n\n*Menu ${s.meal} Site ${siteName(s)}*\n${lines2(cur(s).menu, true)}`;
  const ket = "Ket:\n" + SKOR.map(([n, l]) => `* ${n} : ${l}`).join("\n");
  return `${t}${extras(s, lines2)}\n\n${ket}\n\nKesimpulan : ${s.ks.trim()}`;
}
export const testFoodReport = (s: State) => (s.tfFmt === 1 ? testFoodV1(s) : testFoodV2(s));
// Menu yang nilainya 2 ke bawah (format baru), untuk mengingatkan supaya kesimpulan diperiksa.
export function lowScores(s: State) {
  if (s.tfFmt === 1) return [];
  const d = cur(s), all = [...d.menu, ...(s.meal === "Dinner" ? [...d.snack, ...d.buah] : [])];
  return all.filter((r) => r.n.trim() && skorOf(r) <= 2).map((r) => toTitle(r.n));
}

export function kaloriInfo(s: State) {
  const rows = cur(s).rows.filter((r) => r.n.trim()).map((r) => ({ ...r, kv: num(r.kkal), gv: num(r.gram) ?? 100 }));
  const all = rows.reduce((a, r) => a + (r.kv != null ? (r.kv * r.gv) / 100 : 0), 0);
  const skip = s.rule && all >= LIMIT;
  const tot = rows.reduce((a, r) => a + (r.kv != null && !(skip && EXC.test(r.n)) ? (r.kv * r.gv) / 100 : 0), 0);
  return { rows, all, tot, skip };
}
export function kaloriReport(s: State) {
  const { rows, tot } = kaloriInfo(s);
  const p = dateParts(s.dt);
  const L = [`🍽️ Menu ${s.meal} ${s.ksite} 🍽️`, `✨ ${p.hari} ${pad(p.d)} ${p.m} ${p.y} ✨`, ...(s.camp.trim() ? [`🌈 ${s.camp.trim()} 🌈`] : []), `💫 Menu ${s.jn.trim()} 💫`, ...(liveText(s) ? [`👩‍🍳 Live Cooking : ${liveText(s)} 👩‍🍳`] : []), "", "🍽️Kalori Persaji 100 gram🍽️", ""];
  rows.forEach((r) => {
    const e = r.ic || icon(r.n) || "🍽️", nm = toTitle(r.n);
    if (r.kv == null) { L.push(`${e} ${nm}`, ""); return; }
    const sub = (r.kv * r.gv) / 100;
    L.push(r.gv === 100 ? `${e} ${nm} (${fmt(r.kv)} kkal)` : `${e} ${nm} (${fmt(r.kv)} kkal/100 g) – porsi ${fmt(r.gv)} g = ${fmt(sub)} kkal`, "");
  });
  L.push(`Total Kalori = ${fmt(tot)}kkal`, "", "🌹Selamat Menikmati 🌹");
  return L.join("\n");
}
export function warnaMessage(s: State) {
  const p = dateParts(s.dt);
  return `Kode warna makanan ${s.meal} site ${siteName(s)}\n${p.hari}, ${pad(p.d)} ${p.m} ${p.y}`;
}
