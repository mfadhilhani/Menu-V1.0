"use client";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as RKey, PointerEvent as RPointer } from "react";
import { Adj, ADJ0, adjFit, Bmp, drawAdj, fixAdj } from "@/lib/canvas";

// Atur satu foto kolase: geser dengan jari/mouse, putar 90°, perbesar. Bingkai di sini berbentuk sama dengan
// kotak foto itu di kolase (w x h), jadi yang terlihat di bingkai = yang masuk kolase.
type Props = { img: Bmp; w: number; h: number; adj?: Adj; label: string; onSave: (a?: Adj) => void; onClose: () => void };

export default function PhotoEdit({ img, w, h, adj, label, onSave, onClose }: Props) {
  const [a, setA] = useState<Adj>(() => fixAdj(adj));
  const cv = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ id: number; px: number; py: number; ax: number; ay: number } | null>(null);
  const CW = 720, CH = Math.round((CW * h) / w);
  useEffect(() => {
    const X = cv.current?.getContext("2d");
    if (!X) return;
    X.fillStyle = "#111"; X.fillRect(0, 0, CW, CH);
    drawAdj(X, img, 0, 0, CW, CH, a);
  }, [a, img, CW, CH]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const fit = adjFit(img, CW, CH, a), canX = fit.ox > 0.5, canY = fit.oy > 0.5;
  const down = (e: RPointer<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, px: e.clientX, py: e.clientY, ax: a.x, ay: a.y };
  };
  const move = (e: RPointer<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const k = CW / e.currentTarget.getBoundingClientRect().width; // piksel layar -> piksel kanvas
    setA((p) => {
      const f = adjFit(img, CW, CH, p);
      return fixAdj({ ...p, x: f.ox > 0.5 ? d.ax + ((e.clientX - d.px) * k) / f.ox : 0, y: f.oy > 0.5 ? d.ay + ((e.clientY - d.py) * k) / f.oy : 0 });
    });
  };
  const up = () => { drag.current = null; };
  // Tombol panah untuk keyboard (dan cadangan kalau menggeser dengan jari terasa sulit).
  const nudge = (dx: number, dy: number) => setA((p) => fixAdj({ ...p, x: p.x + dx * 0.1, y: p.y + dy * 0.1 }));
  const key = (e: RKey) => {
    const m: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (m[e.key]) { e.preventDefault(); nudge(...m[e.key]); }
  };
  const rot = (d: number) => setA((p) => fixAdj({ ...p, r: p.r + d, x: 0, y: 0 })); // setelah diputar, mulai lagi dari tengah
  const same = JSON.stringify(a) === JSON.stringify(ADJ0);

  return (
    <div className="dlg-bg" role="dialog" aria-modal="true" aria-label={`Atur ${label}`} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dlg pe">
        <h3>Atur {label}</h3>
        <canvas ref={cv} width={CW} height={CH} className="pecv" tabIndex={0} aria-label="Bingkai foto. Geser untuk memilih bagian yang tampil."
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key} />
        <p className="note">
          {canX || canY
            ? `Geser foto ${canX && canY ? "ke segala arah" : canX ? "ke kiri atau kanan" : "ke atas atau bawah"} untuk memilih bagian yang tampil.`
            : "Foto pas dengan bingkai. Perbesar dulu supaya bisa digeser."}
        </p>
        <div className="perow">
          <button type="button" onClick={() => rot(-1)}>⟲ Putar kiri</button>
          <button type="button" onClick={() => rot(1)}>⟳ Putar kanan</button>
        </div>
        <label htmlFor="pezoom">Perbesar ({a.z.toFixed(1).replace(".", ",")}x)</label>
        <input id="pezoom" type="range" min={1} max={3} step={0.05} value={a.z} onChange={(e) => setA((p) => fixAdj({ ...p, z: Number(e.target.value) }))} />
        <button type="button" className="p" onClick={() => { onSave(same ? undefined : a); onClose(); }}>Selesai</button>
        <button type="button" disabled={same} onClick={() => setA(ADJ0)}>Kembalikan ke awal</button>
        <button type="button" onClick={onClose}>Batal</button>
      </div>
    </div>
  );
}
