// Penyimpanan lokal (localStorage) di perangkat ini:
// - tfm2_prefs      : pilihan milik perangkat (site yang dipilih, tab, sinkronisasi nyala/mati, daftar site lain)
// - tfm2_d:<site>   : isian per site, plus versi server terakhir yang dilihat (untuk sinkronisasi)
// - tfm2_draft      : format lama (satu isian untuk semua site), dipindahkan otomatis saat pertama dibuka
import { fillMealPattern, initMD } from "./pattern";
import { DEFAULT_SITE, KS, siteKey, State, synced } from "./report";
import { siteKeyOf, todayStr, workDay } from "./text";

export type Prefs = { site: string; sxi: string; tab: State["tab"]; sync: boolean; sites: string[]; info: boolean; help: boolean };
export type Meta = { ver: number; base: string };
const PKEY = "tfm2_prefs", DKEY = "tfm2_d:", OLD = "tfm2_draft";
export const DEFAULT_PREFS: Prefs = { site: DEFAULT_SITE, sxi: "", tab: "tf", sync: true, sites: [], info: true, help: true };

const read = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const TABS = ["tf", "kal", "his"];

// Isian awal untuk suatu site. Site lain tidak mewarisi "DH BCP" dan "Camp Pelangi".
export function initState(site: string, sxi: string): State {
  const bcp = siteKeyOf(site === "__x" ? sxi : site) === siteKeyOf(DEFAULT_SITE);
  return {
    tab: "tf", pukul: false, jam: "", zona: "WITA", mealAuto: true, jn: "Reguler", live: false, liveMenu: "", dt: todayStr(), meal: "Breakfast",
    site, sxi, ks: KS[2], ksite: bcp ? "DH BCP" : (site === "__x" ? sxi.trim() : site), camp: bcp ? "Camp Pelangi" : "", rule: true, tfFmt: 2,
    md: initMD(),
  };
}

export function loadPrefs(): Prefs {
  const p = read(PKEY) as Partial<Prefs> | null;
  if (p && typeof p === "object") {
    return {
      site: p.site === "__x" ? "__x" : DEFAULT_SITE, sxi: typeof p.sxi === "string" ? p.sxi : "",
      tab: TABS.includes(p.tab as string) ? (p.tab as State["tab"]) : "tf", sync: p.sync !== false,
      sites: Array.isArray(p.sites) ? p.sites.filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, 20) : [],
      info: p.info !== false, help: p.help !== false,
    };
  }
  // Pertama kali setelah pembaruan: ambil site dan tab dari draf format lama, lalu pindahkan isiannya ke kunci per site.
  const old = read(OLD) as { v?: number; day?: string; state?: Record<string, unknown> } | null;
  const prefs = { ...DEFAULT_PREFS };
  if (old && old.v === 1 && old.state) {
    const st = old.state;
    if (st.site === "__x" && typeof st.sxi === "string" && st.sxi.trim()) { prefs.site = "__x"; prefs.sxi = st.sxi.trim(); prefs.sites = [prefs.sxi]; }
    if (TABS.includes(st.tab as string)) prefs.tab = st.tab as State["tab"];
    const { tab, site, sxi, menu, snack, buah, rows, pb, pd, ...rest } = st;
    void tab; void site; void sxi; void menu; void snack; void buah; void rows; void pb; void pd;
    write(DKEY + (siteKey(prefs) || "_baru"), { v: 2, day: old.day || "", ver: 0, base: "", state: rest });
    try { localStorage.removeItem(OLD); } catch { /* abaikan */ }
  }
  write(PKEY, prefs);
  return prefs;
}
export const savePrefs = (p: Prefs) => write(PKEY, p);

// Muat isian site ini. Isian dari hari kerja sebelumnya (berganti pukul 03.00) memulai lagi dari pola:
// menu kemarin tidak terbawa, tapi pengaturan (jenis menu, camp, kode site, zona, format, kesimpulan) tetap dipakai.
export function loadDraft(site: string, sxi: string, tab: State["tab"]): { state: State; meta: Meta } {
  const fresh: State = { ...initState(site, sxi), tab };
  const d = read(DKEY + (siteKey({ site, sxi }) || "_baru")) as { v?: number; day?: string; ver?: number; base?: string; state?: Partial<State> } | null;
  if (!d || d.v !== 2 || !d.state || typeof d.state !== "object") return { state: fresh, meta: { ver: 0, base: JSON.stringify(synced(fresh)) } };
  const st = d.state, stale = !d.day || d.day < workDay();
  // Draf yang dibuat sebelum ada pilihan format: pakai format baru dan kesimpulan bawaannya.
  const ks = st.tfFmt === undefined && st.ks === KS[1] ? KS[2] : typeof st.ks === "string" ? st.ks : fresh.ks;
  if (stale) {
    const keep: Partial<State> = {};
    (["jn", "zona", "ksite", "camp", "rule", "tfFmt"] as const).forEach((k) => { if (st[k] !== undefined) (keep as Record<string, unknown>)[k] = st[k]; });
    const state: State = { ...fresh, ...keep, ks };
    return { state, meta: { ver: 0, base: JSON.stringify(synced(state)) } };
  }
  const state: State = { ...fresh, ...st, ks, md: st.md ? fillMealPattern(st.md) : initMD(), dt: st.dt || todayStr(), tab, site, sxi };
  return { state, meta: { ver: Number(d.ver) || 0, base: typeof d.base === "string" ? d.base : "" } };
}
export function saveDraft(s: State, day: string, meta: Meta) {
  return write(DKEY + (siteKey(s) || "_baru"), { v: 2, day, ver: meta.ver, base: meta.base, state: synced(s) });
}
