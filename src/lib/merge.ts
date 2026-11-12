// Penggabungan tiga arah untuk isian yang diubah di dua perangkat sebelum sempat tersinkron.
// base   = isian terakhir yang sama dengan server (sebelum keduanya berubah)
// local  = isian di perangkat ini (punya perubahan yang belum terkirim)
// remote = isian terbaru di server (diubah perangkat lain)
// Aturan: bagian yang hanya diubah di satu sisi mengikuti sisi itu. Kalau bagian yang sama diubah di dua sisi,
// perangkat ini yang dipakai (orang yang sedang mengetik tidak kehilangan ketikannya).
// Daftar (menu, snack, buah, daftar makanan, kotak poster) digabung per baris menurut id baris, jadi dua orang
// bisa mengisi baris berbeda pada waktu yang sama tanpa saling menimpa.
type Obj = Record<string, unknown>;
type Row = { id: string } & Obj;

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const isRows = (v: unknown): v is Row[] => Array.isArray(v) && v.every((r) => isObj(r) && typeof r.id === "string");

export function mergeRows(base: Row[], local: Row[], remote: Row[]): Row[] {
  if (eq(local, base)) return remote;
  if (eq(remote, base)) return local;
  const b = new Map(base.map((r) => [r.id, r])), l = new Map(local.map((r) => [r.id, r])), rm = new Set(remote.map((r) => r.id));
  const out: Row[] = [];
  for (const r of remote) {
    const mine = l.get(r.id), old = b.get(r.id);
    if (!mine) { if (!old) out.push(r); continue; }   // dihapus di sini: tetap terhapus. Baris baru dari perangkat lain: ikut.
    out.push(old && eq(mine, old) ? r : mine);        // tidak diubah di sini: ikut server. Diubah di sini: pakai punya sini.
  }
  for (const r of local) if (!b.has(r.id) && !rm.has(r.id)) out.push(r); // baris yang baru ditambah di sini
  return out;
}

export function merge3(base: Obj | null, local: Obj, remote: Obj): Obj {
  if (!base) return remote;
  const out: Obj = { ...remote };
  for (const k of Object.keys(local)) {
    const lv = local[k], bv = base[k], rv = remote[k];
    if (eq(lv, bv)) continue;                         // tidak diubah di sini: ikut server
    if (rv === undefined || eq(rv, bv)) { out[k] = lv; continue; } // hanya diubah di sini
    if (isRows(lv) && isRows(rv)) out[k] = mergeRows(isRows(bv) ? bv : [], lv, rv);
    else if (isObj(lv) && isObj(rv)) out[k] = merge3(isObj(bv) ? bv : {}, lv, rv);
    else out[k] = lv;                                 // diubah di dua sisi: perangkat ini yang dipakai
  }
  return out;
}
