// Simpanan foto menu di server (opsional). Aktif kalau PHOTO_DIR diisi dengan folder yang bisa ditulis,
// jadi cocok untuk hosting sendiri (VPS). Di Vercel sistem berkasnya tidak permanen, jadi biarkan kosong:
// foto tetap tersimpan per perangkat di browser.
// Satu file JPEG per nama makanan. Nama file berasal dari hash kunci makanan, jadi isi kunci tidak pernah
// menjadi bagian dari path (aman dari "../").
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const PHOTO_MAX = 1_500_000;
const dir = () => (process.env.PHOTO_DIR || "").trim();
export const photoEnabled = () => !!dir();
const fileOf = (key: string) => join(dir(), createHash("sha256").update(key).digest("hex").slice(0, 32) + ".jpg");

export async function photoRead(key: string): Promise<{ data: Buffer; at: number } | null> {
  if (!photoEnabled()) return null;
  try {
    const f = fileOf(key);
    const [data, st] = await Promise.all([readFile(f), stat(f)]);
    return { data, at: Math.round(st.mtimeMs) };
  } catch { return null; }
}
export async function photoWrite(key: string, data: Buffer) {
  await mkdir(dir(), { recursive: true });
  const f = fileOf(key), tmp = `${f}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, f); // tulis ke file sementara dulu supaya file tidak pernah terbaca setengah jadi
}
export async function photoDelete(key: string) {
  try { await unlink(fileOf(key)); return true; } catch { return false; }
}
