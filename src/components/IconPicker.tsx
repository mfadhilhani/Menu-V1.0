"use client";
import { useState } from "react";
import { ICON_GROUPS } from "@/lib/text";

// Pilih ikon makanan: kisi emoji per kelompok, atau ketik/tempel emoji sendiri. onPick("") = kembali ke ikon otomatis.
export default function IconPicker({ current, auto, onPick, onClose }: { current: string; auto: string; onPick: (e: string) => void; onClose: () => void }) {
  const [v, setV] = useState("");
  return (
    <div className="dlg-bg" role="dialog" aria-modal="true" aria-label="Pilih ikon makanan" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dlg">
        <h3>Pilih ikon makanan</h3>
        <div className="egroups">
          {ICON_GROUPS.map(([label, list]) => (
            <div key={label}>
              <div className="eglabel">{label}</div>
              <div className="egrid">
                {list.map((e) => (
                  <button key={e} type="button" className={e === current ? "on" : ""} onClick={() => onPick(e)} aria-label={`Ikon ${e}`}>{e}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <label style={{ marginTop: 10 }} htmlFor="ownicon">Atau ketik/tempel emoji sendiri</label>
        <div className="inl">
          <input id="ownicon" value={v} maxLength={8} placeholder="😀" onChange={(e) => setV(e.target.value)} />
          <button type="button" className="p" disabled={!v.trim()} onClick={() => onPick(v.trim())}>Pakai</button>
        </div>
        <button type="button" onClick={() => onPick("")}>Kembali ke ikon otomatis ({auto})</button>
        <button type="button" onClick={onClose}>Batal</button>
      </div>
    </div>
  );
}
