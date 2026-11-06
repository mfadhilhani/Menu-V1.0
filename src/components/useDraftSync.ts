"use client";
// Sinkronisasi isian (teks saja) antar perangkat lewat /api/draft. Foto tidak ikut, tetap di perangkat masing-masing.
// Cara kerja:
// - Isian tetap disimpan di localStorage seperti biasa (cepat dan aman kalau offline).
// - Saat dibuka, tiap 20 detik selama halaman terlihat, dan saat kembali ke tab ini, perangkat mengambil draf dari server.
//   Kalau draf server lebih baru (diubah belakangan), isian di perangkat ini diganti dengan draf itu.
// - Setiap perubahan dikirim ke server 1,5 detik setelah berhenti mengetik, dan langsung saat tab ditutup/diganti.
// - Yang terakhir diubah menang. Tab yang sedang dibuka (Test Food / Menu & Kalori / Riwayat) tidak ikut disinkronkan.
import { useCallback, useEffect, useRef, useState } from "react";
import type { State } from "@/lib/report";
import { workDay } from "@/lib/text";

export type SyncStatus = { state: "wait" | "saving" | "ok" | "error"; at: number; device: string };
type Remote = { at: number; day: string; device: string; state?: Record<string, unknown> };

export const synced = (s: State) => {
  const { tab, ...rest } = s;
  void tab;
  return rest;
};
const deviceName = () => (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "HP" : "Laptop/PC");
const POLL = 20000, DEBOUNCE = 1500;

type Opts = {
  s: State;
  setS: (fn: (p: State) => State) => void;
  loaded: boolean;
  authed: boolean | null;
  siteId: string;                // site yang sedang dibuka halaman ini (dikirim sebagai X-Site)
  day: { current: string };      // hari kerja draf ini (diatur saat draf dimuat)
  at: { current: number };       // waktu perubahan terakhir isian di perangkat ini (0 = belum pernah diubah)
  onRemote?: (device: string) => void;
};

// Server menjawab 409 "site" kalau cookie di browser ini sudah milik site lain (login di tab lain):
// isian halaman ini tidak dikirim, halaman dimuat ulang mengikuti site baru.
const siteChanged = async (r: Response) => {
  if (r.status !== 409) return false;
  const j = await r.clone().json().catch(() => ({}));
  if (j.error !== "site") return false;
  location.reload();
  return true;
};

export function useDraftSync({ s, setS, loaded, authed, siteId, day, at, onRemote }: Opts) {
  const [status, setStatus] = useState<SyncStatus>({ state: "wait", at: 0, device: "" });
  const last = useRef("");        // JSON isian terakhir yang sama dengan server
  const ready = useRef(false);
  const busy = useRef(false);
  const sRef = useRef(s);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cb = useRef(onRemote);
  sRef.current = s;
  cb.current = onRemote;

  const apply = useCallback((r: Remote) => {
    clearTimeout(timer.current);
    at.current = r.at;
    setS((p) => {
      const next = { ...p, ...(r.state as Partial<State>), tab: p.tab } as State;
      last.current = JSON.stringify(synced(next));
      return next;
    });
    setStatus({ state: "ok", at: r.at, device: r.device });
    cb.current?.(r.device);
  }, [setS, at]);

  const push = useCallback(async (keepalive = false) => {
    const st = synced(sRef.current), json = JSON.stringify(st);
    if (json === last.current || at.current <= 0) return;
    if (busy.current && !keepalive) { clearTimeout(timer.current); timer.current = setTimeout(() => push(), DEBOUNCE); return; }
    busy.current = true;
    setStatus((x) => ({ ...x, state: "saving" }));
    const sentAt = at.current;
    try {
      const r = await fetch("/api/draft", {
        method: "PUT", keepalive, headers: { "Content-Type": "application/json", "X-Site": siteId },
        body: JSON.stringify({ at: sentAt, day: day.current, device: deviceName(), state: st }),
      });
      if (await siteChanged(r)) return;
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      if (j.ok) { last.current = json; setStatus({ state: "ok", at: sentAt, device: deviceName() }); }
      else if (j.draft && j.draft.day === day.current) apply(j.draft as Remote);   // perangkat lain mengubah lebih belakangan
      else if (j.draft && j.draft.day > day.current && workDay() > day.current) location.reload(); // hari kerja baru
      else setStatus((x) => ({ ...x, state: "ok" }));
    } catch {
      setStatus((x) => ({ ...x, state: "error" }));
    } finally {
      busy.current = false;
    }
  }, [apply, at, day, siteId]);

  const pull = useCallback(async () => {
    if (busy.current) return;
    if (workDay() > day.current) { location.reload(); return; } // sudah lewat pukul 03.00: mulai hari baru
    busy.current = true;
    let r: Remote | null = null, ok = false;
    try {
      const res = await fetch(`/api/draft?since=${at.current}`, { cache: "no-store", headers: { "X-Site": siteId } });
      if (await siteChanged(res)) { busy.current = false; return; }
      const j = await res.json().catch(() => ({}));
      if (res.ok) { ok = true; r = (j.draft as Remote | null) ?? null; }
    } catch { /* offline */ }
    busy.current = false;
    if (!ok) { setStatus((x) => ({ ...x, state: "error" })); return; }
    if (r && r.day === day.current && r.at > at.current && r.state) { apply(r); return; }
    // Draf server bertanggal lebih baru tapi jam perangkat ini belum lewat 03.00: abaikan (jam perangkat berbeda).
    if (JSON.stringify(synced(sRef.current)) !== last.current && at.current > 0) { await push(); return; }
    setStatus((x) => ({ state: "ok", at: x.at || r?.at || 0, device: x.device || r?.device || "" }));
  }, [apply, push, at, day, siteId]);

  // Ambil draf server sekali saat dibuka, sebelum mengirim apa pun (supaya isian perangkat lain tidak tertimpa).
  useEffect(() => {
    if (!loaded || !authed || ready.current) return;
    (async () => {
      await pull();
      // Isian yang belum pernah diubah (draf baru dari pola) tidak dikirim; anggap sudah sama.
      if (at.current <= 0 && !last.current) last.current = JSON.stringify(synced(sRef.current));
      ready.current = true;
    })();
  }, [loaded, authed, pull, at]);

  // Setiap perubahan isian: catat waktunya lalu kirim setelah jeda singkat.
  useEffect(() => {
    if (!loaded || !ready.current) return;
    const json = JSON.stringify(synced(s));
    if (json === last.current) return;
    at.current = Date.now();
    setStatus((x) => ({ ...x, state: "saving" }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => push(), DEBOUNCE);
  }, [s, loaded, push, at]);

  // Cek berkala selama halaman terlihat; kirim langsung saat tab disembunyikan atau ditutup.
  useEffect(() => {
    if (!loaded || !authed) return;
    const tick = () => { if (ready.current && document.visibilityState === "visible") pull(); };
    const vis = () => {
      if (!ready.current) return;
      if (document.visibilityState === "hidden") { clearTimeout(timer.current); push(true); }
      else pull();
    };
    const id = setInterval(tick, POLL);
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("focus", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); window.removeEventListener("focus", tick); };
  }, [loaded, authed, pull, push]);

  return { status, syncNow: pull };
}
