"use client";
import { useEffect, useRef, useState } from "react";
import { blobOf, Brand, drawKolase, drawPoster, Meal, SlotView, tvFrames } from "@/lib/canvas";
import { libDel, libGet, libPut } from "@/lib/photolib";
import { useSlotPhotos } from "@/lib/photos";
import { cur, kaloriReport, siteName, Slot, State, Sync, warnaMessage } from "@/lib/report";
import { saveBlob, shareFiles } from "@/lib/share";
import { norm, num, toTitle } from "@/lib/text";
import { useFoods } from "./FoodsContext";
import NameInput from "./NameInput";
import { SortableList } from "./Sortable";

type SetSlots = (fn: (l: Slot[]) => Slot[]) => void;
// ns = awalan site pada kunci foto ("" untuk BCP), brand = identitas site selain BCP (null untuk BCP).
type Props = { s: State; setSlots: SetSlots; sync: Sync; toast: (m: string) => void; ns: string; brand: Brand | null };

export default function PosterSection({ s, setSlots, sync, toast, ns, brand }: Props) {
  const meal = s.meal as Meal, dinner = meal === "Dinner";
  const slots = cur(s).slots, set = setSlots;
  const { foods, patchFood, addManual } = useFoods();
  const photos = useSlotPhotos(Object.values(s.md).flatMap((m) => m.slots).map((x) => ns + x.id));
  const poster = useRef<HTMLCanvasElement>(null), kolase = useRef<HTMLCanvasElement>(null);
  const [hasKolase, setHasKolase] = useState(false);
  const upd = (id: string, p: Partial<Slot>) => set((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const mkViews = (): SlotView[] => slots.map((x) => ({ name: toTitle(x.n), desc: x.desc, kkal: num(x.kkal), img: photos.map[ns + x.id]?.bmp ?? null }));
  const [vid, setVid] = useState<{ file: File; url: string } | null>(null);
  const [vbusy, setVbusy] = useState("");
  const dropVid = () => setVid((v) => { if (v) URL.revokeObjectURL(v.url); return null; });

  // Gambar ulang poster dan kolase setiap isian atau foto berubah (jeda singkat supaya tidak berat).
  // Video lama dibuang karena isinya sudah tidak sesuai.
  useEffect(() => {
    const views = mkViews();
    dropVid();
    const t = setTimeout(async () => {
      try {
        if (poster.current) await drawPoster(poster.current, meal, views, brand);
        if (kolase.current) setHasKolase(await drawKolase(kolase.current, views, brand));
      } catch (e) { console.error("[poster]", e); }
    }, 150);
    return () => clearTimeout(t);
  }, [meal, slots, photos.map, brand, ns]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- simpanan foto per nama menu ----------
  // Foto yang dipasang untuk suatu menu disimpan dengan kunci nama menu itu, dan dipasang lagi otomatis saat nama
  // yang sama dipakai (mis. besok atau minggu depan). Foto poster harian sendiri tetap dihapus tiap hari kerja baru.
  const lib = useRef({ pend: new Set<string>(), off: new Map<string, string>(), tried: new Set<string>() });
  const live = useRef({ slots, map: photos.map });
  live.current = { slots, map: photos.map };
  const pickPhoto = async (x: Slot, f: File) => {
    const pid = ns + x.id, saved = await photos.set(pid, f);
    if (!saved) { toast("Foto tidak bisa dibaca. Coba foto lain (JPG atau PNG)."); return; }
    const k = norm(x.n);
    lib.current.off.delete(pid);
    if (k.length >= 2) { lib.current.pend.delete(pid); libPut(k, saved); } else lib.current.pend.add(pid); // belum bernama: disimpan setelah namanya diisi
  };
  const dropPhoto = (x: Slot, forget: boolean) => {
    const pid = ns + x.id, k = norm(x.n);
    if (k) lib.current.off.set(pid, k); // jangan dipasang otomatis lagi untuk nama ini selama halaman terbuka
    lib.current.pend.delete(pid);
    photos.clear(pid);
    if (forget && k) { libDel(k); toast("Foto dihapus dari simpanan"); }
  };
  useEffect(() => {
    if (!photos.ready) return;
    const t = setTimeout(() => {
      slots.forEach(async (x) => {
        const pid = ns + x.id, k = norm(x.n), ph = photos.map[pid], L = lib.current;
        if (ph) {
          if (ph.auto && ph.auto !== k) { photos.clear(pid); return; }           // nama diganti: foto simpanan menu lama dilepas
          if (!ph.auto && L.pend.has(pid) && k.length >= 2) { L.pend.delete(pid); libPut(k, ph.file); }
          return;
        }
        if (k.length < 2 || L.off.get(pid) === k || L.tried.has(pid + "\n" + k)) return;
        L.tried.add(pid + "\n" + k);
        const f = await libGet(k);
        const now = live.current;
        if (f && !now.map[pid] && norm(now.slots.find((y) => y.id === x.id)?.n || "") === k) photos.set(pid, f, k, true);
      });
    }, 700);
    return () => clearTimeout(t);
  }, [slots, photos.map, photos.ready, ns]); // eslint-disable-line react-hooks/exhaustive-deps

  // Video TV: kartu tiap menu digambar di HP, MP4 disusun di server (hasil sama di iPhone dan Android).
  const makeVideo = async () => {
    setVbusy("Menyiapkan kartu…");
    try {
      const frames = await tvFrames(mkViews(), { jenis: s.jn, site: siteName(s) }, brand);
      if (!frames.length) { toast("Isi nama atau foto minimal satu menu"); return; }
      let blobs: Blob[] = [];
      for (const q of [0.9, 0.75, 0.6]) {           // jaga total kiriman di bawah ~4 MB (batas Vercel 4,5 MB)
        blobs = await Promise.all(frames.map((c) => blobOf(c, "image/jpeg", q)));
        if (blobs.reduce((a, b) => a + b.size, 0) < 4_000_000) break;
      }
      const fd = new FormData();
      fd.append("sec", "5");
      blobs.forEach((b, i) => fd.append("frames", b, `kartu-${i + 1}.jpg`));
      setVbusy(`Membuat video di server (${frames.length - 2} menu)…`);
      const r = await fetch("/api/video", { method: "POST", body: fd });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(r.status === 401 ? "Sesi login habis. Muat ulang halaman lalu masuk lagi." : r.status === 413 ? "Kiriman terlalu besar. Coba dengan foto lebih sedikit." : j.error || `Server menjawab ${r.status}`);
      }
      const file = new File([await r.blob()], `video-menu-${meal.toLowerCase()}-${s.dt}.mp4`, { type: "video/mp4" });
      setVid((v) => { if (v) URL.revokeObjectURL(v.url); return { file, url: URL.createObjectURL(file) }; });
      toast("Video siap. Putar dulu untuk cek, lalu simpan.");
    } catch (e) {
      toast("Video gagal: " + (e instanceof Error ? e.message : "coba lagi"));
    } finally {
      setVbusy("");
    }
  };
  // Tombol terpisah (bukan otomatis setelah video jadi) karena menu bagikan iPhone hanya mau dibuka langsung dari ketukan.
  const shareVid = async () => {
    if (!vid) return;
    try {
      if (navigator.canShare && navigator.canShare({ files: [vid.file] })) { await navigator.share({ files: [vid.file] }); return; }
    } catch (e) { if ((e as Error).name === "AbortError") return; }
    saveBlob(vid.file, vid.file.name);
    toast("Video disimpan");
  };

  const files = async (which: "poster" | "kolase") => {
    const c = which === "poster" ? poster.current : kolase.current;
    if (!c) return null;
    return new File([await blobOf(c)], `menu-${meal.toLowerCase()}${which === "kolase" ? "-kode-warna" : ""}.png`, { type: "image/png" });
  };
  const download = async (which: "poster" | "kolase") => {
    const f = await files(which);
    if (f) { saveBlob(f, f.name.replace(".png", `-${s.dt}.png`)); toast("Gambar disimpan"); }
  };
  const send = async (which: "poster" | "kolase") => {
    const f = await files(which);
    if (f) await shareFiles([f], which === "poster" ? kaloriReport(s) : warnaMessage(s), toast);
  };
  const saveKkal = (x: Slot) => {
    const f = foods.find((y) => y.key === norm(x.n)), v = num(x.kkal);
    if (f && v != null && v !== f.kkal) patchFood(f.key, { kkal: v, status: "sudah dicek" });
    else if (!f && v != null && x.n.trim().length >= 2) addManual(x.n.trim(), v);
  };

  return (
    <section>
      <h2>Poster menu {meal} ({slots.length} menu)</h2>
      <SortableList items={slots} onChange={(n) => set(() => n)} className="slots">
        {(x, i, handle) => {
          const ph = photos.map[ns + x.id];
          return (
            <div className="sl">
              <h3>{handle}<span>Menu {i + 1}</span></h3>
              <NameInput
                value={x.n}
                onChange={(v) => (x.sid ? sync.name("slots", x.sid, v) : upd(x.id, { n: v }))}
                onFood={(f) => (x.sid ? sync.food(x.sid, f) : upd(x.id, { n: f.nama, kkal: f.kkal != null ? String(f.kkal).replace(".", ",") : "", ...(dinner ? { desc: f.deskripsi || "" } : {}) }))}
              />
              <input style={{ marginTop: 6 }} inputMode="decimal" placeholder="kkal per 100 g" value={x.kkal} onChange={(e) => (x.sid ? sync.kkal(x.sid, e.target.value) : upd(x.id, { kkal: e.target.value }))} onBlur={() => saveKkal(x)} />
              {dinner && <input style={{ marginTop: 6 }} maxLength={120} placeholder="Deskripsi singkat" value={x.desc} onChange={(e) => upd(x.id, { desc: e.target.value })} />}
              <div className="pf">
                {ph && <img className="pth" src={ph.url} alt={`Foto menu ${i + 1}`} />}
                <label className="fbtn">{ph ? "Ganti foto" : "Pilih foto"}
                  <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pickPhoto(x, f); }} />
                </label>
                {ph && <button type="button" className="x" aria-label={`Hapus foto menu ${i + 1}`} onClick={() => dropPhoto(x, false)}>✕</button>}
              </div>
              {ph?.auto && (
                <div className="note">Dari simpanan foto menu ini. <button type="button" className="lnkb" onClick={() => dropPhoto(x, true)}>Hapus dari simpanan</button></div>
              )}
            </div>
          );
        }}
      </SortableList>
      <div className="note">
        {dinner
          ? "Urutan: Menu 1-3 baris atas (kiri ke kanan), 4-6 baris bawah. Deskripsi hanya tampil di poster biasa."
          : "Urutan: Menu 1 = lingkaran paling atas (kanan), 2 = kiri, 3 = kanan bawah, 4 = kiri bawah."}{" "}
        Nama, kalori, dan deskripsi terisi dari Sheet; urutan form = posisi di poster. Geser ⠿ untuk memindah urutan. Menu tanpa kalori tetap muncul di kolase, tanpa kartu kode warna.
        {" "}Foto yang kamu pasang disimpan per nama menu dan muncul lagi otomatis saat menu yang sama dipakai di lain hari.
      </div>
      {brand && <div className="note">Poster, kolase, dan video memakai tulisan <b>Site {brand.site}</b>{brand.logo ? " dan logo site ini" : " tanpa logo DH (unggah logo di Info umum kalau ada)"}.</div>}
      <h3 className="ph">Poster biasa</h3>
      <canvas ref={poster} className="cvs narrow" />
      <h3 className="ph">Poster kode warna (kolase)</h3>
      <canvas ref={kolase} className="cvs" hidden={!hasKolase} />
      {!hasKolase && <p className="hint">Isi nama atau foto minimal satu menu untuk melihat kolase.</p>}
      <div className="acts">
        <button type="button" onClick={() => download("poster")}>Unduh poster biasa</button>
        <button type="button" disabled={!hasKolase} onClick={() => download("kolase")}>Unduh poster kode warna</button>
        <button type="button" className="p" onClick={() => send("poster")}>Kirim poster biasa + laporan kalori ke WhatsApp</button>
        <button type="button" className="p" disabled={!hasKolase} onClick={() => send("kolase")}>Kirim poster kode warna + pesan kode warna ke WhatsApp</button>
      </div>
      <h3 className="ph">Video untuk TV (MP4)</h3>
      <p className="hint">Urutan: sampul (jenis menu, site, dan logo site dari Info umum), kartu kode warna tiap menu, lalu penutup “Selamat Menikmati”. 5 detik per gambar, ukuran 1920×1080. Video dibuat di server, jadi hasilnya sama di semua HP.</p>
      <div className="acts">
        <button type="button" className="p" disabled={!hasKolase || !!vbusy} onClick={makeVideo}>{vbusy || (vid ? "Buat ulang video" : "Buat video TV (MP4)")}</button>
      </div>
      {vid && (
        <>
          <video className="cvs" src={vid.url} controls playsInline muted loop />
          <div className="acts">
            <button type="button" onClick={() => { saveBlob(vid.file, vid.file.name); toast("Video disimpan"); }}>Unduh video</button>
            <button type="button" className="p" onClick={shareVid}>Simpan ke Galeri / bagikan</button>
          </div>
        </>
      )}
    </section>
  );
}
