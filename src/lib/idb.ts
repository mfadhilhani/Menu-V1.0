// Penyimpanan gambar di browser (IndexedDB) supaya tidak hilang saat reload.
// Ada dua jenis kunci:
// - sementara (foto poster hari ini, kolase): dihapus saat dibuka di hari kerja baru (lewat pukul 00.00) dan saat "Mulai baru";
// - tetap (awalan "logo:" = logo site, "lib:" = simpanan foto per nama menu): tidak ikut dihapus.
import { workDay } from "./text";

const DAY_KEY = "__hari";
const KEEP = ["logo:", "lib:"];
const keep = (k: IDBValidKey) => k === DAY_KEY || (typeof k === "string" && KEEP.some((p) => k.startsWith(p)));
let dbp: Promise<IDBDatabase> | null = null;

// Hapus semua kunci sementara dalam satu transaksi.
function clearTemp(st: IDBObjectStore, only?: (k: string) => boolean) {
  const rq = st.openKeyCursor();
  rq.onsuccess = () => {
    const c = rq.result;
    if (!c) return;
    if (!keep(c.key) && (!only || only(String(c.key)))) st.delete(c.key);
    c.continue();
  };
}
function sweep(d: IDBDatabase) {
  return new Promise<void>((res) => {
    try {
      const t = d.transaction("f", "readwrite"), st = t.objectStore("f"), today = workDay();
      const g = st.get(DAY_KEY);
      g.onsuccess = () => {
        const v = g.result as string | undefined;
        if (v && v < today) clearTemp(st); // foto dari hari kerja sebelumnya
        st.put(today, DAY_KEY);
      };
      t.oncomplete = () => res();
      t.onerror = () => res();
      t.onabort = () => res();
    } catch { res(); }
  });
}
const open = () =>
  dbp ??= new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open("tesfoodNext", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("f");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }).then(async (d) => { await sweep(d); return d; });
async function op<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  try {
    const d = await open();
    return await new Promise<T | undefined>((res) => {
      const t = d.transaction("f", mode);
      const rq = fn(t.objectStore("f"));
      t.oncomplete = () => res(rq ? (rq.result as T) : undefined);
      t.onerror = () => res(undefined);
      t.onabort = () => res(undefined);
    });
  } catch { return undefined; }
}
export const idbGet = <T,>(k: string) => op<T>("readonly", (s) => s.get(k) as IDBRequest<T>);
export const idbSet = (k: string, v: unknown) => op("readwrite", (s) => { s.put(v, k); });
export const idbDel = (k: string) => op("readwrite", (s) => { s.delete(k); });
// Menghapus foto sementara saja; logo site dan simpanan foto menu tetap ada.
// ns = awalan site pada kunci foto ("" untuk site bawaan, "<site>|" untuk site lain): hanya foto site itu yang dihapus.
export const idbClear = (ns?: string) =>
  op("readwrite", (s) => { clearTemp(s, ns === undefined ? undefined : ns ? (k) => k.includes(ns) : (k) => !k.includes("|")); });
export const idbKeys = async (prefix: string) =>
  ((await op<IDBValidKey[]>("readonly", (s) => s.getAllKeys())) || []).filter((k): k is string => typeof k === "string" && k.startsWith(prefix));
