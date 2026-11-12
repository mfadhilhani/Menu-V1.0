"use client";
// Logo site selain BCP. Disimpan di browser (IndexedDB, kunci "logo:<site>") dan, kalau sinkronisasi menyala,
// di tab "logo" Google Sheet supaya perangkat lain pada site yang sama ikut memakainya.
import { useCallback, useEffect, useState } from "react";
import { idbDel, idbGet, idbSet } from "./idb";

type Saved = { at: number; data: string };
const loadImg = (src: string) => new Promise<HTMLImageElement | null>((res) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => res(null);
  i.src = src;
});
const deviceName = () => (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "HP" : "Laptop/PC");

// Kecilkan ke maks. 480 px. PNG supaya latar transparan tetap; kalau hasilnya besar, pakai JPEG berlatar putih.
async function toDataUrl(f: File): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 480 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    const X = c.getContext("2d");
    if (!X) return null;
    X.imageSmoothingQuality = "high";
    X.drawImage(bmp, 0, 0, c.width, c.height);
    let d = c.toDataURL("image/png");
    if (d.length > 300000) {
      X.globalCompositeOperation = "destination-over";
      X.fillStyle = "#fff"; X.fillRect(0, 0, c.width, c.height);
      d = c.toDataURL("image/jpeg", 0.85);
    }
    bmp.close();
    return d.length <= 390000 ? d : null;
  } catch { return null; }
}
async function send(site: string, data: string): Promise<number> {
  try {
    const r = await fetch("/api/logo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site, data, device: deviceName() }) });
    const j = (await r.json().catch(() => ({}))) as { at?: number };
    return r.ok && j.at ? j.at : 0;
  } catch { return 0; }
}

// site = kunci site ("" atau site bawaan = tidak dipakai). sync = boleh mengambil/mengirim ke server.
export function useSiteLogo(site: string, sync: boolean) {
  const [st, setSt] = useState<{ site: string; data: string; img: HTMLImageElement | null }>({ site: "", data: "", img: null });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let dead = false;
    setSt({ site, data: "", img: null });
    if (!site) return;
    const show = async (data: string) => {
      const img = data ? await loadImg(data) : null;
      if (!dead) setSt({ site, data: img ? data : "", img });
    };
    (async () => {
      const loc = await idbGet<Saved>(`logo:${site}`);
      if (loc?.data) await show(loc.data);
      if (!sync || dead) return;
      try {
        const r = await fetch(`/api/logo?site=${encodeURIComponent(site)}&since=${loc?.at || 0}`, { cache: "no-store" });
        if (!r.ok) return;
        const lg = ((await r.json()) as { logo?: { at: number; data?: string } | null }).logo;
        if (lg && typeof lg.data === "string" && lg.at > (loc?.at || 0)) {
          if (lg.data) await idbSet(`logo:${site}`, { at: lg.at, data: lg.data }); else await idbDel(`logo:${site}`);
          await show(lg.data);
        } else if (!lg && loc?.data) {
          // Logo diunggah saat sinkronisasi mati atau offline: kirim sekarang.
          const at = await send(site, loc.data);
          if (at) await idbSet(`logo:${site}`, { at, data: loc.data });
        }
      } catch { /* offline: pakai logo yang ada di perangkat */ }
    })();
    return () => { dead = true; };
  }, [site, sync]);

  const set = useCallback(async (f: File) => {
    if (!site) return "Isi nama site dulu";
    setBusy(true);
    try {
      const data = await toDataUrl(f);
      const img = data ? await loadImg(data) : null;
      if (!data || !img) return "Gambar logo tidak bisa dibaca. Pakai PNG atau JPG.";
      await idbSet(`logo:${site}`, { at: Date.now(), data });
      setSt({ site, data, img });
      if (sync) { const at = await send(site, data); if (at) await idbSet(`logo:${site}`, { at, data }); }
      return null;
    } finally { setBusy(false); }
  }, [site, sync]);
  const clear = useCallback(async () => {
    if (!site) return;
    await idbDel(`logo:${site}`);
    setSt({ site, data: "", img: null });
    if (sync) await send(site, "");
  }, [site, sync]);
  // st.site !== site berarti logo site sebelumnya belum diganti (sedang memuat): jangan dipakai.
  const cur = st.site === site ? st : { site, data: "", img: null };
  return { img: cur.img, data: cur.data, busy, set, clear };
}
