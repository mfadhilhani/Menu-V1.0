// Google Sheets lewat REST (akun layanan). Kolom: key | nama | deskripsi | kkal_100g | sumber | status | diubah | ikon
import { JWT } from "google-auth-library";

export type Row = { row: number; nama: string; deskripsi: string; kkal: number | null; sumber: string; status: string; diubah: string; ikon: string };
export const HEADER = ["key", "nama", "deskripsi", "kkal_100g", "sumber", "status", "diubah", "ikon"];

const ID = () => process.env.SHEET_ID || "";
const TAB = () => process.env.SHEET_TAB || "makanan";
let jwt: JWT | null = null;

function client() {
  if (!jwt) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    if (!ID() || !email || !key) throw new Error("SHEET_ID / kredensial Google belum diisi");
    jwt = new JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  }
  return jwt;
}
async function api(path: string, init: RequestInit = {}) {
  const { token } = await client().getAccessToken();
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ID()}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Sheets ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
// Nama tab sebenarnya di Sheet (dicari tanpa membedakan huruf besar kecil; dibuat otomatis kalau belum ada).
let tabName = "";
const q = (n: string) => `'${n.replace(/'/g, "''")}'`;
const rng = (a: string) => encodeURIComponent(`${q(tabName || TAB())}!${a}`);

let headerOk = false;
async function ensureHeader() {
  if (headerOk) return;
  const meta = await api(`?fields=sheets.properties(sheetId,title)`);
  const titles: string[] = (meta.sheets || []).map((x: { properties: { title: string } }) => x.properties.title);
  const found = titles.find((t) => t.toLowerCase() === TAB().toLowerCase());
  if (found) tabName = found;
  else {
    await api(`:batchUpdate`, { method: "POST", body: JSON.stringify({ requests: [{ addSheet: { properties: { title: TAB() } } }] }) });
    tabName = TAB();
  }
  const d = await api(`/values/${rng("A1:H1")}`);
  const h: string[] = d.values?.[0] || [];
  if (h[0] !== "key" || h[7] !== "ikon") {
    // Sheet baru, atau Sheet lama tanpa kolom ikon: tulis ulang baris judul (data di bawahnya tidak disentuh).
    await api(`/values/${rng("A1:H1")}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [HEADER] }) });
  }
  headerOk = true;
}

export async function readRows(): Promise<Row[]> {
  await ensureHeader();
  const d = await api(`/values/${rng("A2:H")}`);
  const vals: string[][] = d.values || [];
  const out: Row[] = [];
  vals.forEach((v, i) => {
    if (!v[1]) return;
    const k = parseFloat(String(v[3] ?? "").replace(",", "."));
    out.push({ row: i + 2, nama: v[1], deskripsi: v[2] || "", kkal: Number.isFinite(k) ? k : null, sumber: v[4] || "", status: v[5] || "", diubah: v[6] || "", ikon: v[7] || "" });
  });
  return out;
}
const line = (key: string, r: Omit<Row, "row">) => [key, r.nama, r.deskripsi, r.kkal ?? "", r.sumber, r.status, r.diubah, r.ikon];

export async function appendRow(key: string, r: Omit<Row, "row">) {
  await api(`/values/${rng("A:H")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: [line(key, r)] }),
  });
}
export async function updateRow(row: number, key: string, r: Omit<Row, "row">) {
  await api(`/values/${rng(`A${row}:H${row}`)}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [line(key, r)] }) });
}
export async function deleteRow(row: number) {
  const meta = await api(`?fields=sheets.properties(sheetId,title)`);
  const sh = (meta.sheets || []).find((s: { properties: { title: string } }) => s.properties.title === (tabName || TAB()));
  if (!sh) throw new Error(`Tab "${tabName || TAB()}" tidak ditemukan`);
  await api(`:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: sh.properties.sheetId, dimension: "ROWS", startIndex: row - 1, endIndex: row } } }] }),
  });
}

// Tab berkunci site: satu baris per site. Dipakai untuk draf isian (tab "draf") dan logo site (tab "logo").
// Kolom: site | diubah_ms | hari | perangkat | isi (dipecah per 45.000 karakter karena batas satu sel 50.000).
// Tab draf versi lama (satu baris untuk semua, kolom A = diubah_ms) dipindah otomatis ke site "bcp".
const CHUNK = 45000, MAXC = 22; // kolom E sampai Z
const KV_HEADER = ["site", "diubah_ms", "hari", "perangkat", "isi (jangan diubah manual)"];
export const DRAFT_TAB = () => process.env.SHEET_DRAFT_TAB || "draf";
export const LOGO_TAB = () => process.env.SHEET_LOGO_TAB || "logo";
export type KvRow = { row: number; site: string; at: number; day: string; device: string; json: string };
const kvTabs = new Map<string, string>(); // nama tab yang diminta -> nama tab sebenarnya di Sheet
const krng = (tab: string, a: string) => encodeURIComponent(`${q(tab)}!${a}`);

async function ensureKvTab(want: string): Promise<string> {
  const known = kvTabs.get(want);
  if (known) return known;
  const meta = await api(`?fields=sheets.properties(sheetId,title)`);
  const titles: string[] = (meta.sheets || []).map((x: { properties: { title: string } }) => x.properties.title);
  let tab = titles.find((t) => t.toLowerCase() === want.toLowerCase());
  if (!tab) {
    await api(`:batchUpdate`, { method: "POST", body: JSON.stringify({ requests: [{ addSheet: { properties: { title: want } } }] }) });
    tab = want;
    await api(`/values/${krng(tab, "A1:E1")}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [KV_HEADER] }) });
  } else {
    const d = await api(`/values/${krng(tab, "A1:Z2")}?valueRenderOption=UNFORMATTED_VALUE`);
    const head = String(d.values?.[0]?.[0] ?? "");
    if (head === "diubah_ms") {
      // Susunan lama: A = diubah_ms, B = hari, C = perangkat, D.. = isi. Geser satu kolom dan beri kunci site "bcp".
      const old: unknown[] = d.values?.[1] || [];
      const cells = old.length ? ["bcp", ...old.slice(0, 25).map((x) => String(x ?? ""))] : [];
      const pad = (r: unknown[]) => [...r, ...Array(Math.max(0, 26 - r.length)).fill("")];
      await api(`/values/${krng(tab, "A1:Z2")}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [pad(KV_HEADER), pad(cells)] }) });
    } else if (head !== "site") {
      await api(`/values/${krng(tab, "A1:E1")}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [KV_HEADER] }) });
    }
  }
  kvTabs.set(want, tab);
  return tab;
}
export async function readKv(want: string): Promise<KvRow[]> {
  const tab = await ensureKvTab(want);
  const d = await api(`/values/${krng(tab, "A2:Z")}?valueRenderOption=UNFORMATTED_VALUE`);
  const out: KvRow[] = [];
  ((d.values || []) as unknown[][]).forEach((v, i) => {
    const site = String(v[0] ?? "").trim();
    if (!site) return;
    out.push({ row: i + 2, site, at: Number(v[1]) || 0, day: String(v[2] ?? ""), device: String(v[3] ?? ""), json: v.slice(4).map((x) => String(x ?? "")).join("") });
  });
  return out;
}
// row = nomor baris yang sudah ada untuk site ini (dari readKv), atau null untuk menambah baris baru.
export async function writeKv(want: string, row: number | null, r: Omit<KvRow, "row">) {
  const tab = await ensureKvTab(want);
  const parts: string[] = [];
  for (let i = 0; i < r.json.length; i += CHUNK) parts.push(r.json.slice(i, i + CHUNK));
  if (parts.length > MAXC) throw new Error("Isian terlalu besar untuk disimpan di Sheet");
  // Angka waktu ditulis sebagai teks supaya tidak diubah format angka Sheet. Sel sisa dikosongkan.
  const cells = [r.site, String(r.at), r.day, r.device, ...parts, ...Array(MAXC - parts.length).fill("")];
  if (row) {
    await api(`/values/${krng(tab, `A${row}:Z${row}`)}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [cells] }) });
  } else {
    await api(`/values/${krng(tab, "A:Z")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", body: JSON.stringify({ values: [cells] }) });
  }
}
