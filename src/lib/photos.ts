"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Adj, Bmp, fixAdj } from "./canvas";
import { idbDel, idbGet, idbSet } from "./idb";
import { uid } from "./text";

// auto = foto diambil otomatis dari simpanan untuk nama menu itu (bukan dipilih tangan hari ini).
// adj = pengaturan geser/putar/perbesar di kolase Test Food (kosong = di tengah, tidak diputar).
export type Photo = { id: string; file: File; url: string; bmp: Bmp; auto?: string; adj?: Adj };

// Foto kamera HP bisa 4000 px lebih (5-12 MB). Dikecilkan dulu supaya penyimpanan browser tidak cepat penuh
// dan poster/kolase tidak membuat HP kehabisan memori. Poster paling besar hanya butuh sekitar 800 px per foto.
export async function shrink(f: Blob, max = 1600, q = 0.86, name = "foto.jpg"): Promise<File | null> {
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (k === 1 && f.type === "image/jpeg" && f.size < 900_000) {
      bmp.close();
      return f instanceof File ? f : new File([f], name, { type: "image/jpeg" });
    }
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    const X = c.getContext("2d");
    if (!X) { bmp.close(); return null; }
    X.fillStyle = "#fff"; X.fillRect(0, 0, c.width, c.height);
    X.imageSmoothingQuality = "high";
    X.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    const b = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", q));
    return b ? new File([b], name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : null;
  } catch { return null; }
}
async function mk(f: File, auto?: string): Promise<Photo | null> {
  try { return { id: uid(), file: f, url: URL.createObjectURL(f), bmp: await createImageBitmap(f), auto }; } catch { return null; }
}
// Lepas memori foto yang sudah tidak dipakai. Ditunda, karena poster yang sedang digambar bisa masih memegangnya.
function free(p?: Photo) {
  if (!p) return;
  setTimeout(() => {
    URL.revokeObjectURL(p.url);
    if ("close" in p.bmp) p.bmp.close();
  }, 30000);
}

// Daftar foto bebas (kolase), tersimpan di IndexedDB dengan kunci tertentu.
export function usePhotoList(key: string) {
  const [items, setItems] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let dead = false;
    setItems((prev) => { prev.forEach(free); return prev.length ? [] : prev; }); // pindah site: foto site lama tidak ikut tampil
    (async () => {
      // Disimpan sebagai { f, adj } (versi lama menyimpan File saja; keduanya dibaca).
      const fs = await idbGet<(File | { f: File; adj?: Adj })[]>(key);
      if (dead || !Array.isArray(fs)) return;
      const ps = (await Promise.all(fs.map(async (v) => {
        const f = v instanceof Blob ? v : v?.f;
        const p = f ? await mk(f) : null;
        if (p && !(v instanceof Blob) && v.adj) p.adj = fixAdj(v.adj);
        return p;
      }))).filter(Boolean) as Photo[];
      if (!dead) setItems(ps);
    })();
    return () => { dead = true; };
  }, [key]);
  const persist = (l: Photo[]) => { if (l.length) idbSet(key, l.map((p) => ({ f: p.file, adj: p.adj }))); else idbDel(key); };
  // Mengembalikan jumlah foto yang tidak bisa dibaca (mis. format yang tidak didukung browser).
  const add = useCallback(async (fs: File[]) => {
    setBusy(true);
    const small = await Promise.all(fs.map((f) => shrink(f, 1600, 0.86, f.name)));
    const ps = (await Promise.all(small.map((f) => (f ? mk(f) : null)))).filter(Boolean) as Photo[];
    setItems((prev) => { const n = [...prev, ...ps]; persist(n); return n; });
    setBusy(false);
    return fs.length - ps.length;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const remove = useCallback((id: string) => {
    setItems((prev) => { free(prev.find((p) => p.id === id)); const n = prev.filter((p) => p.id !== id); persist(n); return n; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Simpan pengaturan geser/putar/perbesar satu foto (undefined = kembali ke bawaan).
  const adjust = useCallback((id: string, adj?: Adj) => {
    setItems((prev) => { const n = prev.map((p) => (p.id === id ? { ...p, adj } : p)); persist(n); return n; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Ubah urutan foto (urutan di daftar = urutan di kolase). ids = urutan baru.
  const reorder = useCallback((ids: string[]) => {
    setItems((prev) => {
      const by = new Map(prev.map((p) => [p.id, p]));
      const n = ids.map((id) => by.get(id)).filter(Boolean) as Photo[];
      if (n.length !== prev.length) return prev;
      persist(n);
      return n;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Pindahkan satu foto satu langkah (d = -1 lebih awal, 1 lebih akhir).
  const move = useCallback((id: string, d: number) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.id === id), j = i + d;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const n = [...prev];
      [n[i], n[j]] = [n[j], n[i]];
      persist(n);
      return n;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { items, add, remove, adjust, reorder, move, busy };
}

// Satu foto per kotak menu poster, dikunci dengan id kotak (tetap benar saat urutan digeser).
// Disimpan sebagai { f, auto } (versi lama menyimpan File saja; keduanya dibaca).
type Saved = File | { f: File; auto?: string };
export function useSlotPhotos(ids: string[]) {
  const [map, setMap] = useState<Record<string, Photo>>({});
  const [ready, setReady] = useState(false);
  const tried = useRef(new Set<string>());
  const sig = ids.join("|");
  useEffect(() => {
    let left = 0;
    ids.forEach(async (id) => {
      if (tried.current.has(id)) return;
      tried.current.add(id);
      left++;
      const v = await idbGet<Saved>(`slot:${id}`);
      const f = v instanceof Blob ? v : v?.f, auto = v && !(v instanceof Blob) ? v.auto : undefined;
      const p = f ? await mk(f, auto) : null;
      if (p) setMap((m) => (m[id] ? m : { ...m, [id]: p }));
      if (--left === 0) setReady(true);
    });
    if (!left) setReady(true);
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  // raw = true: file sudah kecil (dari simpanan), tidak perlu dikecilkan lagi.
  const set = useCallback(async (id: string, f: File, auto?: string, raw = false) => {
    const small = raw ? f : await shrink(f, 1600, 0.86, f.name);
    const p = small ? await mk(small, auto) : null;
    if (!p) return null;
    idbSet(`slot:${id}`, { f: p.file, auto });
    setMap((m) => { free(m[id]); return { ...m, [id]: p }; });
    return p.file;
  }, []);
  const clear = useCallback((id: string) => {
    idbDel(`slot:${id}`);
    setMap((m) => { free(m[id]); const n = { ...m }; delete n[id]; return n; });
  }, []);
  return { map, set, clear, ready };
}
