"use client";
// Simpanan foto per nama menu ("pustaka foto"). Foto yang pernah dipasang untuk suatu menu disimpan dengan kunci
// nama menu itu, lalu muncul lagi otomatis saat nama yang sama dipakai di poster pada hari lain.
// - Selalu disimpan di browser ini (IndexedDB, kunci "lib:<nama>", tidak ikut terhapus tiap hari).
// - Kalau server punya folder foto (PHOTO_DIR, untuk hosting sendiri) dan sinkronisasi menyala, foto juga dikirim
//   ke server, jadi muncul di semua perangkat.
import { idbDel, idbGet, idbKeys, idbSet } from "./idb";
import { shrink } from "./photos";

let allow = true;
let probe: Promise<boolean> | null = null;
// Dipanggil saat sinkronisasi dinyalakan/dimatikan: mati = simpanan foto hanya di perangkat ini.
export const setPhotoServer = (on: boolean) => { allow = on; };
const serverOn = () => {
  if (!allow) return Promise.resolve(false);
  probe ??= fetch("/api/photo?info=1", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { enabled: false }))
    .then((j: { enabled?: boolean }) => !!j.enabled)
    .catch(() => { probe = null; return false; });
  return probe;
};
export const photoServerOn = serverOn;
const asFile = (b: Blob) => new File([b], "menu.jpg", { type: b.type || "image/jpeg" });

export async function libGet(key: string): Promise<File | null> {
  if (!key) return null;
  const v = await idbGet<Blob>(`lib:${key}`);
  if (v instanceof Blob) return asFile(v);
  if (!(await serverOn())) return null;
  try {
    const r = await fetch(`/api/photo?key=${encodeURIComponent(key)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const b = await r.blob();
    await idbSet(`lib:${key}`, b);
    return asFile(b);
  } catch { return null; }
}
export async function libPut(key: string, f: File) {
  if (!key) return false;
  const small = await shrink(f, 1280, 0.82, "menu.jpg");
  if (!small) return false;
  await idbSet(`lib:${key}`, small);
  if (await serverOn()) fetch(`/api/photo?key=${encodeURIComponent(key)}`, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: small }).catch(() => {});
  return true;
}
export async function libDel(key: string) {
  await idbDel(`lib:${key}`);
  if (await serverOn()) fetch(`/api/photo?key=${encodeURIComponent(key)}`, { method: "DELETE" }).catch(() => {});
}
export const libCount = async () => (await idbKeys("lib:")).length;
