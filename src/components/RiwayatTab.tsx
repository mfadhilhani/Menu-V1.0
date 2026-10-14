"use client";
import { useRef, useState } from "react";
import { norm, num } from "@/lib/text";
import { Food, useFoods } from "./FoodsContext";

function HRow({ f }: { f: Food }) {
  const { patchFood, removeFood } = useFoods();
  const [k, setK] = useState(f.kkal != null ? String(f.kkal).replace(".", ",") : "");
  const [d, setD] = useState(f.deskripsi);
  return (
    <div className="hr">
      <div className="hn">{f.nama}</div>
      <button type="button" className="x" title="Hapus dari Sheet" onClick={() => { if (window.confirm(`Hapus "${f.nama}" dari Sheet?`)) removeFood(f.key); }}>✕</button>
      <input className="hk" inputMode="decimal" placeholder="kkal/100 g" value={k} onChange={(e) => setK(e.target.value)}
        onBlur={() => { const v = num(k); if (v !== f.kkal) patchFood(f.key, { kkal: v, status: "sudah dicek" }); }} />
      <select className="hs" value={f.status || "belum dicek"} onChange={(e) => patchFood(f.key, { status: e.target.value })}>
        <option value="belum dicek">belum dicek</option>
        <option value="sudah dicek">sudah dicek</option>
      </select>
      <input className="hd2" maxLength={120} placeholder="Deskripsi singkat (maks. 14 kata)" value={d} onChange={(e) => setD(e.target.value)}
        onBlur={() => { if (d.trim() !== f.deskripsi) patchFood(f.key, { deskripsi: d }); }} />
      <div className="hm">Sumber: {f.sumber || "-"}</div>
    </div>
  );
}

export default function RiwayatTab({ toast }: { toast: (m: string) => void }) {
  const { foods, reload, mock } = useFoods();
  const [q, setQ] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const nq = norm(q);
  const list = foods.filter((f) => !nq || f.key.includes(nq));
  const unchecked = foods.filter((f) => f.status !== "sudah dicek").length;

  async function importOld(f: File) {
    try {
      const o = JSON.parse(await f.text()) as Record<string, { n?: string; k?: number; d?: string }>;
      const items = Object.values(o).filter((v) => v && typeof v.n === "string").map((v) => ({ n: v.n, k: v.k, d: v.d }));
      const r = await fetch("/api/foods/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await reload();
      toast(`${j.added} makanan ditambahkan, ${j.skipped} sudah ada`);
    } catch { toast("File cadangan tidak bisa dibaca"); }
  }
  return (
    <section>
      <h2>Riwayat makanan (Google Sheets)</h2>
      {mock && <p className="hint">Mode coba: data hanya sementara di memori server dan AI berupa contoh.</p>}
      <input placeholder="Cari makanan…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="note">{foods.length} makanan, {unchecked} belum dicek{list.length > 80 ? " (80 pertama ditampilkan, pakai kolom cari)" : ""}</div>
      <div>{list.slice(0, 80).map((f) => <HRow key={f.key + f.diubah} f={f} />)}</div>
      <div className="acts">
        <button type="button" onClick={() => reload().then(() => toast("Data dimuat ulang dari Sheet"))}>Muat ulang dari Sheet</button>
        <button type="button" onClick={() => file.current?.click()}>Impor cadangan lama</button>
        <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importOld(f); }} />
      </div>
      <p className="hint">Makanan baru dari AI masuk dengan status “belum dicek”. Ubah kalori atau deskripsi di sini (atau langsung di Sheet), lalu tandai “sudah dicek”.</p>
    </section>
  );
}
