"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bmp } from "./canvas";
import { idbDel, idbGet, idbSet } from "./idb";
import { uid } from "./text";

export type Photo = { id: string; file: File; url: string; bmp: Bmp };
async function mk(f: File): Promise<Photo | null> {
  try { return { id: uid(), file: f, url: URL.createObjectURL(f), bmp: await createImageBitmap(f) }; } catch { return null; }
}

// Daftar foto bebas (kolase), tersimpan di IndexedDB dengan kunci tertentu.
export function usePhotoList(key: string) {
  const [items, setItems] = useState<Photo[]>([]);
  useEffect(() => {
    let dead = false;
    (async () => {
      const fs = await idbGet<File[]>(key);
      if (dead || !Array.isArray(fs)) return;
      const ps = (await Promise.all(fs.map(mk))).filter(Boolean) as Photo[];
      if (!dead) setItems(ps);
    })();
    return () => { dead = true; };
  }, [key]);
  const persist = (l: Photo[]) => { if (l.length) idbSet(key, l.map((p) => p.file)); else idbDel(key); };
  const add = useCallback(async (fs: File[]) => {
    const ps = (await Promise.all(fs.map(mk))).filter(Boolean) as Photo[];
    setItems((prev) => { const n = [...prev, ...ps]; persist(n); return n; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const remove = useCallback((id: string) => {
    setItems((prev) => { const n = prev.filter((p) => p.id !== id); persist(n); return n; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { items, add, remove };
}

// Satu foto per kotak menu poster, dikunci dengan id kotak (tetap benar saat urutan digeser).
export function useSlotPhotos(ids: string[]) {
  const [map, setMap] = useState<Record<string, Photo>>({});
  const tried = useRef(new Set<string>());
  const sig = ids.join("|");
  useEffect(() => {
    ids.forEach(async (id) => {
      if (tried.current.has(id)) return;
      tried.current.add(id);
      const f = await idbGet<File>(`slot:${id}`);
      if (!f) return;
      const p = await mk(f);
      if (p) setMap((m) => ({ ...m, [id]: p }));
    });
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = useCallback(async (id: string, f: File) => {
    const p = await mk(f);
    if (!p) return false;
    idbSet(`slot:${id}`, f);
    setMap((m) => ({ ...m, [id]: p }));
    return true;
  }, []);
  const clear = useCallback((id: string) => {
    idbDel(`slot:${id}`);
    setMap((m) => { const n = { ...m }; delete n[id]; return n; });
  }, []);
  return { map, set, clear };
}
