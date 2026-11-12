// Lapisan data: Google Sheets (produksi) atau memori server (MOCK_BACKEND=1). Cache 60 detik untuk menghemat kuota Sheets.
import { norm, toTitle } from "./text";
import * as sheets from "./sheets";

export type Food = { key: string; nama: string; deskripsi: string; kkal: number | null; sumber: string; status: string; diubah: string; ikon: string };
type Fields = Omit<Food, "key" | "diubah">;

const mockOn = () => process.env.MOCK_BACKEND === "1";
type Kv = Omit<sheets.KvRow, "row">;
const g = globalThis as unknown as { __mock?: sheets.Row[]; __cache?: { at: number; rows: sheets.Row[] }; __kv?: Record<string, Record<string, Kv>> };
const now = () => new Date().toISOString();
const toFood = (r: sheets.Row): Food => ({ key: norm(r.nama), nama: toTitle(r.nama), deskripsi: r.deskripsi, kkal: r.kkal, sumber: r.sumber, status: r.status, diubah: r.diubah, ikon: r.ikon });

function mockRows() {
  if (!g.__mock) {
    const seed: [string, number][] = [["Nasi Putih", 445], ["Ikan bb pepes", 167], ["Tempe Mendoan", 200], ["Sup Oyong", 19], ["Bubur Kacang Hijau", 108], ["Sambal", 42.5], ["Kerupuk", 53.85], ["Roti & selai", 220]];
    g.__mock = seed.map(([nama, kkal], i) => ({ row: i + 2, nama, deskripsi: "", kkal, sumber: "manual", status: "sudah dicek", diubah: now(), ikon: "" }));
  }
  return g.__mock;
}
async function rows(fresh = false): Promise<sheets.Row[]> {
  if (mockOn()) return mockRows();
  if (!fresh && g.__cache && Date.now() - g.__cache.at < 60000) return g.__cache.rows;
  const r = await sheets.readRows();
  g.__cache = { at: Date.now(), rows: r };
  return r;
}
const drop = () => { g.__cache = undefined; };

export async function listFoods(fresh = false): Promise<Food[]> {
  return (await rows(fresh)).map(toFood).sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

// Menambah hanya jika key belum ada (dicek ulang dari data terbaru). created=false berarti sudah ada.
export async function addFood(f: Fields): Promise<{ food: Food; created: boolean }> {
  const key = norm(f.nama);
  const all = await rows(true);
  const hit = all.find((r) => norm(r.nama) === key);
  if (hit) return { food: toFood(hit), created: false };
  const rec = { ...f, nama: toTitle(f.nama), diubah: now() };
  if (mockOn()) {
    all.push({ row: all.length + 2, ...rec });
  } else {
    await sheets.appendRow(key, rec);
    drop();
  }
  return { food: toFood({ row: 0, ...rec }), created: true };
}

export async function updateFood(key: string, p: Partial<Fields>): Promise<Food | null> {
  const all = await rows(true);
  const r = all.find((x) => norm(x.nama) === key);
  if (!r) return null;
  const next = { nama: r.nama, ikon: p.ikon ?? r.ikon, deskripsi: p.deskripsi ?? r.deskripsi, kkal: p.kkal === undefined ? r.kkal : p.kkal, sumber: p.sumber ?? r.sumber, status: p.status ?? r.status, diubah: now() };
  if (mockOn()) Object.assign(r, next);
  else { await sheets.updateRow(r.row, key, next); drop(); }
  return toFood({ ...r, ...next });
}

export async function deleteFood(key: string): Promise<boolean> {
  const all = await rows(true);
  const i = all.findIndex((x) => norm(x.nama) === key);
  if (i < 0) return false;
  if (mockOn()) all.splice(i, 1);
  else { await sheets.deleteRow(all[i].row); drop(); }
  return true;
}

// ---------- data per site: draf isian dan logo ----------
// Satu baris per site di tab Sheet (atau di memori server untuk MOCK_BACKEND).
async function kvGet(tab: string, site: string): Promise<{ row: number | null; cur: Kv | null }> {
  if (mockOn()) return { row: null, cur: g.__kv?.[tab]?.[site] ?? null };
  const hit = (await sheets.readKv(tab)).find((r) => r.site === site);
  return hit ? { row: hit.row, cur: hit } : { row: null, cur: null };
}
async function kvPut(tab: string, row: number | null, r: Kv) {
  if (mockOn()) { g.__kv ??= {}; (g.__kv[tab] ??= {})[r.site] = r; return; }
  await sheets.writeKv(tab, row, r);
}

// Draf isian yang disinkronkan antar perangkat pada site yang sama (teks saja, tanpa foto).
// "at" adalah nomor versi yang diberi server (bukan jam perangkat), jadi jam HP yang salah tidak memengaruhi urutan.
// Kiriman diterima hanya kalau pengirim sudah melihat versi terakhir (base = versi itu). Kalau belum, server
// mengembalikan draf terbarunya dan perangkat menggabungkan perubahannya sendiri lalu mengirim ulang.
// Draf dari hari kerja yang lebih baru tidak bisa ditimpa draf hari sebelumnya.
// Catatan: baca-lalu-tulis ke Sheet tidak atomik; dua kiriman dalam sepersekian detik yang sama masih bisa saling menimpa.
export type Draft = { at: number; day: string; device: string; state: Record<string, unknown> };
const toDraft = (r: Kv | null): Draft | null => {
  if (!r || !r.json) return null;
  try { return { at: r.at, day: r.day, device: r.device, state: JSON.parse(r.json) }; } catch { return null; }
};
export async function getDraft(site: string): Promise<Draft | null> {
  return toDraft((await kvGet(sheets.DRAFT_TAB(), site)).cur);
}
export async function putDraft(site: string, d: { base: number; day: string; device: string; state: Record<string, unknown> }): Promise<{ ok: boolean; at?: number; draft: Draft | null }> {
  const { row, cur: raw } = await kvGet(sheets.DRAFT_TAB(), site);
  const cur = toDraft(raw);
  if (cur && (cur.day > d.day || (cur.day === d.day && cur.at !== d.base))) return { ok: false, draft: cur };
  const at = Math.max(Date.now(), (raw?.at ?? 0) + 1);
  await kvPut(sheets.DRAFT_TAB(), row, { site, at, day: d.day, device: d.device, json: JSON.stringify(d.state) });
  return { ok: true, at, draft: null };
}

// Logo site (gambar kecil sebagai data URL), supaya logo yang diunggah di satu perangkat muncul di perangkat lain
// pada site yang sama. data kosong = logo dihapus.
export type Logo = { at: number; data: string };
export async function getLogo(site: string): Promise<Logo | null> {
  const { cur } = await kvGet(sheets.LOGO_TAB(), site);
  return cur ? { at: cur.at, data: cur.json === "-" ? "" : cur.json } : null;
}
export async function putLogo(site: string, data: string, device: string): Promise<Logo> {
  const { row, cur } = await kvGet(sheets.LOGO_TAB(), site);
  const at = Math.max(Date.now(), (cur?.at ?? 0) + 1);
  // Sel kosong tidak terbaca sebagai baris, jadi logo yang dihapus ditandai "-".
  await kvPut(sheets.LOGO_TAB(), row, { site, at, day: "", device, json: data || "-" });
  return { at, data };
}
