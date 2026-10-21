"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initMD } from "@/lib/pattern";
import { KR, MealData, MealKey, Slot, State, Sync, TF } from "@/lib/report";
import { idbClear } from "@/lib/idb";
import { JENIS } from "@/lib/options";
import ComboInput from "./ComboInput";
import { mealByHour, norm, todayStr, uid } from "@/lib/text";
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
  tab: "tf", pukul: false, jam: "", zona: "WITA", mealAuto: true, jn: "Reguler", live: false, liveMenu: "", dt: "", meal: "Breakfast", site: "BCP", sxi: "",
  ks: "Makanan dalam kondisi layak untuk dikonsumsi",
  ksite: "DH BCP", camp: "Camp Pelangi", rule: true,
  md: initMD(),
});

export default function App() {
  const { authed, mock, loadError, reload, foods } = useFoods();
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
        setS((p) => {
          // Daftar lama (sebelum ada pola) dibuang; draf hari lain memulai ulang dari pola supaya menu kemarin tidak terbawa.
          const { menu, snack, buah, rows, pb, pd, ...rest } = d.state as Record<string, unknown>;
          void menu; void snack; void buah; void rows; void pb; void pd;
          const stale = d.day !== todayStr();
          return { ...p, ...rest, dt: d.day === todayStr() && (rest.dt as string) ? (rest.dt as string) : todayStr(), ...(stale ? { mealAuto: true, pukul: false, jam: "", live: false, liveMenu: "", md: initMD() } : {}) } as State;
        });
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
  const setMD = useCallback((fn: (d: MealData, m: MealKey) => MealData) => setS((x) => { const m = x.meal as MealKey; return { ...x, md: { ...x.md, [m]: fn(x.md[m], m) } }; }), []);
  const setList = useCallback((k: "menu" | "snack" | "buah") => (fn: (l: TF[]) => TF[]) => setMD((d) => ({ ...d, [k]: fn(d[k]) })), [setMD]);
  const setSlots = useCallback((fn: (l: Slot[]) => Slot[]) => setMD((d) => ({ ...d, slots: fn(d.slots) })), [setMD]);
  const setRows = useCallback((fn: (l: KR[]) => KR[]) => setMD((d) => ({ ...d, rows: fn(d.rows) })), [setMD]);
  const sync = useMemo<Sync>(() => ({
    name: (origin, sid, v) => setMD((d) => ({
      ...d,
      menu: d.menu.map((r) => (r.sid === sid ? { ...r, n: v } : r)),
      snack: d.snack.map((r) => (r.sid === sid ? { ...r, n: v } : r)),
      buah: d.buah.map((r) => (r.sid === sid ? { ...r, n: v } : r)),
      rows: d.rows.map((r) => (r.sid !== sid ? r : origin === "rows" ? { ...r, n: v, pf: false } : { ...r, n: v, kkal: "", ic: undefined, pf: false })),
      slots: d.slots.map((r) => (r.sid !== sid ? r : origin === "slots" ? { ...r, n: v } : { ...r, n: v, kkal: "", desc: "" })),
    })),
    food: (sid, f) => setMD((d, m) => {
      const kk = f.kkal != null ? String(f.kkal).replace(".", ",") : "";
      return {
        ...d,
        menu: d.menu.map((r) => (r.sid === sid ? { ...r, n: f.nama } : r)),
        snack: d.snack.map((r) => (r.sid === sid ? { ...r, n: f.nama } : r)),
        buah: d.buah.map((r) => (r.sid === sid ? { ...r, n: f.nama } : r)),
        rows: d.rows.map((r) => (r.sid === sid ? { ...r, n: f.nama, kkal: kk, ic: f.ikon || r.ic, pf: false } : r)),
        slots: d.slots.map((r) => (r.sid === sid ? { ...r, n: f.nama, kkal: kk, desc: m === "Dinner" ? f.deskripsi || "" : r.desc } : r)),
      };
    }),
    kkal: (sid, v) => setMD((d) => ({
      ...d,
      rows: d.rows.map((r) => (r.sid === sid ? { ...r, kkal: v, pf: false } : r)),
      slots: d.slots.map((r) => (r.sid === sid ? { ...r, kkal: v } : r)),
    })),
  }), [setMD]);
  const toast = useCallback((m: string) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(""), 2800); }, []);
  // Waktu makan mengikuti jam selama "otomatis" aktif; memilih manual mematikannya.
  useEffect(() => {
    if (!loaded || !s.mealAuto) return;
    const tick = () => {
      const m = mealByHour(new Date().getHours());
      setS((p) => {
        if (p.meal === m) return p;
        toast("Waktu makan otomatis: " + m);
        return { ...p, meal: m };
      });
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [loaded, s.mealAuto, toast]);
  // Baris tetap (Nasi Putih, Sambal, dst) mengambil kalori dari Sheet begitu datanya ada.
  useEffect(() => {
    if (!loaded || !foods.length) return;
    setS((x) => {
      let ch = false;
      const md = { ...x.md };
      (["Breakfast", "Dinner"] as MealKey[]).forEach((m) => {
        md[m] = {
          ...md[m],
          rows: md[m].rows.map((r) => {
            if (!r.pf) return r;
            const f = foods.find((y) => y.key === norm(r.n));
            if (!f) return r;
            ch = true;
            return { ...r, n: f.nama, kkal: f.kkal != null ? String(f.kkal).replace(".", ",") : "", ic: f.ikon || r.ic, pf: false };
          }),
        };
      });
      return ch ? { ...x, md } : x;
    });
  }, [loaded, foods]);
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
              <div className="g1">
                <label htmlFor="jn">Jenis menu</label>
                <ComboInput id="jn" value={s.jn} placeholder="Pilih atau ketik sendiri" options={JENIS} onChange={(v) => up({ jn: v })} />
              </div>
              <div className="g1">
                <label className="chk"><input type="checkbox" checked={s.live} onChange={(e) => up({ live: e.target.checked })} /> Live Cooking</label>
                {s.live && <input id="live" value={s.liveMenu} placeholder="Menu yang live (mis. Menu Lalapan)" aria-label="Menu live cooking" onChange={(e) => up({ liveMenu: e.target.value })} style={{ marginTop: 6 }} />}
              </div>
              <div className="g1"><label htmlFor="dt">Tanggal (otomatis hari ini)</label><input id="dt" type="date" value={s.dt} onChange={(e) => up({ dt: e.target.value })} /></div>
              <div className="g2">
                <div>
                  <label htmlFor="meal">Waktu makan</label>
                  <select id="meal" value={s.meal} onChange={(e) => up({ meal: e.target.value, mealAuto: false })}>
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
              <label className="chk"><input type="checkbox" checked={s.mealAuto} onChange={(e) => up(e.target.checked ? { mealAuto: true, meal: mealByHour(new Date().getHours()) } : { mealAuto: false })} /> Waktu makan otomatis sesuai jam</label>
              <div className="note" style={{ marginTop: 2 }}>Breakfast 03.00-08.59, Lunch 09.00-13.59, Dinner 14.00-17.59, Supper 18.00-02.59. Memilih sendiri mematikan otomatis.</div>
              {s.site === "__x" && <div><label htmlFor="sxi">Nama site</label><input id="sxi" value={s.sxi} placeholder="Ketik nama site" onChange={(e) => up({ sxi: e.target.value })} /></div>}
            </section>
            {s.tab === "tf" && <TestFoodTab s={s} up={up} setList={setList} sync={sync} copy={copy} wa={wa} toast={toast} />}
            {s.tab === "kal" && <KaloriTab s={s} up={up} setRows={setRows} setSlots={setSlots} sync={sync} copy={copy} wa={wa} toast={toast} />}
            {s.tab === "his" && <RiwayatTab toast={toast} />}
          </>
        )}
      </main>
      <div id="toast" className={msg ? "on" : ""} role="status">{msg}</div>
    </>
  );
}
