// Penyusun teks laporan (port dari versi HTML).
import { dateParts, fmt, icon, num, pad, toTitle } from "./text";

export type TF = { id: string; n: string; k: string; sid?: string };
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
  md: Record<MealKey, MealData>;
};
export const cur = (s: State): MealData => s.md[s.meal as MealKey] ?? s.md.Breakfast;
export const LIMIT = 1800;
const EXC = /sambal|sambel|kerupuk|krupuk/i;

export const siteName = (s: State) => (s.site === "__x" ? s.sxi.trim() || "-" : s.site);
// Baris Live Cooking (kosong kalau tidak dicentang atau belum diisi).
const liveText = (s: State) => (s.live && s.liveMenu.trim() ? toTitle(s.liveMenu) : "");
// Baris "Pukul" (hanya kalau dicentang dan jamnya valid), format "10.34 WITA".
const pukulText = (s: State) => (s.pukul && /^\d{1,2}:\d{2}$/.test(s.jam) ? `${s.jam.replace(":", ".")} ${s.zona}` : "");
const dateText = (s: State) => { const p = dateParts(s.dt); return `${p.hari}, ${pad(p.d)} ${p.m} ${p.y}`; };

function lines(arr: TF[], always: boolean) {
  const a = arr.filter((i) => i.n.trim());
  return a.map((i, x) => (always || a.length > 1 ? `${x + 1}. ` : "") + toTitle(i.n) + ": " + i.k.trim()).join("\n");
}
export function testFoodReport(s: State) {
  const live = liveText(s);
  let t = `*Test Food Menu ${s.jn.trim()}*\n${live ? `*Live Cooking : ${live}*\n` : ""}*${dateText(s)}*${pukulText(s) ? `\n*Pukul : ${pukulText(s)}*` : ""}\n\n*Menu ${s.meal} Site ${siteName(s)}*\n${lines(cur(s).menu, true)}`;
  if (s.meal === "Dinner") {
    ([["Snack", cur(s).snack], ["Buah", cur(s).buah]] as [string, TF[]][]).forEach(([h, arr]) => {
      const l = lines(arr, false);
      if (l) t += `\n\n*${h}*\n${l}`;
    });
  }
  return `${t}\n\n*Kesimpulan :*\n${s.ks.trim()}`;
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
  const L = [`🍽️ Menu ${s.meal} ${s.ksite} 🍽️`, `✨ ${p.hari} ${pad(p.d)} ${p.m} ${p.y} ✨`, `🌈 ${s.camp} 🌈`, `💫 Menu ${s.jn.trim()} 💫`, ...(liveText(s) ? [`👩‍🍳 Live Cooking : ${liveText(s)} 👩‍🍳`] : []), "", "🍽️Kalori Persaji 100 gram🍽️", ""];
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
