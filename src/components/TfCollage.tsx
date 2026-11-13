"use client";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as RMouse } from "react";
import { blobOf, drawTfCollage, tfCells } from "@/lib/canvas";
import { usePhotoList } from "@/lib/photos";
import { openWa, saveBlob, shareFiles } from "@/lib/share";
import PhotoEdit from "./PhotoEdit";
import { SortableList } from "./Sortable";

export default function TfCollage({ text, date, toast, ns }: { text: string; date: string; toast: (m: string) => void; ns: string }) {
  const ph = usePhotoList(ns + "tfphotos");
  const cv = useRef<HTMLCanvasElement>(null);
  const [edit, setEdit] = useState<string | null>(null); // id foto yang sedang diatur
  const n = ph.items.length;
  useEffect(() => { if (cv.current && n) drawTfCollage(cv.current, ph.items.map((p) => p.bmp), ph.items.map((p) => p.adj)); }, [ph.items, n]);
  const file = async () => (cv.current ? new File([await blobOf(cv.current, "image/jpeg", 0.9)], `kolase-tesfood-${date}.jpg`, { type: "image/jpeg" }) : null);
  const ei = ph.items.findIndex((p) => p.id === edit), ep = ei >= 0 ? ph.items[ei] : null, cell = ep ? tfCells(n).cells[ei] : null;
  // Ketuk kolase: buka pengaturan foto yang diketuk.
  const pick = (e: RMouse<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), L = tfCells(n);
    const x = ((e.clientX - r.left) / r.width) * L.W, y = ((e.clientY - r.top) / r.height) * L.H;
    const i = L.cells.findIndex((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
    if (i >= 0) setEdit(ph.items[i].id);
  };
  return (
    <section>
      <h2>Kolase foto</h2>
      <label className="fbtn big">{ph.busy ? "Memproses foto…" : n ? "+ Tambah foto" : "Pilih atau ambil foto"}
        <input type="file" accept="image/*" multiple hidden disabled={ph.busy} onChange={async (e) => { const f = [...(e.target.files || [])]; e.target.value = ""; if (!f.length) return; const bad = await ph.add(f); if (bad) toast(`${bad} foto tidak bisa dibaca`); }} />
      </label>
      <p className="hint">
        {n
          ? "Urutan foto di daftar kecil = urutan di kolase. Tahan dan geser ⠿ untuk memindah urutan. Ketuk “Atur” (atau fotonya di kolase) untuk memutar, memperbesar, atau memilih bagian yang tampil."
          : "Foto digabung otomatis jadi satu kolase. Foto hanya ada di perangkat ini dan terhapus otomatis saat hari berganti (pukul 00.00)."}
      </p>
      <SortableList items={ph.items} onChange={(l) => ph.reorder(l.map((p) => p.id))} className="thumbs">
        {(p, i, handle) => (
          <div className="t">
            <img src={p.url} alt={`Foto ${i + 1}`} draggable={false} />
            {n > 1 && handle}
            <span className="tn" aria-hidden="true">{i + 1}</span>
            <button type="button" className="ed" aria-label={`Atur foto ${i + 1}: urutan, putar, perbesar`} onClick={() => setEdit(p.id)}>{p.adj ? "Diatur" : "Atur"}</button>
            <button type="button" aria-label={`Hapus foto ${i + 1}`} onClick={() => ph.remove(p.id)}>✕</button>
          </div>
        )}
      </SortableList>
      <canvas ref={cv} className="cvs tap" hidden={!n} onClick={pick} />
      <div className="acts">
        <button type="button" disabled={!n} onClick={async () => { const f = await file(); if (f) { saveBlob(f, f.name); toast("Kolase disimpan"); } }}>Unduh kolase</button>
        <button type="button" className="p" onClick={async () => { if (!n) { openWa(text); return; } const f = await file(); if (f) await shareFiles([f], text, toast); }}>
          {n ? "Kirim kolase + laporan ke WhatsApp" : "Kirim teks ke WhatsApp"}
        </button>
      </div>
      {ep && cell && <PhotoEdit img={ep.bmp} w={cell.w} h={cell.h} adj={ep.adj} label={`foto ${ei + 1}`} pos={ei} total={n} onMove={(d) => ph.move(ep.id, d)} onSave={(a) => ph.adjust(ep.id, a)} onClose={() => setEdit(null)} />}
    </section>
  );
}
