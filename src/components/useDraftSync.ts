"use client";
// Sinkronisasi isian (teks saja) antar perangkat pada SITE YANG SAMA lewat /api/draft. Foto poster tidak ikut.
// Cara kerja:
// - Isian tetap disimpan di localStorage per site (cepat dan aman kalau offline).
// - Server menyimpan satu draf per site, dengan nomor versi yang diberi server.
// - Saat dibuka, tiap 20 detik selama halaman terlihat, dan saat kembali ke tab ini, perangkat menanyakan versi terbaru.
//   Kalau ada yang lebih baru: diambil. Perubahan di perangkat ini yang belum terkirim digabung per bagian/per baris
//   (lihat lib/merge.ts), jadi dua orang pada site yang sama tidak saling menimpa selama mengisi baris berbeda.
// - Setiap perubahan dikirim 1,5 detik setelah berhenti mengetik, dan langsung saat tab disembunyikan/ditutup.
//   Kiriman menyebut versi yang terakhir dilihat; kalau server sudah punya versi lain, server mengirim balik
//   drafnya, perangkat menggabungkan, lalu mengirim ulang.
// - Kalau sinkronisasi dimatikan (enabled = false) atau site belum diberi nama, tidak ada yang dikirim atau diambil.
import { useCallback, useEffect, useRef, useState } from "react";
import { merge3 } from "@/lib/merge";
import { State, synced } from "@/lib/report";
import { workDay } from "@/lib/text";

export type SyncStatus = { state: "off" | "wait" | "saving" | "ok" | "error"; at: number; device: string };
// ver = versi server yang terakhir dilihat; base = JSON isian pada versi itu (untuk tahu apa yang berubah di sini).
export type SyncMeta = { ver: number; base: string };
type Remote = { at: number; day: string; device: string; state?: Record<string, unknown> };
type Obj = Record<string, unknown>;

export const deviceName = () => (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "HP" : "Laptop/PC");
const POLL = 20000, DEBOUNCE = 1500;
const parse = (j: string): Obj | null => { try { const o = JSON.parse(j); return o && typeof o === "object" ? (o as Obj) : null; } catch { return null; } };

type Opts = {
  s: State;
  setS: (fn: (p: State) => State) => void;
  loaded: boolean;
  authed: boolean | null;
  enabled: boolean;              // sinkronisasi dinyalakan di perangkat ini
  site: string;                  // kunci site ("" = belum ada nama: tidak disinkronkan)
  day: { current: string };      // hari kerja draf ini
  meta: { current: SyncMeta };   // versi dan isian terakhir yang sama dengan server (disimpan bersama draf lokal)
  onMeta?: () => void;           // dipanggil setelah meta berubah, supaya ikut tersimpan
  onRemote?: (device: string) => void;
};

export function useDraftSync({ s, setS, loaded, authed, enabled, site, day, meta, onMeta, onRemote }: Opts) {
  const [status, setStatus] = useState<SyncStatus>({ state: "wait", at: 0, device: "" });
  const active = loaded && !!authed && enabled && !!site;
  const gen = useRef(0);          // naik setiap site/aktif berubah: jawaban permintaan lama diabaikan
  const ready = useRef(false);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sRef = useRef(s), siteRef = useRef(site), activeRef = useRef(active), cb = useRef(onRemote), cbMeta = useRef(onMeta);
  sRef.current = s; siteRef.current = site; activeRef.current = active; cb.current = onRemote; cbMeta.current = onMeta;

  const localJson = () => JSON.stringify(synced(sRef.current));
  const setMeta = useCallback((m: SyncMeta) => { meta.current = m; cbMeta.current?.(); }, [meta]);

  // Draf server lebih baru: pakai, sambil mempertahankan perubahan di perangkat ini yang belum terkirim.
  const take = useCallback((r: Remote) => {
    clearTimeout(timer.current);
    const cur = sRef.current, local = synced(cur) as unknown as Obj;
    // Disusun dengan urutan kunci isian lokal, supaya perbandingan JSON berikutnya tidak salah karena urutan kunci.
    const shape = (st: Obj) => synced({ ...cur, ...st, tab: cur.tab, site: cur.site, sxi: cur.sxi } as State) as unknown as Obj;
    const remote = shape(r.state || {});
    const dirty = JSON.stringify(local) !== meta.current.base;
    const next = dirty ? shape(merge3(parse(meta.current.base), local, remote)) : remote;
    setMeta({ ver: r.at, base: JSON.stringify(remote) });
    const changed = JSON.stringify(next) !== JSON.stringify(local);
    if (changed) setS((p) => ({ ...p, ...(next as Partial<State>), tab: p.tab, site: p.site, sxi: p.sxi }));
    setStatus({ state: JSON.stringify(next) === JSON.stringify(remote) ? "ok" : "saving", at: r.at, device: r.device });
    if (changed) cb.current?.(r.device);
    return JSON.stringify(next) !== JSON.stringify(remote); // masih ada perubahan lokal yang perlu dikirim
  }, [meta, setMeta, setS]);

  const push = useCallback(async (keepalive = false): Promise<void> => {
    if (!activeRef.current || (!ready.current && !keepalive)) return;
    const body = localJson();
    if (body === meta.current.base) return;
    if (busy.current && !keepalive) { clearTimeout(timer.current); timer.current = setTimeout(() => push(), DEBOUNCE); return; }
    const g = gen.current;
    busy.current = true;
    setStatus((x) => ({ ...x, state: "saving" }));
    let again = false;
    try {
      const r = await fetch("/api/draft", {
        method: "PUT", keepalive, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: siteRef.current, base: meta.current.ver, day: day.current, device: deviceName(), state: JSON.parse(body) }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; at?: number; draft?: Remote; error?: string };
      if (g !== gen.current) return;
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      if (j.ok && j.at) { setMeta({ ver: j.at, base: body }); setStatus({ state: "ok", at: j.at, device: deviceName() }); again = localJson() !== body; }
      else if (j.draft && j.draft.day === day.current) again = take(j.draft);      // perangkat lain mengubah lebih dulu: gabungkan
      else if (j.draft && j.draft.day > day.current && workDay() > day.current) location.reload(); // hari kerja baru
      else setStatus((x) => ({ ...x, state: "ok" }));
    } catch {
      if (g === gen.current) setStatus((x) => ({ ...x, state: "error" }));
    } finally {
      if (g === gen.current) busy.current = false;
    }
    if (again && g === gen.current) { clearTimeout(timer.current); timer.current = setTimeout(() => push(), 400); }
  }, [day, meta, setMeta, take]); // eslint-disable-line react-hooks/exhaustive-deps

  const pull = useCallback(async (): Promise<void> => {
    if (!activeRef.current || busy.current) return;
    if (workDay() > day.current) { location.reload(); return; } // sudah lewat pukul 03.00: mulai hari baru
    const g = gen.current;
    busy.current = true;
    let r: Remote | null = null, ok = false;
    try {
      const res = await fetch(`/api/draft?site=${encodeURIComponent(siteRef.current)}&since=${meta.current.ver}`, { cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as { draft?: Remote | null };
      if (res.ok) { ok = true; r = j.draft ?? null; }
    } catch { /* offline */ }
    if (g !== gen.current) return;
    busy.current = false;
    if (!ok) { setStatus((x) => ({ ...x, state: "error" })); return; }
    // Draf server dari hari kerja lain diabaikan (kemarin: akan ditimpa; besok: jam perangkat ini berbeda).
    if (r && r.day === day.current && r.at !== meta.current.ver && r.state) { if (!take(r)) return; }
    ready.current = true; // draf server sudah dilihat: sekarang boleh mengirim
    if (localJson() !== meta.current.base) { await push(); return; }
    setStatus((x) => ({ state: "ok", at: r?.at || x.at || 0, device: r?.device || x.device || "" }));
  }, [day, meta, push, take]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mulai (atau mulai ulang saat site berganti / sinkronisasi dinyalakan): ambil draf server dulu sebelum mengirim apa pun.
  useEffect(() => {
    gen.current++;
    ready.current = false;
    busy.current = false;
    clearTimeout(timer.current);
    if (!active) { setStatus({ state: enabled && site ? "wait" : "off", at: 0, device: "" }); return; }
    setStatus({ state: "wait", at: 0, device: "" });
    const g = gen.current;
    (async () => {
      await pull();
      if (g === gen.current) ready.current = true;
    })();
  }, [active, site]); // eslint-disable-line react-hooks/exhaustive-deps

  // Setiap perubahan isian: kirim setelah jeda singkat.
  useEffect(() => {
    if (!active || !ready.current) return;
    if (JSON.stringify(synced(s)) === meta.current.base) return;
    setStatus((x) => (x.state === "saving" ? x : { ...x, state: "saving" }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => push(), DEBOUNCE);
  }, [s, active, push, meta]);

  // Cek berkala selama halaman terlihat; kirim langsung saat tab disembunyikan atau ditutup.
  useEffect(() => {
    if (!active) return;
    const tick = () => { if (ready.current && document.visibilityState === "visible") pull(); };
    const vis = () => {
      if (!ready.current) return;
      if (document.visibilityState === "hidden") { clearTimeout(timer.current); push(true); }
      else pull();
    };
    const id = setInterval(tick, POLL);
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("focus", tick);
    window.addEventListener("online", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); window.removeEventListener("focus", tick); window.removeEventListener("online", tick); };
  }, [active, pull, push]);

  // flush: kirim sekarang juga (dipakai sebelum pindah site, supaya isian site lama tidak tertinggal).
  const flush = useCallback(() => { clearTimeout(timer.current); if (ready.current) push(true); }, [push]);
  return { status, syncNow: pull, flush };
}
