"use client";
import { useState } from "react";
import { blobOf, drawRowCollage } from "@/lib/canvas";
import { usePhotoList } from "@/lib/photos";
import { copyText, openWa, shareFiles } from "@/lib/share";

// Foto untuk dikirim bersama laporan kalori (opsional digabung jadi satu baris kolase).
export default function FotoSection({ text, toast, ns }: { text: string; toast: (m: string) => void; ns: string }) {
  const ph = usePhotoList(ns + "foto");
  const [col, setCol] = useState(true);
  const send = async () => {
    if (!ph.items.length) { toast("Belum ada foto, membuka WhatsApp dengan teks saja."); openWa(text); return; }
    let files = ph.items.map((p) => p.file);
    if (files.length > 1 && col) {
      const cv = document.createElement("canvas");
      drawRowCollage(cv, ph.items.map((p) => p.bmp));
      files = [new File([await blobOf(cv, "image/jpeg", 0.88)], "menu-kalori.jpg", { type: "image/jpeg" })];
    }
    await shareFiles(files, text, toast);
  };
  return (
    <section>
      <h2>Foto untuk laporan kalori</h2>
      <label className="fbtn big">{ph.busy ? "Memproses foto…" : ph.items.length ? "+ Tambah foto" : "Pilih atau ambil foto"}
        <input type="file" accept="image/*" multiple hidden disabled={ph.busy} onChange={async (e) => { const f = [...(e.target.files || [])]; e.target.value = ""; if (!f.length) return; const bad = await ph.add(f); if (bad) toast(`${bad} foto tidak bisa dibaca`); }} />
      </label>
      <label className="chk"><input type="checkbox" checked={col} onChange={(e) => setCol(e.target.checked)} /> Gabungkan beberapa foto jadi satu baris (kolase)</label>
      <div className="thumbs">
        {ph.items.map((p, i) => (
          <div className="t" key={p.id}>
            <img src={p.url} alt={`Foto ${i + 1}`} />
            <button type="button" aria-label={`Hapus foto ${i + 1}`} onClick={() => ph.remove(p.id)}>✕</button>
          </div>
        ))}
      </div>
      <div className="acts">
        <button type="button" className="p" onClick={send}>Kirim foto + laporan kalori ke WhatsApp</button>
        <button type="button" onClick={async () => toast((await copyText(text)) ? "Teks disalin" : "Gagal menyalin")}>Salin teks</button>
      </div>
    </section>
  );
}
