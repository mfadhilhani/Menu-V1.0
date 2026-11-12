"use client";
import { ReactNode, useEffect } from "react";

// Pop up konfirmasi. Di HP tampil sebagai lembar dari bawah supaya tombolnya dekat dengan jempol.
export type Ask = { title: string; body: ReactNode; actions: { label: string; kind?: "p" | "d"; run: () => void }[]; cancel?: string };

export default function Confirm({ ask, onClose }: { ask: Ask; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="dlg-bg" role="dialog" aria-modal="true" aria-label={ask.title} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dlg">
        <h3>{ask.title}</h3>
        <div className="dlg-body">{ask.body}</div>
        {ask.actions.map((a) => (
          <button key={a.label} type="button" className={a.kind === "p" ? "p" : a.kind === "d" ? "d" : ""} onClick={() => { onClose(); a.run(); }}>{a.label}</button>
        ))}
        <button type="button" onClick={onClose}>{ask.cancel || "Batal"}</button>
      </div>
    </div>
  );
}
