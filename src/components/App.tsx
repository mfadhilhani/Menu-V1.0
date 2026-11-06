"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fillMealPattern, initMD } from "@/lib/pattern";
import { KR, MealData, MealKey, Slot, State, Sync, TF } from "@/lib/report";
import { idbClear } from "@/lib/idb";
import { JENIS } from "@/lib/options";
import { STANDARD, type Site } from "@/lib/site";
import ComboInput from "./ComboInput";
import { mealByHour, norm, pad, todayStr, workDay } from "@/lib/text";
import { useFoods } from "./FoodsContext";
import KaloriTab from "./KaloriTab";
import Login from "./Login";
import RiwayatTab from "./RiwayatTab";
import TestFoodTab from "./TestFoodTab";
import { useDraftSync } from "./useDraftSync";

// Draf lokal per site. BCP tetap memakai kunci lama supaya isian yang sudah ada di perangkat tidak hilang.
const draftKey = (siteId: string) => (siteId === "bcp" ? "tfm2_draft" : `tfm2_draft:${siteId}`);
// Nilai awal isian. Nama site, kode site laporan, dan camp mengikuti site yang sedang login.
const init = (site: Site = STANDARD[0]): State => ({
  tab: "tf", pukul: false, jam: "", zona: "WITA", mealAuto: true, jn: "Reguler", live: false, liveMenu: "", dt: "", meal: "Breakfast", site: site.nama, sxi: "",
  ks: "Makanan dalam kondisi layak untuk dikonsumsi",
  ksite: site.laporan, camp: site.camp, rule: true,
  md: initMD(),
});

export default function App() {
  const { authed, mock, openMode, loadError, reload, foods, site, logout } = useFoods();
  const [s, setS] = useState<State>(() => init());
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [sure, setSure] = useState(false);
  // Draf V1 yang memakai "Lainnya…" + nama site ketikan: sejak V2.0 site mengikuti login, jadi pengguna diberi tahu.
  const [legacySite, setLegacySite] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const day = useRef(workDay());   // hari kerja draf ini (berganti pukul 03.00)
  const at = useRef(0);            // waktu isian terakhir diubah (untuk sinkronisasi antar perangkat)
  const resetting = useRef(false);

  // Muat draf terakhir site ini, setelah site aktif diketahui dari login.
  // Draf dari hari kerja sebelumnya memulai ulang dari pola (menu kemarin tidak terbawa),
  // tapi pengaturan seperti jenis menu dan camp tetap dipakai.
  const siteId = site?.id;
  useEffect(() => {
    if (!site || loaded) return;
    const base = { ...init(site), dt: todayStr() };
    try {
      const d = JSON.parse(localStorage.getItem(draftKey(site.id)) || "null");
      if (d && d.v === 1 && d.state) {
        const stale = !d.day || d.day < workDay();
        at.current = stale ? 0 : Number(d.at) || 0;
        // Daftar lama (sebelum ada pola) dibuang.
        const { menu, snack, buah, rows, pb, pd, ...rest } = d.state as Record<string, unknown>;
        void menu; void snack; void buah; void rows; void pb; void pd;
        const md = rest.md ? fillMealPattern(rest.md as State["md"]) : initMD();
        const typed = rest.site === "__x" ? String(rest.sxi ?? "").trim() : "";
        if (typed && typed.toLowerCase() !== site.nama.toLowerCase()) setLegacySite(typed);
        setS({ ...base, ...rest, md, site: site.nama, sxi: "", dt: !stale && (rest.dt as string) ? (rest.dt as string) : todayStr(), ...(stale ? { mealAuto: true, pukul: false, jam: "", live: false, liveMenu: "", md: initMD() } : {}) } as State);
        setLoaded(true);
        return;
      }
    } catch { /* abaikan draf rusak */ }
    setS(base);
    setLoaded(true);
  }, [site, loaded]);
  useEffect(() => {
    if (!loaded || !siteId || resetting.current) return;
    const t = setTimeout(() => { try { localStorage.setItem(draftKey(siteId), JSON.stringify({ v: 1, day: day.current, at: at.current, state: s })); } catch { /* penuh */ } }, 300);
    return () => clearTimeout(t);
  }, [s, loaded, siteId]);
  // Nama site di isian selalu mengikuti login (juga setelah isian dari perangkat lain diterapkan).
  useEffect(() => {
    if (!loaded || !site || (s.site === site.nama && !s.sxi)) return;
    setS((p) => ({ ...p, site: site.nama, sxi: "" }));
  }, [loaded, site, s.site, s.sxi]);

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
  // Isian teks tersinkron antar perangkat (foto tidak ikut).
  const onRemote = useCallback((dev: string) => toast(`Isian diperbarui dari ${dev || "perangkat lain"}`), [toast]);
  const { status: syncSt, syncNow } = useDraftSync({ s, setS, loaded, authed, siteId: siteId || "", day, at, onRemote });
  const hm = (t: number) => { const d = new Date(t); return `${pad(d.getHours())}.${pad(d.getMinutes())}`; };
  const syncText =
    syncSt.state === "saving" ? "Menyimpan ke semua perangkat…"
    : syncSt.state === "error" ? "Belum tersinkron (offline?). Isian tetap aman di perangkat ini."
    : syncSt.state === "ok" && syncSt.at ? `Tersinkron, terakhir diubah ${hm(syncSt.at)}${syncSt.device ? ` dari ${syncSt.device}` : ""}`
    : syncSt.state === "ok" ? "Tersinkron" : "Menyinkronkan…";
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

  // Mulai baru: isian site ini kembali ke pola di semua perangkat site ini (lewat sinkronisasi),
  // foto site ini di perangkat ini dihapus. Site, kode site laporan, dan camp kembali ke bawaan site (bukan ke BCP).
  const reset = async () => {
    if (!site) return;
    if (!sure) { setSure(true); setTimeout(() => setSure(false), 4000); return; }
    resetting.current = true;
    at.current = 0; // hentikan pengiriman isian lama
    try { localStorage.setItem(draftKey(site.id), JSON.stringify({ v: 1, day: workDay(), at: Date.now(), state: { ...init(site), dt: todayStr() } })); } catch { /* abaikan */ }
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
              <span>Isian tersimpan otomatis dan tersinkron ke perangkat lain di site {site?.nama}; foto hanya di perangkat ini dan terhapus otomatis besok (pukul 03.00).</span>
              <span className={syncSt.state === "error" ? "err" : "hint"} style={{ margin: 0 }} role="status">{syncText}</span>
              {syncSt.state === "error" && <button type="button" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => syncNow()}>Coba sinkron</button>}
              <button type="button" style={{ padding: "4px 10px", fontSize: 12 }} onClick={reset}>{sure ? "Yakin? Klik lagi: isian di semua perangkat kembali ke pola" : "Mulai baru"}</button>
            </div>
            {mock && <p className="hint">Mode coba aktif: data makanan hanya sementara dan AI berupa contoh.</p>}
            <section>
              <h2>Info umum</h2>
              {legacySite && (
                <div className="warn" role="note">
                  Isian ini sebelumnya memakai site &quot;{legacySite}&quot; lewat pilihan Lainnya. Sejak pembaruan ini nama site mengikuti login,
                  jadi laporan sekarang memakai &quot;{site?.nama}&quot;. Kalau &quot;{legacySite}&quot; adalah site lain, minta admin mendaftarkannya,
                  lalu masuk lewat Ganti site → Lainnya.{" "}
                  <button type="button" className="lnk" onClick={() => setLegacySite("")}>Tutup</button>
                </div>
              )}
              <div className="g1">
                <label htmlFor="jn">Jenis menu</label>
                <ComboInput id="jn" value={s.jn} placeholder="Pilih atau ketik sendiri" options={JENIS} onChange={(v) => up({ jn: v })} />
              </div>
              {s.meal === "Dinner" && (
                <div className="g1">
                  <label className="chk"><input type="checkbox" checked={s.live} onChange={(e) => up({ live: e.target.checked })} /> Live Cooking (khusus Dinner)</label>
                  {s.live && <input id="live" value={s.liveMenu} placeholder="Menu yang live (mis. Menu Lalapan)" aria-label="Menu live cooking" onChange={(e) => up({ liveMenu: e.target.value })} style={{ marginTop: 6 }} />}
                </div>
              )}
              <div className="g1"><label htmlFor="dt">Tanggal (otomatis hari ini)</label><input id="dt" type="date" value={s.dt} onChange={(e) => up({ dt: e.target.value })} /></div>
              <div className="g2">
                <div>
                  <label htmlFor="meal">Waktu makan</label>
                  <select id="meal" value={s.meal} onChange={(e) => up({ meal: e.target.value, mealAuto: false })}>
                    {["Breakfast", "Lunch", "Dinner", "Supper"].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <span className="lbl" id="site-l">Site</span>
                  <div className="site-box" aria-labelledby="site-l">
                    <b>{site?.nama}</b>
                    {!openMode && <button type="button" className="lnk" onClick={() => logout()}>Ganti site</button>}
                  </div>
                </div>
              </div>
              <label className="chk"><input type="checkbox" checked={s.mealAuto} onChange={(e) => up(e.target.checked ? { mealAuto: true, meal: mealByHour(new Date().getHours()) } : { mealAuto: false })} /> Waktu makan otomatis sesuai jam</label>
              <div className="note" style={{ marginTop: 2 }}>Breakfast 03.00-08.59, Lunch 09.00-13.59, Dinner 14.00-17.59, Supper 18.00-02.59. Memilih sendiri mematikan otomatis.</div>
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
