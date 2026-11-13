"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { libClearLocal, libDel, libKeys, libLocal, photoServerOn } from "@/lib/photolib";
import { toTitle } from "@/lib/text";
import type { Ask } from "./Confirm";
import { useFoods } from "./FoodsContext";

// Halaman "Simpanan foto menu": melihat dan menghapus foto yang tersimpan per nama menu di perangkat ini.
type Item = { key: string; url: string; size: number };
const PAGE = 24;
const mb = (n: number) => (n >= 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

export default function PhotoLibSection({ toast, confirm }: { toast: (m: string) => void; confirm: (a: Ask) => void }) {
  const { foods } = useFoods();
  const [keys, setKeys] = useState<string[] | null>(null); // null = sedang memuat
  const [items, setItems] = useState<Item[]>([]);
  const [show, setShow] = useState(PAGE);
  const [q, setQ] = useState("");
  const [server, setServer] = useState(false);
  const urls = useRef<string[]>([]);

  const refresh = useCallback(async () => { setKeys(await libKeys()); }, []);
  useEffect(() => { refresh(); photoServerOn().then(setServer); }, [refresh]);
  useEffect(() => () => { urls.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

  const nameOf = (k: string) => foods.find((f) => f.key === k)?.nama || toTitle(k);
  const match = (keys || []).filter((k) => !q.trim() || k.includes(q.trim().toLowerCase()));
  const page = match.slice(0, show), sig = page.join("\n");
  // Muat gambar hanya untuk yang sedang ditampilkan, supaya HP tidak berat kalau simpanannya banyak.
  useEffect(() => {
    let dead = false;
    (async () => {
      const have = new Map(items.map((i) => [i.key, i]));
      const out: Item[] = [];
      for (const k of page) {
        const old = have.get(k);
        if (old) { out.push(old); continue; }
        const b = await libLocal(k);
        if (!b) continue;
        const url = URL.createObjectURL(b);
        urls.current.push(url);
        out.push({ key: k, url, size: b.size });
      }
      if (!dead) setItems(out);
    })();
    return () => { dead = true; };
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  const del = (k: string) => confirm({
    title: `Hapus foto ${nameOf(k)}?`,
    body: <p>Foto ini dihapus dari simpanan{server ? " di perangkat ini dan di server, jadi tidak muncul lagi di perangkat lain" : " di perangkat ini"}. Foto yang sudah terpasang di poster hari ini tidak ikut terlepas.</p>,
    actions: [{ label: "Ya, hapus", kind: "d", run: async () => { await libDel(k); await refresh(); toast(`Foto ${nameOf(k)} dihapus dari simpanan`); } }],
  });
  const delAll = () => confirm({
    title: `Hapus semua ${keys?.length || 0} foto simpanan?`,
    body: <>
      <p>Semua foto simpanan di <b>perangkat ini</b> dihapus. Menu yang sama tidak lagi terisi foto otomatis sampai kamu memasang foto baru.</p>
      {server && <p>Salinan di server tidak dihapus, jadi foto bisa terambil lagi saat nama menunya dipakai. Untuk membuang dari server juga, hapus satu per satu.</p>}
    </>,
    actions: [{ label: "Ya, hapus semua di perangkat ini", kind: "d", run: async () => { const n = await libClearLocal(); await refresh(); toast(`${n} foto dihapus dari simpanan perangkat ini`); } }],
  });

  const total = keys?.length || 0;
  return (
    <section id="simpanan-foto" style={{ scrollMarginTop: 12 }}>
      <h2>Simpanan foto menu</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Foto yang pernah kamu pasang di poster, disimpan per nama menu di browser perangkat ini{server ? " dan di server" : ""}. Foto terpasang otomatis saat nama menu yang sama dipakai lagi.
      </p>
      {keys === null && <p className="hint">Memuat…</p>}
      {keys !== null && !total && <p className="hint">Belum ada foto tersimpan. Pasang foto di kotak poster (tab Menu &amp; Kalori) yang sudah diberi nama menu.</p>}
      {total > 0 && (
        <>
          {total > 8 && <input placeholder="Cari nama menu…" value={q} aria-label="Cari foto simpanan" onChange={(e) => { setQ(e.target.value); setShow(PAGE); }} />}
          <div className="note">{total} foto tersimpan{q.trim() ? `, ${match.length} cocok` : ""}{items.length ? `. Yang tampil: ${mb(items.reduce((a, i) => a + i.size, 0))}` : ""}</div>
          <div className="plib">
            {items.map((i) => (
              <figure key={i.key}>
                <img src={i.url} alt={`Foto ${nameOf(i.key)}`} loading="lazy" />
                <figcaption>{nameOf(i.key)}</figcaption>
                <button type="button" className="x" aria-label={`Hapus foto ${nameOf(i.key)}`} onClick={() => del(i.key)}>✕</button>
              </figure>
            ))}
          </div>
          {!match.length && <p className="hint">Tidak ada nama menu yang cocok.</p>}
          <div className="acts">
            {match.length > show && <button type="button" onClick={() => setShow((n) => n + PAGE)}>Tampilkan lagi ({match.length - show})</button>}
            <button type="button" className="d" onClick={delAll}>Hapus semua di perangkat ini</button>
          </div>
        </>
      )}
    </section>
  );
}
