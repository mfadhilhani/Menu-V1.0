"use client";
import { useEffect, useRef } from "react";
import { blobOf, drawTfCollage } from "@/lib/canvas";
import { usePhotoList } from "@/lib/photos";
import { openWa, saveBlob, shareFiles } from "@/lib/share";

export default function TfCollage({ text, date, toast, ns }: { text: string; date: string; toast: (m: string) => void; ns: string }) {
  const ph = usePhotoList(ns + "tfphotos");
  const cv = useRef<HTMLCanvasElement>(null);
  const n = ph.items.length;
  useEffect(() => { if (cv.current && n) drawTfCollage(cv.current, ph.items.map((p) => p.bmp)); }, [ph.items, n]);
  const file = async () => (cv.current ? new File([await blobOf(cv.current, "image/jpeg", 0.9)], `kolase-tesfood-${date}.jpg`, { type: "image/jpeg" }) : null);
  return (
    <section>
      <h2>Kolase foto</h2>
      <label className="fbtn big">{ph.busy ? "Memproses foto…" : n ? "+ Tambah foto" : "Pilih atau ambil foto"}
        <input type="file" accept="image/*" multiple hidden disabled={ph.busy} onChange={async (e) => { const f = [...(e.target.files || [])]; e.target.value = ""; if (!f.length) return; const bad = await ph.add(f); if (bad) toast(`${bad} foto tidak bisa dibaca`); }} />
      </label>
      {!n && <p className="hint">Foto digabung otomatis jadi satu kolase. Foto hanya ada di perangkat ini dan terhapus otomatis besok (pukul 03.00).</p>}
      <div className="thumbs">
        {ph.items.map((p, i) => (
          <div className="t" key={p.id}>
            <img src={p.url} alt={`Foto ${i + 1}`} />
            <button type="button" aria-label={`Hapus foto ${i + 1}`} onClick={() => ph.remove(p.id)}>✕</button>
          </div>
        ))}
      </div>
      <canvas ref={cv} className="cvs" hidden={!n} />
      <div className="acts">
        <button type="button" disabled={!n} onClick={async () => { const f = await file(); if (f) { saveBlob(f, f.name); toast("Kolase disimpan"); } }}>Unduh kolase</button>
        <button type="button" className="p" onClick={async () => { if (!n) { openWa(text); return; } const f = await file(); if (f) await shareFiles([f], text, toast); }}>
          {n ? "Kirim kolase + laporan ke WhatsApp" : "Kirim teks ke WhatsApp"}
        </button>
      </div>
    </section>
  );
}
