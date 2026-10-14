// Lapisan data: Google Sheets (produksi) atau memori server (MOCK_BACKEND=1). Cache 60 detik untuk menghemat kuota Sheets.
import { norm } from "./text";
import * as sheets from "./sheets";

export type Food = { key: string; nama: string; deskripsi: string; kkal: number | null; sumber: string; status: string; diubah: string };
type Fields = Omit<Food, "key" | "diubah">;

const mockOn = () => process.env.MOCK_BACKEND === "1";
const g = globalThis as unknown as { __mock?: sheets.Row[]; __cache?: { at: number; rows: sheets.Row[] } };
const now = () => new Date().toISOString();
const toFood = (r: sheets.Row): Food => ({ key: norm(r.nama), nama: r.nama, deskripsi: r.deskripsi, kkal: r.kkal, sumber: r.sumber, status: r.status, diubah: r.diubah });

function mockRows() {
  if (!g.__mock) {
    const seed: [string, number][] = [["Nasi Putih", 445], ["Ikan bb pepes", 167], ["Tempe Mendoan", 200], ["Sup Oyong", 19], ["Bubur Kacang Hijau", 108], ["Sambal", 42.5], ["Kerupuk", 53.85], ["Roti & selai", 220]];
    g.__mock = seed.map(([nama, kkal], i) => ({ row: i + 2, nama, deskripsi: "", kkal, sumber: "manual", status: "sudah dicek", diubah: now() }));
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
  const rec = { ...f, diubah: now() };
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
  const next = { nama: r.nama, deskripsi: p.deskripsi ?? r.deskripsi, kkal: p.kkal === undefined ? r.kkal : p.kkal, sumber: p.sumber ?? r.sumber, status: p.status ?? r.status, diubah: now() };
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
