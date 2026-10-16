"use client";
import { useEffect, useRef, useState } from "react";
import { blobOf, colorCard, gridSheet } from "@/lib/canvas";
import { KR } from "@/lib/report";
import { saveBlob } from "@/lib/share";
import { num, toTitle } from "@/lib/text";

function CardCanvas({ name, kk }: { name: string; kk: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let dead = false;
    colorCard(name, kk).then((c) => {
      const cv = ref.current;
      if (dead || !cv) return;
      cv.width = c.width; cv.height = c.height;
      cv.getContext("2d")?.drawImage(c, 0, 0);
    });
    return () => { dead = true; };
  }, [name, kk]);
  return <canvas ref={ref} />;
}
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "makanan";

export default function CardsSection({ rows, toast }: { rows: KR[]; toast: (m: string) => void }) {
  const list = rows.map((r) => ({ id: r.id, name: toTitle(r.n), kk: num(r.kkal) })).filter((r): r is { id: string; name: string; kk: number } => !!r.name && r.kk != null);
  const [busy, setBusy] = useState(false);
  const one = async (name: string, kk: number) => {
    saveBlob(await blobOf(await colorCard(name, kk)), `${slug(name)}-${String(kk).replace(".", "_")}kkal.png`);
    toast("Kartu disimpan");
  };
  const all = async () => {
    setBusy(true);
    const cards = await Promise.all(list.map((r) => colorCard(r.name, r.kk)));
    saveBlob(await blobOf(gridSheet(cards, 3, 30)), "kode-warna-makanan.png");
    setBusy(false);
    toast("Semua kartu disimpan");
  };
  return (
    <section>
      <h2>Kode warna makanan</h2>
      <div className="note" style={{ marginTop: 0 }}>Hijau: di bawah 100 kkal. Kuning: 100 sampai kurang dari 200. Merah: 200 ke atas (per 100 g). Hanya baris yang sudah ada kalorinya yang dibuatkan kartu.</div>
      <div className="cards">
        {list.map((r) => (
          <div className="cd" key={r.id}>
            <CardCanvas name={r.name} kk={r.kk} />
            <button type="button" onClick={() => one(r.name, r.kk)}>Unduh PNG</button>
          </div>
        ))}
      </div>
      {list.length > 0 && <div className="acts"><button type="button" className="p" disabled={busy} onClick={all}>Unduh semua jadi 1 gambar</button></div>}
    </section>
  );
}
