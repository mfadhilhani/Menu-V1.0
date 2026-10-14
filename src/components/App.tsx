"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { KR, Slot, State, TF } from "@/lib/report";
import { idbClear } from "@/lib/idb";
import { todayStr, uid } from "@/lib/text";
import { useFoods } from "./FoodsContext";
import KaloriTab from "./KaloriTab";
import Login from "./Login";
import RiwayatTab from "./RiwayatTab";
import TestFoodTab from "./TestFoodTab";

const KEY = "tfm2_draft";
const mkTF = (n: number): TF[] => Array.from({ length: n }, () => ({ id: uid(), n: "", k: "Ok" }));
const mkKR = (n: number): KR[] => Array.from({ length: n }, () => ({ id: uid(), n: "", kkal: "", gram: "100" }));
const mkSlot = (n: number): Slot[] => Array.from({ length: n }, () => ({ id: uid(), n: "", kkal: "", desc: "" }));
const init = (): State => ({
  tab: "tf", jn: "Reguler", dt: "", meal: "Breakfast", site: "BCP", sxi: "",
  ks: "Makanan dalam kondisi layak untuk dikonsumsi",
  menu: mkTF(6), snack: mkTF(2), buah: mkTF(1),
  ksite: "DH BCP", camp: "Camp Pelangi", rule: true, rows: mkKR(6),
  pb: mkSlot(4), pd: mkSlot(6),
});

export default function App() {
  const { authed, mock, loadError, reload } = useFoods();
  const [s, setS] = useState<State>(init);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [sure, setSure] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Muat draf terakhir; kalau drafnya dari hari lain, isinya dipulihkan tapi tanggal diatur ke hari ini.
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "null");
      if (d && d.v === 1 && d.state) {
        setS((p) => ({ ...p, ...d.state, dt: d.day === todayStr() && d.state.dt ? d.state.dt : todayStr() }));
        setLoaded(true);
        return;
      }
    } catch { /* abaikan draf rusak */ }
    setS((p) => ({ ...p, dt: todayStr() }));
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, day: todayStr(), state: s })); } catch { /* penuh */ } }, 300);
    return () => clearTimeout(t);
  }, [s, loaded]);

  const up = useCallback((p: Partial<State>) => setS((x) => ({ ...x, ...p })), []);
  const setList = useCallback((k: "menu" | "snack" | "buah") => (fn: (l: TF[]) => TF[]) => setS((x) => ({ ...x, [k]: fn(x[k]) })), []);
  const setSlots = useCallback((m: "Breakfast" | "Dinner") => (fn: (l: Slot[]) => Slot[]) => setS((x) => (m === "Breakfast" ? { ...x, pb: fn(x.pb) } : { ...x, pd: fn(x.pd) })), []);
  const setRows = useCallback((fn: (l: KR[]) => KR[]) => setS((x) => ({ ...x, rows: fn(x.rows) })), []);
  const toast = useCallback((m: string) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(""), 2800); }, []);
  const copy = useCallback(async (t: string) => { try { await navigator.clipboard.writeText(t); toast("Teks disalin"); } catch { toast("Gagal menyalin, salin manual"); } }, [toast]);
  const wa = useCallback((t: string) => { window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank"); }, []);

  const reset = async () => {
    if (!sure) { setSure(true); setTimeout(() => setSure(false), 4000); return; }
    try { localStorage.removeItem(KEY); } catch { /* abaikan */ }
    await idbClear();
    location.reload();
  };
  const tabs: [State["tab"], string][] = [["tf", "Test Food"], ["kal", "Menu & Kalori"], ["his", "Riwayat"]];
  return (
    <>
      <header>
        <div className="hi">
          <h1>Tes<span>food</span></h1>
          <p className="sub">Test food, menu kalori, dan data makanan dalam satu tempat.</p>
          <nav className="tabs">
            {tabs.map(([k, t]) => (
              <button key={k} type="button" className={"tb" + (s.tab === k ? " on" : "")} onClick={() => up({ tab: k })}>{t}</button>
            ))}
          </nav>
        </div>
      </header>
      <main>
        {authed === null && !loadError && <p className="hint">Memuat…</p>}
        {authed === null && loadError && (
          <section>
            <h2>Data belum bisa dimuat</h2>
            <p className="err">{loadError}</p>
            <p className="hint">Periksa pengaturan di .env.local (lokal) atau Environment Variables (Vercel), lalu coba lagi.</p>
            <div className="acts"><button className="p" type="button" onClick={() => reload()}>Coba lagi</button></div>
          </section>
        )}
        {authed === false && <Login />}
        {authed && (
          <>
            <div className="note" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "0 0 12px" }}>
              <span>Isian dan foto tersimpan otomatis di browser ini.</span>
              <button type="button" style={{ padding: "4px 10px", fontSize: 12 }} onClick={reset}>{sure ? "Yakin? Klik lagi untuk hapus semua isian" : "Mulai baru"}</button>
            </div>
            {mock && <p className="hint">Mode coba aktif: data makanan hanya sementara dan AI berupa contoh.</p>}
            <section>
              <h2>Info umum</h2>
              <div className="g1"><label htmlFor="jn">Jenis menu</label><input id="jn" value={s.jn} placeholder="Reguler" onChange={(e) => up({ jn: e.target.value })} /></div>
              <div className="g1"><label htmlFor="dt">Tanggal (otomatis hari ini)</label><input id="dt" type="date" value={s.dt} onChange={(e) => up({ dt: e.target.value })} /></div>
              <div className="g2">
                <div>
                  <label htmlFor="meal">Waktu makan</label>
                  <select id="meal" value={s.meal} onChange={(e) => up({ meal: e.target.value })}>
                    {["Breakfast", "Lunch", "Dinner", "Supper"].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="site">Site</label>
                  <select id="site" value={s.site} onChange={(e) => up({ site: e.target.value })}>
                    <option>BCP</option>
                    <option value="__x">Lainnya…</option>
                  </select>
                </div>
              </div>
              {s.site === "__x" && <div><label htmlFor="sxi">Nama site</label><input id="sxi" value={s.sxi} placeholder="Ketik nama site" onChange={(e) => up({ sxi: e.target.value })} /></div>}
            </section>
            {s.tab === "tf" && <TestFoodTab s={s} up={up} setList={setList} copy={copy} wa={wa} toast={toast} />}
            {s.tab === "kal" && <KaloriTab s={s} up={up} setRows={setRows} setSlots={setSlots} copy={copy} wa={wa} toast={toast} />}
            {s.tab === "his" && <RiwayatTab toast={toast} />}
          </>
        )}
      </main>
      <div id="toast" className={msg ? "on" : ""} role="status">{msg}</div>
    </>
  );
}
