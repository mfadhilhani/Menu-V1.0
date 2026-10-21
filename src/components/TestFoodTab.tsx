"use client";
import { cur, Origin, State, Sync, testFoodReport, TF } from "@/lib/report";
import { pad, uid } from "@/lib/text";
import NameInput from "./NameInput";
import { SortableList } from "./Sortable";
import TfCollage from "./TfCollage";

type SetList = (fn: (l: TF[]) => TF[]) => void;
export { uid } from "@/lib/text";

function Rows({ list, set, aria, sync, origin }: { list: TF[]; set: SetList; aria: string; sync: Sync; origin: Origin }) {
  const upd = (id: string, p: Partial<TF>) => set((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
  return (
    <SortableList items={list} onChange={(n) => set(() => n)}>
      {(r, i, handle) => (
        <div className="row">
          {handle}
          <b>{i + 1}.</b>
          <NameInput value={r.n} label={`${aria} ${i + 1}`} onChange={(v) => (r.sid ? sync.name(origin, r.sid, v) : upd(r.id, { n: v }))} onFood={(f) => (r.sid ? sync.food(r.sid, f) : upd(r.id, { n: f.nama }))} />
          <input value={r.k} placeholder="Ket." aria-label={`Keterangan ${i + 1}`} onChange={(e) => upd(r.id, { k: e.target.value })} />
          <button type="button" className="x" aria-label={`Hapus baris ${i + 1}`} onClick={() => set((l) => l.filter((x) => x.id !== r.id))}>✕</button>
        </div>
      )}
    </SortableList>
  );
}

type Props = { s: State; up: (p: Partial<State>) => void; setList: (k: "menu" | "snack" | "buah") => SetList; sync: Sync; copy: (t: string) => void; wa: (t: string) => void; toast: (m: string) => void };
export default function TestFoodTab({ s, up, setList, sync, copy, wa, toast }: Props) {
  const d = cur(s);
  const add = (k: "menu" | "snack" | "buah") => setList(k)((l) => [...l, { id: uid(), n: "", k: "Ok" }]);
  const text = testFoodReport(s);
  const dinner = s.meal === "Dinner";
  const now = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  return (
    <>
      <section>
        <h2>Waktu test food</h2>
        <label className="chk" style={{ marginTop: 0 }}>
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
        <h2>Daftar menu</h2>
        <Rows list={d.menu} set={setList("menu")} aria="Nama makanan" sync={sync} origin="menu" />
        <p className="hint">Ketik nama makanan: saran dari data Sheet muncul. Selesai mengetik, data dicocokkan atau ditambahkan otomatis. Geser ⠿ untuk memindah urutan.</p>
        <div className="acts"><button className="p" type="button" onClick={() => add("menu")}>+ Tambah menu</button></div>
      </section>
      {dinner && (
        <>
          <section>
            <h2>Snack</h2>
            <Rows list={d.snack} set={setList("snack")} aria="Nama snack" sync={sync} origin="snack" />
            <div className="acts"><button className="p" type="button" onClick={() => add("snack")}>+ Tambah snack</button></div>
          </section>
          <section>
            <h2>Buah</h2>
            <Rows list={d.buah} set={setList("buah")} aria="Nama buah" sync={sync} origin="buah" />
            <div className="acts"><button className="p" type="button" onClick={() => add("buah")}>+ Tambah buah</button></div>
          </section>
        </>
      )}
      <section>
        <h2>Kesimpulan</h2>
        <textarea rows={2} value={s.ks} onChange={(e) => up({ ks: e.target.value })} />
      </section>
      <section>
        <h2>Hasil laporan</h2>
        <textarea id="pv" readOnly value={text} />
        <div className="acts">
          <button type="button" onClick={() => copy(text)}>Salin teks</button>
          <button type="button" className="p" onClick={() => wa(text)}>Kirim teks ke WhatsApp</button>
        </div>
      </section>
      <TfCollage text={text} date={s.dt} toast={toast} />
    </>
  );
}
