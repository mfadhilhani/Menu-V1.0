"use client";
import { useEffect, useRef, useState } from "react";

const KEY = "tfm2_jenis_extra";
// Kolom pilihan yang tetap bisa diketik bebas. Nilai buatan sendiri diingat supaya muncul lagi di daftar.
export default function ComboInput({ id, value, onChange, options, placeholder }: { id: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  // Daftar menutup kalau menyentuh di luar kolom atau menekan Escape.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  useEffect(() => { try { setExtra(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* abaikan */ } }, []);
  const all = [...options, ...extra.filter((x) => !options.some((o) => o.toLowerCase() === x.toLowerCase()))];
  const remember = () => {
    const v = value.trim();
    if (v.length < 2 || all.some((o) => o.toLowerCase() === v.toLowerCase())) return;
    const n = [...extra, v].slice(-8);
    setExtra(n);
    try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* penuh */ }
  };
  const pick = (v: string) => { onChange(v); setOpen(false); };
  return (
    <div className="ni combo" ref={box}>
      <input id={id} value={value} placeholder={placeholder} autoComplete="off" onChange={(e) => onChange(e.target.value)} onBlur={() => { setTimeout(() => setOpen(false), 120); remember(); }} />
      <button type="button" className="cb" aria-label="Pilih dari daftar" aria-expanded={open} onPointerDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}>▾</button>
      {open && (
        <div className="sug">
          {all.map((o) => (
            <button type="button" key={o} onPointerDown={(e) => { e.preventDefault(); pick(o); }}><b>{o}</b></button>
          ))}
        </div>
      )}
    </div>
  );
}
