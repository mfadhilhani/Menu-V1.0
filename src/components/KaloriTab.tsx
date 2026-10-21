"use client";
import { cur, kaloriInfo, kaloriReport, KR, LIMIT, State, Sync, warnaMessage } from "@/lib/report";
import { useState } from "react";
import { fmt, icon, norm, num } from "@/lib/text";
import IconPicker from "./IconPicker";
import { useFoods } from "./FoodsContext";
import NameInput from "./NameInput";
import { SortableList } from "./Sortable";
import CardsSection from "./CardsSection";
import FotoSection from "./FotoSection";
import PosterSection from "./PosterSection";
import { Meal } from "@/lib/canvas";
import { Slot } from "@/lib/report";
import { uid } from "./TestFoodTab";

type SetRows = (fn: (l: KR[]) => KR[]) => void;

function Row({ r, handle, upd, del, sync }: { r: KR; handle: React.ReactNode; upd: (id: string, p: Partial<KR>) => void; del: () => void; sync: Sync }) {
  const { foods, patchFood, addManual } = useFoods();
  const [pick, setPick] = useState(false);
  const auto = icon(r.n) || "🍽️", shown = r.ic || auto;
  // Koreksi kalori langsung di baris ikut memperbarui Sheet (dianggap sudah dicek).
  const saveKkal = () => {
    const f = foods.find((x) => x.key === norm(r.n)), v = num(r.kkal);
    if (f && v != null && v !== f.kkal) patchFood(f.key, { kkal: v, status: "sudah dicek" });
    else if (!f && v != null && r.n.trim().length >= 2) addManual(r.n.trim(), v);
  };
  return (
    <div className="r">
      {handle}
      <button type="button" className="ic" aria-label="Ubah ikon makanan" title="Ketuk untuk mengubah ikon" onClick={() => setPick(true)}>{shown}</button>
      {pick && (
        <IconPicker
          current={shown}
          auto={auto}
          onClose={() => setPick(false)}
          onPick={(e) => {
            setPick(false);
            upd(r.id, { ic: e || undefined });
            const f = foods.find((x) => x.key === norm(r.n));
            if (f) patchFood(f.key, { ikon: e });
          }}
        />
      )}
      <NameInput
        className="nm"
        value={r.n}
        onChange={(v) => (r.sid ? sync.name("rows", r.sid, v) : upd(r.id, { n: v }))}
        onFood={(f) => {
          if (r.sid) sync.food(r.sid, f);
          else upd(r.id, { n: f.nama, kkal: f.kkal != null ? String(f.kkal).replace(".", ",") : "", ic: f.ikon || r.ic });
          if (!f.ikon && r.ic) patchFood(f.key, { ikon: r.ic }); // ikon yang dipilih sebelum nama dikenali ikut disimpan
        }}
      />
      <button type="button" className="x" aria-label="Hapus baris" onClick={del}>✕</button>
      <input className="kk" inputMode="decimal" placeholder="kkal" title="kkal per 100 g" value={r.kkal} onChange={(e) => (r.sid ? sync.kkal(r.sid, e.target.value) : upd(r.id, { kkal: e.target.value }))} onBlur={saveKkal} />
      <input className="gr" inputMode="decimal" placeholder="gram" title="Porsi (gram)" value={r.gram} onChange={(e) => upd(r.id, { gram: e.target.value })} />
    </div>
  );
}

type Props = { s: State; up: (p: Partial<State>) => void; setRows: SetRows; setSlots: (fn: (l: Slot[]) => Slot[]) => void; sync: Sync; copy: (t: string) => void; wa: (t: string) => void; toast: (m: string) => void };
export default function KaloriTab({ s, up, setRows, setSlots, sync, copy, wa, toast }: Props) {
  const d = cur(s), pola = s.meal === "Breakfast" || s.meal === "Dinner";
  const upd = (id: string, p: Partial<KR>) => setRows((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const info = kaloriInfo(s), report = kaloriReport(s), warna = warnaMessage(s);
  if (!pola) {
    return (
      <section>
        <h2>Menu &amp; Kalori</h2>
        <p className="hint">Untuk {s.meal} hanya laporan Test Food yang dipakai. Pilih Breakfast atau Dinner di Info umum untuk laporan kalori, poster, dan kolase kode warna.</p>
      </section>
    );
  }
  return (
    <>
      <section>
        <h2>Pengaturan laporan kalori</h2>
        <div className="g">
          <div><label htmlFor="ksite">Kode site laporan</label><input id="ksite" value={s.ksite} onChange={(e) => up({ ksite: e.target.value })} /></div>
          <div><label htmlFor="camp">Camp</label><input id="camp" value={s.camp} onChange={(e) => up({ camp: e.target.value })} /></div>
        </div>
        <div className="note">Waktu makan, tanggal, dan jenis menu mengikuti Info umum di atas.</div>
      </section>
      <section>
        <h2>Daftar makanan</h2>
        <SortableList items={d.rows} onChange={(n) => setRows(() => n)}>
          {(r, _i, handle) => <Row r={r} handle={handle} upd={upd} del={() => setRows((l) => l.filter((x) => x.id !== r.id))} sync={sync} />}
        </SortableList>
        <div className="acts">
          <button className="p" type="button" onClick={() => setRows((l) => [...l, { id: uid(), n: "", kkal: "", gram: "100" }])}>+ Tambah baris</button>
          <button type="button" onClick={() => setRows(() => Array.from({ length: 6 }, () => ({ id: uid(), n: "", kkal: "", gram: "100" })))}>Kosongkan</button>
        </div>
        <div className="note">Di bawah nama: kiri = kkal per 100 g, kanan = porsi (gram). Kalori terisi dari Sheet; kalau kamu mengubah angkanya, Sheet ikut diperbarui. Baris tanpa kalori tidak ikut dijumlahkan. Geser ⠿ untuk memindah urutan.</div>
      </section>
      {pola && <PosterSection s={s} setSlots={setSlots} sync={sync} toast={toast} />}
      <CardsSection rows={d.rows} toast={toast} />
      <FotoSection text={report} toast={toast} />
      <section>
        <h2>Hasil laporan kalori</h2>
        <textarea id="out" readOnly value={report} />
        <label className="chk"><input type="checkbox" checked={s.rule} onChange={(e) => up({ rule: e.target.checked })} /> Aturan: kalau total {fmt(LIMIT)} kkal atau lebih, sambal dan kerupuk tidak dihitung di total</label>
        <div className="note">
          {!s.rule ? "" : info.skip
            ? `Total semua makanan ${fmt(info.all)} kkal (${fmt(LIMIT)} atau lebih), jadi sambal dan kerupuk tidak dihitung di Total Kalori. Total di laporan: ${fmt(info.tot)} kkal. Keduanya tetap tampil di daftar.`
            : `Total semua makanan ${fmt(info.all)} kkal, di bawah ${fmt(LIMIT)}, jadi semuanya dihitung.`}
        </div>
        <div className="acts">
          <button type="button" onClick={() => copy(report)}>Salin teks</button>
          <button type="button" className="p" onClick={() => wa(report)}>Kirim teks ke WhatsApp</button>
        </div>
      </section>
      <section>
        <h2>Pesan kode warna</h2>
        <textarea readOnly value={warna} rows={2} />
        <div className="acts">
          <button type="button" onClick={() => copy(warna)}>Salin pesan</button>
          <button type="button" className="p" onClick={() => wa(warna)}>Teks saja ke WhatsApp</button>
        </div>
      </section>
    </>
  );
}
