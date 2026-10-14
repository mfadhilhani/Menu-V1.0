"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { norm } from "@/lib/text";

export type Food = { key: string; nama: string; deskripsi: string; kkal: number | null; sumber: string; status: string; diubah: string };
type Resolved = { food: Food | null; error?: string };
type Ctx = {
  foods: Food[]; authed: boolean | null; mock: boolean;
  reload: () => Promise<void>;
  setFoods: (f: Food[]) => void;
  resolve: (name: string) => Promise<Resolved>;
  patchFood: (key: string, body: { kkal?: number | null; deskripsi?: string; status?: string }) => Promise<boolean>;
  removeFood: (key: string) => Promise<boolean>;
  login: (pin: string) => Promise<string | null>;
};
const C = createContext<Ctx>(null as unknown as Ctx);
export const useFoods = () => useContext(C);

type Dlg = { name: string; cands: Food[]; done: (f: Food | null) => void };
const sortFoods = (a: Food[]) => [...a].sort((x, y) => x.nama.localeCompare(y.nama, "id"));

export function FoodsProvider({ children }: { children: ReactNode }) {
  const [foods, setFoodsState] = useState<Food[]>([]);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [mock, setMock] = useState(false);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const ref = useRef<Food[]>([]);
  const setFoods = useCallback((f: Food[]) => { ref.current = f; setFoodsState(f); }, []);

  const reload = useCallback(async () => {
    const r = await fetch("/api/foods", { cache: "no-store" });
    if (r.status === 401) { setAuthed(false); return; }
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setFoods(j.foods || []); setMock(!!j.mock); setAuthed(true); }
  }, [setFoods]);
  useEffect(() => { reload().catch(() => setAuthed(false)); }, [reload]);

  const login = useCallback(async (pin: string) => {
    const r = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return (j.error as string) || "Gagal masuk";
    await reload();
    return null;
  }, [reload]);

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
    let r = await post({ name });
    if (r.status === "similar") {
      const pick = await ask(name, r.candidates as Food[]);
      if (pick) return { food: pick };
      r = await post({ name, forceNew: true });
    }
    if (r.status === "found" || r.status === "created") {
      const f = r.food as Food;
      setFoods(sortFoods([...ref.current.filter((x) => x.key !== f.key), f]));
      return { food: f };
    }
    return { food: null, error: (r.message as string) || "Gagal mencari data" };
  }, [setFoods]);

  const patchFood = useCallback(async (key: string, body: { kkal?: number | null; deskripsi?: string; status?: string }) => {
    const r = await fetch("/api/foods", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, ...body }) });
    if (!r.ok) return false;
    const j = await r.json();
    setFoods(ref.current.map((x) => (x.key === key ? (j.food as Food) : x)));
    return true;
  }, [setFoods]);
  const removeFood = useCallback(async (key: string) => {
    const r = await fetch(`/api/foods?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    if (r.ok) setFoods(ref.current.filter((x) => x.key !== key));
    return r.ok;
  }, [setFoods]);

  return (
    <C.Provider value={{ foods, authed, mock, reload, setFoods, resolve, patchFood, removeFood, login }}>
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
