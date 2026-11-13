"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Brand } from "@/lib/canvas";
import { idbClear } from "@/lib/idb";
import { DEFAULT_PREFS, initState, loadDraft, loadPrefs, Prefs, saveDraft, savePrefs } from "@/lib/local";
import { useSiteLogo } from "@/lib/logo";
import { JENIS } from "@/lib/options";
import { setPhotoServer } from "@/lib/photolib";
import { DEFAULT_SITE, isDefaultSite, KR, KS, MealData, MealKey, siteKey, siteName, Slot, State, Sync, synced, TF } from "@/lib/report";
import { dateParts, mealByHour, norm, pad, workDay } from "@/lib/text";
import ComboInput from "./ComboInput";
import Confirm, { Ask } from "./Confirm";
import { useFoods } from "./FoodsContext";
import KaloriTab from "./KaloriTab";
import Login from "./Login";
import PhotoLibSection from "./PhotoLibSection";
import RiwayatTab from "./RiwayatTab";
import TestFoodTab from "./TestFoodTab";
import { SyncMeta, useDraftSync } from "./useDraftSync";

const TABS: [State["tab"], string, string][] = [["tf", "Test Food", "📝"], ["kal", "Menu & Kalori", "🍽️"], ["his", "Riwayat", "📚"]];

export default function App() {
  const { authed, mock, loadError, reload, foods } = useFoods();
  const [s, setS] = useState<State>(() => initState(DEFAULT_SITE, ""));
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [ask, setAsk] = useState<Ask | null>(null);
  const [adding, setAdding] = useState(false);   // sedang mengetik nama site baru
  const [newSite, setNewSite] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const day = useRef(workDay());                 // hari kerja draf ini (berganti pukul 00.00)
  const meta = useRef<SyncMeta>({ ver: 0, base: "" });
  const sRef = useRef(s);
  const resetting = useRef(false);
  sRef.current = s;

  // Muat pilihan perangkat (site, tab, sinkronisasi) lalu isian site itu.
  useEffect(() => {
    const p = loadPrefs();
    const d = loadDraft(p.site, p.sxi, p.tab);
    meta.current = d.meta;
    setPhotoServer(p.sync);
    setPrefs(p);
    setS(d.state);
    setAdding(p.site === "__x" && !p.sxi.trim());
    setLoaded(true);
  }, []);
  // Simpan isian ke perangkat ini (per site) setiap berubah, dan langsung saat tab disembunyikan/ditutup.
  const persist = useCallback(() => { if (!resetting.current) saveDraft(sRef.current, day.current, meta.current); }, []);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(persist, 300);
    return () => clearTimeout(t);
  }, [s, loaded, persist]);
  useEffect(() => {
    if (!loaded) return;
    const f = () => { if (document.visibilityState === "hidden") persist(); };
    document.addEventListener("visibilitychange", f);
    window.addEventListener("pagehide", persist);
    return () => { document.removeEventListener("visibilitychange", f); window.removeEventListener("pagehide", persist); };
  }, [loaded, persist]);
  useEffect(() => { if (loaded) savePrefs({ ...prefs, tab: s.tab, site: s.site, sxi: s.sxi }); }, [loaded, prefs, s.tab, s.site, s.sxi]);

  const up = useCallback((p: Partial<State>) => setS((x) => ({ ...x, ...p })), []);
  const setMD = useCallback((fn: (d: MealData, m: MealKey) => MealData) => setS((x) => { const m = (x.meal in x.md ? x.meal : "Breakfast") as MealKey; return { ...x, md: { ...x.md, [m]: fn(x.md[m], m) } }; }), []);
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
  const toast = useCallback((m: string) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(""), 3200); }, []);

  // ---------- site dan sinkronisasi ----------
  const key = siteKey(s), bcp = isDefaultSite(s), name = siteName(s);
  const ns = bcp || !key ? "" : key + "|";         // awalan kunci foto, supaya foto tiap site tidak tercampur di perangkat ini
  const onRemote = useCallback((dev: string) => toast(`Isian diperbarui dari ${dev || "perangkat lain"}`), [toast]);
  const { status: syncSt, syncNow, flush } = useDraftSync({ s, setS, loaded, authed, enabled: prefs.sync, site: key, day, meta, onMeta: persist, onRemote });
  const logo = useSiteLogo(bcp ? "" : key, prefs.sync && !!authed);
  const brand = useMemo<Brand | null>(() => (bcp ? null : { site: name, logo: logo.img }), [bcp, name, logo.img]);

  // Pindah site: isian site lama disimpan (dan dikirim), lalu isian site baru dimuat dari perangkat ini dan dari server.
  const switchSite = useCallback((site: string, sxi: string) => {
    const cur = sRef.current;
    if (siteKey(cur) === siteKey({ site, sxi })) { setS((p) => ({ ...p, site, sxi })); return; }
    saveDraft(cur, day.current, meta.current);
    flush();
    const d = loadDraft(site, sxi, cur.tab);
    meta.current = d.meta;
    setS(() => d.state);
  }, [flush]);
  const applyNewSite = () => {
    const v = newSite.replace(/\s+/g, " ").trim();
    if (v.length < 2) { toast("Ketik nama site dulu (minimal 2 huruf)"); return; }
    setAdding(false); setNewSite("");
    if (norm(v) === norm(DEFAULT_SITE)) { switchSite(DEFAULT_SITE, ""); return; }
    setPrefs((p) => (p.sites.some((x) => norm(x) === norm(v)) ? p : { ...p, sites: [...p.sites, v].slice(-20) }));
    switchSite("__x", v);
    toast(`Site ${v} dipakai`);
  };
  const forgetSite = () => setAsk({
    title: `Hapus site ${name} dari daftar?`,
    body: <p>Site ini hilang dari pilihan di perangkat ini dan kamu kembali ke site {DEFAULT_SITE}. Isian dan logo yang sudah tersinkron tetap ada di server.</p>,
    actions: [{ label: "Ya, hapus dari daftar", kind: "d", run: () => { setPrefs((p) => ({ ...p, sites: p.sites.filter((x) => norm(x) !== norm(name)) })); switchSite(DEFAULT_SITE, ""); } }],
  });
  const setSync = (on: boolean, discardLocal = false) => {
    if (!on) flush();
    if (on && discardLocal) {
      // Buang perubahan perangkat ini: kembali ke isian terakhir yang sama dengan server, lalu ambil yang terbaru.
      let last: Partial<State> | null = null;
      try { last = meta.current.base ? (JSON.parse(meta.current.base) as Partial<State>) : null; } catch { last = null; }
      if (last) { const b = last; setS((p) => ({ ...p, ...b, tab: p.tab, site: p.site, sxi: p.sxi })); }
      else meta.current = { ...meta.current, base: JSON.stringify(synced(sRef.current)) };
    }
    setPhotoServer(on);
    setPrefs((p) => ({ ...p, sync: on }));
    toast(on ? "Sinkronisasi dinyalakan" : "Sinkronisasi dimatikan. Isian hanya disimpan di perangkat ini.");
  };
  const askSync = () => setAsk(prefs.sync
    ? {
      title: "Matikan sinkronisasi?",
      body: <>
        <p>Isian hanya disimpan di <b>perangkat ini</b> (penyimpanan lokal). Perangkat lain di site {name} tidak menerima perubahanmu, dan kamu tidak menerima perubahan mereka.</p>
        <p>Isian yang sudah tersinkron tetap ada di server. Data makanan (kalori, ikon) tetap dipakai bersama.</p>
      </>,
      actions: [{ label: "Ya, simpan di perangkat ini saja", kind: "p", run: () => setSync(false) }],
    }
    : {
      title: `Nyalakan sinkronisasi site ${name}?`,
      body: <>
        <p>Isian perangkat ini digabung dengan isian site {name} di server: bagian yang kamu ubah di sini dipertahankan, sisanya mengikuti server.</p>
        <p>Setelah itu perubahan terkirim otomatis ke semua perangkat di site yang sama.</p>
      </>,
      actions: [
        { label: "Nyalakan dan gabungkan", kind: "p", run: () => setSync(true) },
        { label: "Nyalakan, pakai isian server saja", run: () => setSync(true, true) },
      ],
    });

  const hm = (t: number) => { const d = new Date(t); return `${pad(d.getHours())}.${pad(d.getMinutes())}`; };
  const syncText =
    !prefs.sync ? "Lokal: hanya di perangkat ini"
    : !key ? "Isi nama site untuk mulai sinkron"
    : syncSt.state === "saving" ? "Menyimpan…"
    : syncSt.state === "error" ? "Belum tersinkron (offline?)"
    : syncSt.state === "ok" && syncSt.at ? `Tersinkron ${hm(syncSt.at)}${syncSt.device ? ` · ${syncSt.device}` : ""}`
    : syncSt.state === "ok" ? "Tersinkron" : "Menyinkronkan…";
  const syncCls = !prefs.sync || !key ? "off" : syncSt.state === "error" ? "bad" : syncSt.state === "ok" ? "ok" : "wait";

  // Perubahan otomatis (waktu makan menurut jam, kalori baris tetap dari Sheet) bukan ketikan pengguna.
  // Kalau isian belum punya perubahan yang belum terkirim, perubahan otomatis tidak dihitung sebagai perubahan lokal,
  // supaya perangkat yang baru dibuka tidak menimpa pilihan perangkat lain hanya karena jamnya berjalan.
  const autoSet = useCallback((fn: (x: State) => State) => {
    const cur = sRef.current, next = fn(cur);
    if (next === cur) return false;
    if (JSON.stringify(synced(cur)) === meta.current.base) meta.current = { ...meta.current, base: JSON.stringify(synced(next)) };
    sRef.current = next;
    setS(() => next);
    return true;
  }, []);
  // Waktu makan mengikuti jam selama "otomatis" aktif; memilih manual mematikannya.
  useEffect(() => {
    if (!loaded || !s.mealAuto) return;
    const tick = () => {
      const m = mealByHour(new Date().getHours());
      if (autoSet((x) => (x.meal === m || !x.mealAuto ? x : { ...x, meal: m }))) toast("Waktu makan otomatis: " + m);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [loaded, s.mealAuto, key, toast, autoSet]);
  // Baris tetap (Nasi Putih, Sambal, dst) mengambil kalori dari Sheet begitu datanya ada.
  useEffect(() => {
    if (!loaded || !foods.length) return;
    autoSet((x) => {
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
  }, [loaded, foods, key, s.md, autoSet]);
  const copy = useCallback(async (t: string) => { try { await navigator.clipboard.writeText(t); toast("Teks disalin"); } catch { toast("Gagal menyalin, salin manual"); } }, [toast]);
  const wa = useCallback((t: string) => { window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank", "noopener"); }, []);

  // Mulai baru: isian site ini kembali ke pola (di semua perangkat kalau sinkronisasi menyala), foto site ini di perangkat ini dihapus.
  // Pengaturan (jenis menu, camp, kode site, zona, format) tidak ikut direset.
  const doReset = async () => {
    const cur = sRef.current;
    resetting.current = true;
    const fresh: State = { ...initState(cur.site, cur.sxi), tab: cur.tab, jn: cur.jn, zona: cur.zona, ksite: cur.ksite, camp: cur.camp, rule: cur.rule, tfFmt: cur.tfFmt, ks: KS[cur.tfFmt === 1 ? 1 : 2] };
    saveDraft(fresh, workDay(), meta.current); // "base" tidak diubah, jadi setelah dimuat ulang pola ini terkirim sebagai perubahan
    await idbClear(ns);
    location.reload();
  };
  const askReset = () => setAsk({
    title: "Mulai baru?",
    body: <>
      <p>Semua isian hari ini untuk site {name} (semua waktu makan) dikosongkan dan kembali ke pola{prefs.sync && key ? <> <b>di semua perangkat site ini</b></> : " di perangkat ini"}.</p>
      <p>Foto poster dan kolase di perangkat ini ikut dihapus. Data makanan, simpanan foto menu, dan logo tidak dihapus.</p>
    </>,
    actions: [{ label: "Ya, kosongkan", kind: "d", run: doReset }],
  });

  const p = dateParts(s.dt, true);
  const summary = `${s.meal} · ${p.hari}, ${pad(p.d)} ${p.m.slice(0, 3)} · Site ${name} · ${s.jn.trim() || "-"}`;
  const siteVal = adding ? "__new" : s.site === "__x" ? "x:" + s.sxi : DEFAULT_SITE;
  const pickSite = (v: string) => {
    if (v === "__new") { setAdding(true); return; }
    setAdding(false);
    if (v === DEFAULT_SITE) switchSite(DEFAULT_SITE, ""); else switchSite("__x", v.slice(2));
  };
  const customSites = [...prefs.sites, ...(s.site === "__x" && s.sxi && !prefs.sites.some((x) => norm(x) === norm(s.sxi)) ? [s.sxi] : [])];

  return (
    <>
      <header>
        <div className="hi">
          <div className="brandrow">
            <h1>Tes<span>food</span></h1>
            {authed && <button type="button" className="helpb" aria-label="Cara pakai" onClick={() => setPrefs((x) => ({ ...x, help: !x.help }))}>?</button>}
          </div>
          <p className="sub">Test food, menu kalori, poster, dan data makanan dalam satu tempat.</p>
          {authed && (
            <nav className="tabs" aria-label="Halaman">
              {TABS.map(([k, t, e]) => (
                <button key={k} type="button" className={"tb" + (s.tab === k ? " on" : "")} aria-current={s.tab === k ? "page" : undefined} onClick={() => { up({ tab: k }); window.scrollTo({ top: 0 }); }}>
                  <span className="te" aria-hidden="true">{e}</span><span>{t}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>
      <main>
        {authed === null && !loadError && <p className="hint">Memuat…</p>}
        {authed === null && loadError && (
          <section>
            <h2>Data belum bisa dimuat</h2>
            <p className="err">{loadError}</p>
            <p className="hint">Periksa koneksi internet. Kalau baru memasang: periksa pengaturan di .env.local atau Environment Variables server, lalu coba lagi.</p>
            <div className="acts"><button className="p" type="button" onClick={() => reload()}>Coba lagi</button></div>
          </section>
        )}
        {authed === false && <Login />}
        {authed && (
          <>
            <div className="statbar">
              <span className="chip site">Site {name}</span>
              <span className={"chip sync " + syncCls} role="status">{syncText}</span>
              {prefs.sync && !!key && syncSt.state === "error" && <button type="button" className="mini" onClick={() => syncNow()}>Coba sinkron</button>}
              <span className="grow" />
              <button type="button" className="mini" aria-pressed={prefs.sync} onClick={askSync}>{prefs.sync ? "Sinkron: nyala" : "Sinkron: mati"}</button>
              <button type="button" className="mini" onClick={askReset}>Mulai baru</button>
            </div>
            {prefs.help && (
              <section className="help">
                <h2>Cara pakai</h2>
                <ol>
                  <li><b>Cek Info umum</b>: site, waktu makan, tanggal, jenis menu. Isian tersimpan otomatis.</li>
                  <li><b>Test Food</b>: ketik nama menu (saran muncul saat mengetik), pilih nilai 1-5, lalu salin atau kirim ke WhatsApp.</li>
                  <li><b>Menu &amp; Kalori</b> (Breakfast dan Dinner): menu yang sama sudah terisi. Tambah foto untuk poster, kolase kode warna, dan video TV.</li>
                  <li><b>Riwayat</b>: periksa dan betulkan kalori, ikon, dan deskripsi makanan; lihat dan hapus simpanan foto menu.</li>
                </ol>
                <p className="hint">Isian tersinkron ke perangkat lain pada site yang sama. Tombol “Sinkron” di atas untuk mematikannya (simpan di perangkat ini saja).</p>
                <div className="acts"><button type="button" className="p" onClick={() => setPrefs((x) => ({ ...x, help: false }))}>Mengerti, tutup</button></div>
              </section>
            )}
            {mock && <p className="hint">Mode coba aktif: data makanan hanya sementara dan AI berupa contoh.</p>}
            <section>
              <button type="button" className="fold" aria-expanded={prefs.info} onClick={() => setPrefs((x) => ({ ...x, info: !x.info }))}>
                <h2>Info umum</h2>
                <span className="foldsum">{prefs.info ? "Tutup" : summary}</span>
                <span className="foldic" aria-hidden="true">{prefs.info ? "▴" : "▾"}</span>
              </button>
              {prefs.info && (
                <div className="foldbody">
                  <div className="g2">
                    <div>
                      <label htmlFor="meal">Waktu makan</label>
                      <select id="meal" value={s.meal} onChange={(e) => up({ meal: e.target.value, mealAuto: false })}>
                        {["Breakfast", "Lunch", "Dinner", "Supper"].map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div><label htmlFor="dt">Tanggal</label><input id="dt" type="date" value={s.dt} onChange={(e) => up({ dt: e.target.value })} /></div>
                  </div>
                  <label className="chk"><input type="checkbox" checked={s.mealAuto} onChange={(e) => up(e.target.checked ? { mealAuto: true, meal: mealByHour(new Date().getHours()) } : { mealAuto: false })} /> Waktu makan otomatis sesuai jam</label>
                  <div className="note">Breakfast 00.00-08.59, Lunch 09.00-13.59, Dinner 14.00-17.59, Supper 18.00-23.59. Hari berganti pukul 00.00. Memilih sendiri mematikan otomatis.</div>
                  <div className="g1" style={{ marginTop: 12 }}>
                    <label htmlFor="jn">Jenis menu</label>
                    <ComboInput id="jn" value={s.jn} placeholder="Pilih atau ketik sendiri" options={JENIS} onChange={(v) => up({ jn: v })} />
                  </div>
                  {s.meal === "Dinner" && (
                    <div className="g1">
                      <label className="chk"><input type="checkbox" checked={s.live} onChange={(e) => up({ live: e.target.checked })} /> Live Cooking (khusus Dinner)</label>
                      {s.live && <input id="live" value={s.liveMenu} placeholder="Menu yang live (mis. Menu Lalapan)" aria-label="Menu live cooking" onChange={(e) => up({ liveMenu: e.target.value })} style={{ marginTop: 6 }} />}
                    </div>
                  )}
                  <div className="g1">
                    <label htmlFor="site">Site</label>
                    <select id="site" value={siteVal} onChange={(e) => pickSite(e.target.value)}>
                      <option value={DEFAULT_SITE}>{DEFAULT_SITE}</option>
                      {customSites.map((x) => <option key={x} value={"x:" + x}>{x}</option>)}
                      <option value="__new">Lainnya… (ketik nama site)</option>
                    </select>
                  </div>
                  {adding && (
                    <div className="sitebox">
                      <label htmlFor="sxi">Nama site</label>
                      <div className="inl">
                        <input id="sxi" value={newSite} placeholder="mis. KM 35" maxLength={40} enterKeyHint="done" autoCapitalize="characters"
                          onChange={(e) => setNewSite(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyNewSite(); } }} />
                        <button type="button" className="p" onClick={applyNewSite}>Pakai</button>
                      </div>
                      <div className="note">Tiap site punya isian sendiri dan hanya tersinkron dengan perangkat lain yang memilih site yang sama (nama harus sama; huruf besar kecil tidak dibedakan).</div>
                    </div>
                  )}
                  {!adding && !bcp && (
                    <div className="sitebox">
                      <div className="note" style={{ marginTop: 0 }}>Poster, kolase kode warna, dan video memakai tulisan <b>Site {name}</b>. Logo DH tidak dipasang; unggah logo site ini kalau ada.</div>
                      <div className="logorow">
                        <div className="logopv">{logo.data ? <img src={logo.data} alt={`Logo site ${name}`} /> : <span>Belum ada logo</span>}</div>
                        <div className="logoacts">
                          <label className="fbtn">{logo.busy ? "Memproses…" : logo.data ? "Ganti logo" : "Unggah logo site"}
                            <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={logo.busy}
                              onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; const err = await logo.set(f); toast(err || "Logo dipasang di poster, kolase, dan video"); }} />
                          </label>
                          {logo.data && <button type="button" className="mini" onClick={() => { logo.clear(); toast("Logo dihapus"); }}>Hapus logo</button>}
                        </div>
                      </div>
                      <div className="note">PNG atau JPG. Paling rapi kalau latarnya putih atau transparan.{prefs.sync ? " Logo ikut tersinkron ke perangkat lain di site ini." : ""}</div>
                      <button type="button" className="lnkb" onClick={forgetSite}>Hapus site ini dari daftar</button>
                    </div>
                  )}
                </div>
              )}
            </section>
            {s.tab === "tf" && <TestFoodTab s={s} up={up} setList={setList} sync={sync} copy={copy} wa={wa} toast={toast} ns={ns} />}
            {s.tab === "kal" && <KaloriTab s={s} up={up} setRows={setRows} setSlots={setSlots} sync={sync} copy={copy} wa={wa} toast={toast} ns={ns} brand={brand} confirm={setAsk} />}
            {s.tab === "his" && (
              <>
                <div className="acts" style={{ margin: "0 0 12px" }}>
                  <button type="button" onClick={() => document.getElementById("simpanan-foto")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Ke simpanan foto menu ↓</button>
                </div>
                <RiwayatTab toast={toast} />
                <PhotoLibSection toast={toast} confirm={setAsk} />
              </>
            )}
          </>
        )}
      </main>
      <div id="toast" className={msg ? "on" : ""} role="status">{msg}</div>
      {ask && <Confirm ask={ask} onClose={() => setAsk(null)} />}
    </>
  );
}
