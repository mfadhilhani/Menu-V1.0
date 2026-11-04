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

// Tab draf: satu baris berisi isian (teks saja) yang disinkronkan antar perangkat.
// Kolom: diubah_ms | hari | perangkat | isi (JSON, dipecah per 45.000 karakter karena batas satu sel 50.000).
const DTAB = () => process.env.SHEET_DRAFT_TAB || "draf";
let draftTab = "";
const drng = (a: string) => encodeURIComponent(`${q(draftTab || DTAB())}!${a}`);
const CHUNK = 45000, MAXC = 23; // kolom D sampai Z
async function ensureDraftTab() {
  if (draftTab) return;
  const meta = await api(`?fields=sheets.properties(sheetId,title)`);
  const titles: string[] = (meta.sheets || []).map((x: { properties: { title: string } }) => x.properties.title);
  const found = titles.find((t) => t.toLowerCase() === DTAB().toLowerCase());
  if (found) { draftTab = found; return; }
  await api(`:batchUpdate`, { method: "POST", body: JSON.stringify({ requests: [{ addSheet: { properties: { title: DTAB() } } }] }) });
  draftTab = DTAB();
  await api(`/values/${drng("A1:D1")}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [["diubah_ms", "hari", "perangkat", "isi (JSON, jangan diubah manual)"]] }) });
}
export type DraftRow = { at: number; day: string; device: string; json: string };
export async function readDraft(): Promise<DraftRow | null> {
  await ensureDraftTab();
  const d = await api(`/values/${drng("A2:Z2")}?valueRenderOption=UNFORMATTED_VALUE`);
  const v: unknown[] = d.values?.[0] || [];
  const json = v.slice(3).map((x) => String(x ?? "")).join("");
  if (!json) return null;
  return { at: Number(v[0]) || 0, day: String(v[1] ?? ""), device: String(v[2] ?? ""), json };
}
export async function writeDraft(r: DraftRow) {
  await ensureDraftTab();
  const parts: string[] = [];
  for (let i = 0; i < r.json.length; i += CHUNK) parts.push(r.json.slice(i, i + CHUNK));
  if (parts.length > MAXC) throw new Error("Isian terlalu besar untuk disimpan di Sheet");
  // Angka waktu ditulis sebagai teks supaya tidak diubah format angka Sheet. Sel sisa dikosongkan.
  const row = [String(r.at), r.day, r.device, ...parts, ...Array(MAXC - parts.length).fill("")];
  await api(`/values/${drng("A2:Z2")}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [row] }) });
}
