// Normalisasi, kemiripan nama, ikon, format angka.
export const clean = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
export const norm = (s: string) =>
  s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}& ]+/gu, " ").replace(/\s+/g, " ").trim();

function lev(a: string, b: string) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
export function sim(a: string, b: string) {
  if (a === b) return 1;
  const m = Math.max(a.length, b.length);
  if (!m) return 1;
  const s1 = 1 - lev(a, b) / m;
  const sa = a.split(" ").sort().join(" "), sb = b.split(" ").sort().join(" ");
  return Math.max(s1, 1 - lev(sa, sb) / m);
}
export const SIM = 0.8;
export function similar<T extends { key: string }>(q: string, list: T[]): T[] {
  const n = norm(q);
  if (n.length < 4) return [];
  return list
    .filter((f) => f.key !== n)
    .map((f) => ({ f, s: sim(n, f.key) }))
    .filter((x) => x.s >= SIM)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.f);
}

export const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
export function num(s: string | number | null | undefined): number | null {
  if (s === null || s === undefined || s === "") return null;
  const v = typeof s === "number" ? s : parseFloat(String(s).replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

const ICONS: [string, string][] = [
  ["nasi", "🍚"], ["ikan", "🐟"], ["lele", "🐟"], ["tongkol", "🐟"], ["ayam", "🍗"], ["bebek", "🍗"], ["telur", "🥚"],
  ["tempe", "🫔"], ["tahu", "🍢"], ["oyong", "🥬"], ["sayur", "🥬"], ["bayam", "🥬"], ["capcay", "🥬"], ["sup", "🥬"],
  ["soto", "🍲"], ["sop", "🍲"], ["bakso", "🍲"], ["bubur", "🥣"], ["sambal", "🌶️"], ["kerupuk", "🍥"], ["krupuk", "🍥"],
  ["roti", "🍞"], ["selai", "🍞"], ["kopi", "☕"], ["teh", "☕"], ["tea", "☕"], ["gula", "☕"], ["susu", "🥛"],
  ["pisang", "🍌"], ["jeruk", "🍊"], ["apel", "🍎"], ["semangka", "🍉"], ["buah", "🍎"], ["mie", "🍜"], ["daging", "🥩"],
  ["sapi", "🥩"], ["udang", "🦐"], ["cumi", "🦑"], ["sosis", "🌭"], ["kentang", "🥔"], ["jagung", "🌽"], ["puding", "🍮"],
  ["kue", "🍰"], ["gorengan", "🍤"], ["bakwan", "🍤"],
];
export function icon(name: string) {
  const n = name.toLowerCase();
  for (const [k, e] of ICONS) if (n.includes(k)) return e;
  return n.trim() ? "🍽️" : "";
}

export const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum’at", "Sabtu"];
export const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const pad = (n: number) => String(n).padStart(2, "0");
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function dateParts(v: string) {
  const [y, m, d] = (v || todayStr()).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return { hari: HARI[dt.getDay()], d, m: BULAN[m - 1], y };
}
