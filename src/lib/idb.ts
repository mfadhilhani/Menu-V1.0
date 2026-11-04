// Penyimpanan foto di browser (IndexedDB) supaya tidak hilang saat reload.
// Foto bersifat sementara: saat dibuka di hari kerja baru (lewat pukul 03.00), semua foto hari sebelumnya dihapus.
import { workDay } from "./text";

const DAY_KEY = "__hari";
let dbp: Promise<IDBDatabase> | null = null;
function sweep(d: IDBDatabase) {
  return new Promise<void>((res) => {
    try {
      const t = d.transaction("f", "readwrite"), st = t.objectStore("f"), today = workDay();
      const g = st.get(DAY_KEY);
      g.onsuccess = () => {
        const v = g.result as string | undefined;
        if (v && v < today) st.clear(); // foto dari hari kerja sebelumnya
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
export const idbClear = () => op("readwrite", (s) => { s.clear(); });
