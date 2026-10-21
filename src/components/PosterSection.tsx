"use client";
import { useEffect, useRef, useState } from "react";
import { blobOf, drawKolase, drawPoster, Meal, SlotView } from "@/lib/canvas";
import { useSlotPhotos } from "@/lib/photos";
import { cur, kaloriReport, Slot, State, Sync, warnaMessage } from "@/lib/report";
import { saveBlob, shareFiles } from "@/lib/share";
import { norm, num, toTitle } from "@/lib/text";
import { useFoods } from "./FoodsContext";
import NameInput from "./NameInput";
import { SortableList } from "./Sortable";

type SetSlots = (fn: (l: Slot[]) => Slot[]) => void;
type Props = { s: State; setSlots: SetSlots; sync: Sync; toast: (m: string) => void };

export default function PosterSection({ s, setSlots, sync, toast }: Props) {
  const meal = s.meal as Meal, dinner = meal === "Dinner";
  const slots = cur(s).slots, set = setSlots;
  const { foods, patchFood, addManual } = useFoods();
  const photos = useSlotPhotos(Object.values(s.md).flatMap((m) => m.slots).map((x) => x.id));
  const poster = useRef<HTMLCanvasElement>(null), kolase = useRef<HTMLCanvasElement>(null);
  const [hasKolase, setHasKolase] = useState(false);
  const upd = (id: string, p: Partial<Slot>) => set((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));

  // Gambar ulang poster dan kolase setiap isian atau foto berubah (jeda singkat supaya tidak berat).
  useEffect(() => {
    const views: SlotView[] = slots.map((x) => ({ name: toTitle(x.n), desc: x.desc, kkal: num(x.kkal), img: photos.map[x.id]?.bmp ?? null }));
    const t = setTimeout(async () => {
      if (poster.current) await drawPoster(poster.current, meal, views);
      if (kolase.current) setHasKolase(await drawKolase(kolase.current, views));
    }, 150);
    return () => clearTimeout(t);
  }, [meal, slots, photos.map]);

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
          const ph = photos.map[x.id];
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
                  <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f && !(await photos.set(x.id, f))) toast("Foto tidak bisa dibaca"); }} />
                </label>
                {ph && <button type="button" className="x" aria-label="Hapus foto" onClick={() => photos.clear(x.id)}>✕</button>}
              </div>
            </div>
          );
        }}
      </SortableList>
      <div className="note">
        {dinner
          ? "Urutan: Menu 1-3 baris atas (kiri ke kanan), 4-6 baris bawah. Deskripsi hanya tampil di poster biasa."
          : "Urutan: Menu 1 = lingkaran paling atas (kanan), 2 = kiri, 3 = kanan bawah, 4 = kiri bawah."}{" "}
        Nama, kalori, dan deskripsi terisi dari Sheet; urutan form = posisi di poster. Geser ⠿ untuk memindah urutan. Menu tanpa kalori tetap muncul di kolase, tanpa kartu kode warna.
      </div>
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
    </section>
  );
}
