// Google Sheets lewat REST (akun layanan). Kolom: key | nama | deskripsi | kkal_100g | sumber | status | diubah
import { JWT } from "google-auth-library";

export type Row = { row: number; nama: string; deskripsi: string; kkal: number | null; sumber: string; status: string; diubah: string };
export const HEADER = ["key", "nama", "deskripsi", "kkal_100g", "sumber", "status", "diubah"];

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
const rng = (a: string) => encodeURIComponent(`${TAB()}!${a}`);

let headerOk = false;
async function ensureHeader() {
  if (headerOk) return;
  const d = await api(`/values/${rng("A1:G1")}`);
  if (!d.values || d.values[0]?.[0] !== "key") {
    await api(`/values/${rng("A1:G1")}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [HEADER] }) });
  }
  headerOk = true;
}

export async function readRows(): Promise<Row[]> {
  await ensureHeader();
  const d = await api(`/values/${rng("A2:G")}`);
  const vals: string[][] = d.values || [];
  const out: Row[] = [];
  vals.forEach((v, i) => {
    if (!v[1]) return;
    const k = parseFloat(String(v[3] ?? "").replace(",", "."));
    out.push({ row: i + 2, nama: v[1], deskripsi: v[2] || "", kkal: Number.isFinite(k) ? k : null, sumber: v[4] || "", status: v[5] || "", diubah: v[6] || "" });
  });
  return out;
}
const line = (key: string, r: Omit<Row, "row">) => [key, r.nama, r.deskripsi, r.kkal ?? "", r.sumber, r.status, r.diubah];

export async function appendRow(key: string, r: Omit<Row, "row">) {
  await api(`/values/${rng("A:G")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: [line(key, r)] }),
  });
}
export async function updateRow(row: number, key: string, r: Omit<Row, "row">) {
  await api(`/values/${rng(`A${row}:G${row}`)}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [line(key, r)] }) });
}
export async function deleteRow(row: number) {
  const meta = await api(`?fields=sheets.properties(sheetId,title)`);
  const sh = (meta.sheets || []).find((s: { properties: { title: string } }) => s.properties.title === TAB());
  if (!sh) throw new Error(`Tab "${TAB()}" tidak ditemukan`);
  await api(`:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: sh.properties.sheetId, dimension: "ROWS", startIndex: row - 1, endIndex: row } } }] }),
  });
}
