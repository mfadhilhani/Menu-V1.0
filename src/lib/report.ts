// Penyusun teks laporan (port dari versi HTML).
import { dateParts, fmt, icon, num, pad, toTitle } from "./text";

export type TF = { id: string; n: string; k: string };
export type KR = { id: string; n: string; kkal: string; gram: string; ic?: string };
export type Slot = { id: string; n: string; kkal: string; desc: string };
export type State = {
  tab: "tf" | "kal" | "his";
  mealAuto: boolean; jn: string; live: boolean; liveMenu: string; dt: string; meal: string; site: string; sxi: string; ks: string;
  menu: TF[]; snack: TF[]; buah: TF[];
  ksite: string; camp: string; rule: boolean; rows: KR[];
  pb: Slot[]; pd: Slot[];
};
export const LIMIT = 1800;
const EXC = /sambal|sambel|kerupuk|krupuk/i;

export const siteName = (s: State) => (s.site === "__x" ? s.sxi.trim() || "-" : s.site);
// Baris Live Cooking (kosong kalau tidak dicentang atau belum diisi).
const liveText = (s: State) => (s.live && s.liveMenu.trim() ? toTitle(s.liveMenu) : "");
const dateText = (s: State) => { const p = dateParts(s.dt); return `${p.hari}, ${pad(p.d)} ${p.m} ${p.y}`; };

function lines(arr: TF[], always: boolean) {
  const a = arr.filter((i) => i.n.trim());
  return a.map((i, x) => (always || a.length > 1 ? `${x + 1}. ` : "") + toTitle(i.n) + ": " + i.k.trim()).join("\n");
}
export function testFoodReport(s: State) {
  const live = liveText(s);
  let t = `*Test Food Menu ${s.jn.trim()}*\n${live ? `*Live Cooking : ${live}*\n` : ""}*${dateText(s)}*\n\n*Menu ${s.meal} Site ${siteName(s)}*\n${lines(s.menu, true)}`;
  if (s.meal === "Dinner") {
    ([["Snack", s.snack], ["Buah", s.buah]] as [string, TF[]][]).forEach(([h, arr]) => {
      const l = lines(arr, false);
      if (l) t += `\n\n*${h}*\n${l}`;
    });
  }
  return `${t}\n\n*Kesimpulan :*\n${s.ks.trim()}`;
}

export function kaloriInfo(s: State) {
  const rows = s.rows.filter((r) => r.n.trim()).map((r) => ({ ...r, kv: num(r.kkal), gv: num(r.gram) ?? 100 }));
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
