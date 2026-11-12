"use client";
import { cur, KS, lowScores, Origin, SKOR, skorOf, State, Sync, testFoodReport, TF } from "@/lib/report";
import { pad, uid } from "@/lib/text";
import NameInput from "./NameInput";
import { SortableList } from "./Sortable";
import TfCollage from "./TfCollage";

type SetList = (fn: (l: TF[]) => TF[]) => void;
export { uid } from "@/lib/text";

// fmt 2 (baru): nilai 1-5 dengan tombol, bawaan 5. fmt 1 (lama): kolom keterangan bebas, bawaan "Ok".
function Rows({ list, set, aria, sync, origin, fmt }: { list: TF[]; set: SetList; aria: string; sync: Sync; origin: Origin; fmt: 1 | 2 }) {
  const upd = (id: string, p: Partial<TF>) => set((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
  return (
    <SortableList items={list} onChange={(n) => set(() => n)}>
      {(r, i, handle) => (
        <div className={"row" + (fmt === 2 ? " v2" : "")}>
          {handle}
          <b>{i + 1}.</b>
          <NameInput value={r.n} label={`${aria} ${i + 1}`} onChange={(v) => (r.sid ? sync.name(origin, r.sid, v) : upd(r.id, { n: v }))} onFood={(f) => (r.sid ? sync.food(r.sid, f) : upd(r.id, { n: f.nama }))} />
          {fmt === 1 && <input className="ket" value={r.k} placeholder="Ket." aria-label={`Keterangan ${i + 1}`} onChange={(e) => upd(r.id, { k: e.target.value })} />}
          <button type="button" className="x" aria-label={`Hapus baris ${i + 1}`} onClick={() => set((l) => l.filter((x) => x.id !== r.id))}>✕</button>
          {fmt === 2 && (
            <div className="skor" role="radiogroup" aria-label={`Nilai ${r.n || aria + " " + (i + 1)}`}>
              {SKOR.map(([n, label]) => (
                <button key={n} type="button" role="radio" aria-checked={skorOf(r) === n} title={label} className={(skorOf(r) === n ? "on " : "") + "s" + n} onClick={() => upd(r.id, { sc: n })}>{n}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </SortableList>
  );
}

type Props = { s: State; up: (p: Partial<State>) => void; setList: (k: "menu" | "snack" | "buah") => SetList; sync: Sync; copy: (t: string) => void; wa: (t: string) => void; toast: (m: string) => void; ns: string };
export default function TestFoodTab({ s, up, setList, sync, copy, wa, toast, ns }: Props) {
  const d = cur(s), fmt = s.tfFmt === 1 ? 1 : 2;
  const add = (k: "menu" | "snack" | "buah") => setList(k)((l) => [...l, { id: uid(), n: "", k: "Ok", sc: 5 }]);
  const text = testFoodReport(s);
  const dinner = s.meal === "Dinner";
  const now = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const low = lowScores(s);
  // Ganti format: kesimpulan bawaan ikut diganti kalau belum diubah sendiri.
  const setFmt = (f: 1 | 2) => up({ tfFmt: f, ...(s.ks.trim() === KS[fmt] ? { ks: KS[f] } : {}) });
  return (
    <>
      <section>
        <h2>Format laporan</h2>
        <div className="seg" role="radiogroup" aria-label="Format laporan Test Food">
          <button type="button" role="radio" aria-checked={fmt === 2} className={fmt === 2 ? "on" : ""} onClick={() => setFmt(2)}>Nilai 1-5 (baru)</button>
          <button type="button" role="radio" aria-checked={fmt === 1} className={fmt === 1 ? "on" : ""} onClick={() => setFmt(1)}>Keterangan (lama)</button>
        </div>
        <div className="note">
          {fmt === 2
            ? "Tiap menu diberi nilai 1-5 (bawaan 5 = Baik Sekali). Keterangan nilai ditulis otomatis di laporan."
            : "Format sebelumnya: tiap menu diberi keterangan bebas (bawaan “Ok”)."}
          {" "}Nilai dan keterangan sama-sama tersimpan, jadi pindah format tidak menghapus isian.
        </div>
        <label className="chk">
          <input type="checkbox" checked={s.pukul} onChange={(e) => up(e.target.checked ? { pukul: true, jam: s.jam || now() } : { pukul: false })} /> Tampilkan “Pukul” di laporan
        </label>
        {s.pukul && (
          <>
            <div className="g2" style={{ marginTop: 8 }}>
              <div><label htmlFor="jam">Jam</label><input id="jam" type="time" value={s.jam} onChange={(e) => up({ jam: e.target.value })} /></div>
              <div>
                <label htmlFor="zona">Zona waktu</label>
                <select id="zona" value={s.zona} onChange={(e) => up({ zona: e.target.value })}>
                  {["WIB", "WITA", "WIT"].map((z) => <option key={z}>{z}</option>)}
                </select>
              </div>
            </div>
            <div className="acts"><button type="button" onClick={() => up({ jam: now() })}>Pakai jam sekarang</button></div>
          </>
        )}
      </section>
      <section>
        <h2>Daftar menu {s.meal}</h2>
        <Rows list={d.menu} set={setList("menu")} aria="Nama makanan" sync={sync} origin="menu" fmt={fmt} />
        <p className="hint">Ketik nama makanan lalu pilih dari saran, atau selesaikan mengetik: data dicocokkan atau ditambahkan otomatis. Tahan dan geser ⠿ untuk memindah urutan.</p>
        <div className="acts"><button className="p" type="button" onClick={() => add("menu")}>+ Tambah menu</button></div>
      </section>
      {dinner && (
        <>
          <section>
            <h2>Snack</h2>
            <Rows list={d.snack} set={setList("snack")} aria="Nama snack" sync={sync} origin="snack" fmt={fmt} />
            <div className="acts"><button className="p" type="button" onClick={() => add("snack")}>+ Tambah snack</button></div>
          </section>
          <section>
            <h2>Buah</h2>
            <Rows list={d.buah} set={setList("buah")} aria="Nama buah" sync={sync} origin="buah" fmt={fmt} />
            <div className="acts"><button className="p" type="button" onClick={() => add("buah")}>+ Tambah buah</button></div>
          </section>
        </>
      )}
      <section>
        <h2>Kesimpulan</h2>
        <textarea rows={2} value={s.ks} onChange={(e) => up({ ks: e.target.value })} />
        {low.length > 0 && <p className="warn">Ada menu bernilai 2 ke bawah ({low.join(", ")}). Periksa lagi apakah kesimpulannya masih sesuai.</p>}
      </section>
      <section>
        <h2>Hasil laporan</h2>
        <textarea id="pv" readOnly value={text} />
        <div className="acts">
          <button type="button" onClick={() => copy(text)}>Salin teks</button>
          <button type="button" className="p" onClick={() => wa(text)}>Kirim teks ke WhatsApp</button>
        </div>
      </section>
      <TfCollage text={text} date={s.dt} toast={toast} ns={ns} />
    </>
  );
}
