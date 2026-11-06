"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { setIdbScope } from "@/lib/idb";
import type { Site, SitePublic } from "@/lib/site";
import { norm, similar } from "@/lib/text";

export type Food = { key: string; nama: string; deskripsi: string; kkal: number | null; sumber: string; status: string; diubah: string; ikon: string };
type Resolved = { food: Food | null; error?: string; hint?: string; retry?: boolean };
export type LoginChoice = { site: string; nama?: string };
type Ctx = {
  foods: Food[]; authed: boolean | null; mock: boolean; loadError: string;
  openMode: boolean;            // mode coba tanpa PIN: tidak ada login, jadi tidak ada "Ganti site"
  site: Site | null;           // site aktif dari cookie login (sumber identitas di browser)
  sites: SitePublic[];          // site standar yang bisa dipilih di layar login
  reload: () => Promise<void>;
  setFoods: (f: Food[]) => void;
  resolve: (name: string) => Promise<Resolved>;
  addManual: (name: string, kkal: number) => Promise<boolean>;
  patchFood: (key: string, body: { kkal?: number | null; deskripsi?: string; status?: string; ikon?: string }) => Promise<boolean>;
  removeFood: (key: string) => Promise<boolean>;
  login: (choice: LoginChoice, pin: string) => Promise<string | null>;
  logout: () => Promise<void>;
};
const C = createContext<Ctx>(null as unknown as Ctx);
export const useFoods = () => useContext(C);

type Dlg = { name: string; cands: Food[]; done: (f: Food | null) => void };
const sortFoods = (a: Food[]) => [...a].sort((x, y) => x.nama.localeCompare(y.nama, "id"));

export function FoodsProvider({ children }: { children: ReactNode }) {
  const [foods, setFoodsState] = useState<Food[]>([]);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [mock, setMock] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [sites, setSites] = useState<SitePublic[]>([]);
  const [openMode, setOpenMode] = useState(false);
  const siteId = useRef("");
  const ref = useRef<Food[]>([]);
  const setFoods = useCallback((f: Food[]) => { ref.current = f; setFoodsState(f); }, []);

  const loadedAt = useRef(0);
  const reload = useCallback(async () => {
    try {
      // Site aktif dulu: draf, foto, dan nama site di semua output bergantung padanya.
      const a = await fetch("/api/auth", { cache: "no-store" });
      const aj = await a.json().catch(() => ({}));
      if (!a.ok) { setLoadError((aj.error as string) || `Server menjawab error ${a.status}`); return; }
      setMock(!!aj.mock);
      setSites((aj.sites as SitePublic[]) || []);
      if (!aj.ok) { setLoadError(""); setAuthed(false); return; }
      const me = aj.site as Site;
      // Tab lain di browser ini login ke site lain (cookie dipakai bersama): muat ulang supaya tampilan ikut site baru.
      if (siteId.current && siteId.current !== me.id) { location.reload(); return; }
      siteId.current = me.id;
      setIdbScope(me.id);
      setOpenMode(!!aj.open);
      setSite(me);
      const r = await fetch("/api/foods", { cache: "no-store" });
      if (r.status === 401) { setLoadError(""); setAuthed(false); return; }
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setLoadError(""); setFoods(j.foods || []); setAuthed(true); loadedAt.current = Date.now(); }
      else setLoadError((j.error as string) || `Server menjawab error ${r.status}`);
    } catch {
      setLoadError("Tidak bisa terhubung ke server");
    }
  }, [setFoods]);
  useEffect(() => { reload(); }, [reload]);
  // Saat kembali ke tab ini, muat ulang daftar makanan (paling sering sekali per menit) supaya makanan
  // yang baru ditambahkan dari perangkat lain ikut muncul di saran.
  useEffect(() => {
    const f = () => { if (document.visibilityState === "visible" && loadedAt.current && Date.now() - loadedAt.current > 60000) reload(); };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [reload]);

  const login = useCallback(async (choice: LoginChoice, pin: string) => {
    try {
      const r = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...choice, pin }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return (j.error as string) || "Gagal masuk";
    } catch {
      return "Tidak bisa terhubung ke server";
    }
    await reload();
    return null;
  }, [reload]);
  // Keluar / ganti site. Halaman dimuat ulang supaya isian site sebelumnya tidak tertinggal di memori.
  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    location.reload();
  }, []);

  const ask = (name: string, cands: Food[]) => new Promise<Food | null>((done) => setDlg({ name, cands, done }));
  const close = (f: Food | null) => { dlg?.done(f); setDlg(null); };

  const resolve = useCallback(async (name: string): Promise<Resolved> => {
    const key = norm(name);
    const local = ref.current.find((f) => f.key === key);
    if (local) return { food: local };
    const post = async (body: object) => {
      const r = await fetch("/api/foods/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.status === 401) { setAuthed(false); return { status: "error", message: "Perlu masuk lagi" }; }
      return r.json().catch(() => ({ status: "error", message: "Respons server tidak valid" }));
    };
    // Cek "mirip" dulu di data yang sudah dimuat di browser: pop up langsung muncul tanpa menunggu server.
    const near = similar(name, ref.current);
    let r;
    if (near.length) {
      const pick = await ask(name, near);
      if (pick) return { food: pick };
      r = await post({ name, forceNew: true });
    } else {
      r = await post({ name });
      if (r.status === "similar") {
        const pick = await ask(name, r.candidates as Food[]);
        if (pick) return { food: pick };
        r = await post({ name, forceNew: true });
      }
    }
    if (r.status === "found" || r.status === "created") {
      const f = r.food as Food;
      setFoods(sortFoods([...ref.current.filter((x) => x.key !== f.key), f]));
      return { food: f };
    }
    return { food: null, error: (r.message as string) || "Gagal mencari data", hint: r.hint as string | undefined, retry: !!r.retry };
  }, [setFoods]);

  const patchFood = useCallback(async (key: string, body: { kkal?: number | null; deskripsi?: string; status?: string; ikon?: string }) => {
    const r = await fetch("/api/foods", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, ...body }) });
    if (!r.ok) return false;
    const j = await r.json();
    setFoods(ref.current.map((x) => (x.key === key ? (j.food as Food) : x)));
    return true;
  }, [setFoods]);
  // Tambah makanan tanpa AI (dipakai saat AI sibuk dan kalori diisi manual).
  const addManual = useCallback(async (name: string, kkal: number) => {
    const r = await fetch("/api/foods/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ n: name, k: kkal }] }) });
    if (r.ok) await reload();
    return r.ok;
  }, [reload]);
  const removeFood = useCallback(async (key: string) => {
    const r = await fetch(`/api/foods?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    if (r.ok) setFoods(ref.current.filter((x) => x.key !== key));
    return r.ok;
  }, [setFoods]);

  return (
    <C.Provider value={{ foods, authed, mock, openMode, loadError, site, sites, reload, setFoods, resolve, addManual, patchFood, removeFood, login, logout }}>
      {children}
      {dlg && (
        <div className="dlg-bg" role="dialog" aria-modal="true">
          <div className="dlg">
            <h3>Apakah maksud kamu ini?</h3>
            <p>“{dlg.name}” mirip dengan data yang sudah ada.</p>
            {dlg.cands.map((c) => (
              <button key={c.key} type="button" className="p" onClick={() => close(c)}>
                Ya, {c.nama}{c.kkal != null ? ` (${c.kkal} kkal)` : ""}
              </button>
            ))}
            <button type="button" onClick={() => close(null)}>Bukan, tambahkan sebagai data baru</button>
          </div>
        </div>
      )}
    </C.Provider>
  );
}
