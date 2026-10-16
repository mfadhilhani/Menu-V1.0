"use client";
import { useEffect, useRef, useState } from "react";
import { clean, fmt, norm, toTitle } from "@/lib/text";
import { Food, useFoods } from "./FoodsContext";

type Props = { value: string; onChange: (v: string) => void; onFood: (f: Food) => void; placeholder?: string; label?: string; className?: string };

// Kolom nama makanan: saran dari data Sheet, lalu cocokkan / tanya typo / tambah baru saat selesai mengetik.
export default function NameInput({ value, onChange, onFood, placeholder = "Nama makanan", label, className = "" }: Props) {
  const { foods, resolve } = useFoods();
  const [focus, setFocus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ msg: string; hint?: string; retry?: boolean } | null>(null);
  const last = useRef(norm(value));
  const cur = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  cur.current = value;
  useEffect(() => () => clearTimeout(timer.current), []);
  const q = norm(value);
  const sugg = focus && q
    ? foods.filter((f) => f.key.includes(q) && f.key !== q)
        .sort((a, b) => Number(b.key.startsWith(q)) - Number(a.key.startsWith(q)))
        .slice(0, 6)
    : [];

  async function commit(text: string, force = false, auto = false) {
    const t = clean(text);
    if (t.length < 2 || (!force && norm(t) === last.current)) return;
    clearTimeout(timer.current);
    last.current = norm(t);
    setBusy(true);
    setErr(null);
    const r = await resolve(t);
    setBusy(false);
    if (norm(cur.current) !== norm(t)) return; // kolom sudah diubah selama menunggu
    if (r.food) { last.current = r.food.key; onChange(r.food.nama); onFood(r.food); return; }
    last.current = "";
    setErr({ msg: r.error || "Gagal", hint: r.hint, retry: r.retry });
    // Gangguan sementara (AI sibuk): coba lagi sekali secara otomatis setelah beberapa detik.
    if (r.retry && !auto) timer.current = setTimeout(() => commit(cur.current, true, true), 6000);
  }
  function pick(f: Food) {
    last.current = f.key;
    clearTimeout(timer.current);
    setFocus(false);
    setErr(null);
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
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        onChange={(e) => { setErr(null); clearTimeout(timer.current); onChange(e.target.value); }}
        onFocus={() => setFocus(true)}
        onBlur={() => { setFocus(false); const t = toTitle(value); if (t && t !== value) onChange(t); commit(t || value); }}
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
      {err && (
        <span className="err" title={err.hint}>
          {err.msg}
          {err.retry && <button type="button" className="lnk" onClick={() => commit(value, true)}>Coba lagi</button>}
        </span>
      )}
    </div>
  );
}
