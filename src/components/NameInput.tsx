"use client";
import { useRef, useState } from "react";
import { clean, fmt, norm } from "@/lib/text";
import { Food, useFoods } from "./FoodsContext";

type Props = { value: string; onChange: (v: string) => void; onFood: (f: Food) => void; placeholder?: string; label?: string; className?: string };

// Kolom nama makanan: saran dari data Sheet, lalu cocokkan / tanya typo / tambah baru saat selesai mengetik.
export default function NameInput({ value, onChange, onFood, placeholder = "Nama makanan", label, className = "" }: Props) {
  const { foods, resolve } = useFoods();
  const [focus, setFocus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const last = useRef(norm(value));
  const q = norm(value);
  const sugg = focus && q
    ? foods.filter((f) => f.key.includes(q) && f.key !== q)
        .sort((a, b) => Number(b.key.startsWith(q)) - Number(a.key.startsWith(q)))
        .slice(0, 6)
    : [];

  async function commit(text: string) {
    const t = clean(text);
    if (t.length < 2 || norm(t) === last.current) return;
    last.current = norm(t);
    setBusy(true);
    setErr("");
    const r = await resolve(t);
    setBusy(false);
    if (r.food) { last.current = r.food.key; onChange(r.food.nama); onFood(r.food); }
    else { last.current = ""; setErr(r.error || "Gagal"); }
  }
  function pick(f: Food) {
    last.current = f.key;
    setFocus(false);
    setErr("");
    onChange(f.nama);
    onFood(f);
  }
  return (
    <div className={`ni ${className}`}>
      <input
        value={value}
        placeholder={placeholder}
        aria-label={label || placeholder}
        autoComplete="off"
        onChange={(e) => { setErr(""); onChange(e.target.value); }}
        onFocus={() => setFocus(true)}
        onBlur={() => { setFocus(false); commit(value); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
      />
      {sugg.length > 0 && (
        <div className="sug">
          {sugg.map((f) => (
            <button type="button" key={f.key} onPointerDown={(e) => { e.preventDefault(); pick(f); }}>
              <b>{f.nama}</b><span>{f.kkal != null ? `${fmt(f.kkal)} kkal` : ""}</span>
            </button>
          ))}
        </div>
      )}
      {busy && <span className="busy">mencari…</span>}
      {err && <span className="err">{err}</span>}
    </div>
  );
}
