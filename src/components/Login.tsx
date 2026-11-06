"use client";
import { FormEvent, useEffect, useState } from "react";
import { useFoods } from "./FoodsContext";

const LAST = "tfm2_last_site"; // pilihan site terakhir di perangkat ini (kenyamanan saja)
const CUSTOM = "custom";

export default function Login() {
  const { login, sites } = useFoods();
  const [site, setSite] = useState("");
  const [nama, setNama] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // Pilihan awal: site terakhir yang dipakai di perangkat ini, kalau masih tersedia. Daftar site dimuat ulang tiap
  // kembali ke tab; pilihan dan nama yang sedang diisi tidak ditimpa selama masih valid.
  useEffect(() => {
    let last: { site?: string; nama?: string } = {};
    try { last = JSON.parse(localStorage.getItem(LAST) || "{}"); } catch { /* abaikan */ }
    const valid = (v?: string) => v === CUSTOM || sites.some((s) => s.id === v);
    setSite((cur) => (valid(cur) ? cur : valid(last.site) && last.site ? last.site : sites[0]?.id || CUSTOM));
    if (last.site === CUSTOM && last.nama) setNama((cur) => cur || (last.nama as string));
  }, [sites]);
  const custom = site === CUSTOM;
  const ready = !!pin && (!custom || nama.trim().length >= 2);

  async function go(e: FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    const choice = custom ? { site: CUSTOM, nama: nama.trim() } : { site };
    const m = await login(choice, pin);
    if (!m) { try { localStorage.setItem(LAST, JSON.stringify(choice)); } catch { /* penuh */ } }
    else setPin(""); // PIN dikosongkan saat gagal; site dan nama tetap
    setErr(m || "");
    setBusy(false);
  }
  return (
    <section>
      <h2>Masuk</h2>
      <form onSubmit={go}>
        <div className="g1">
          <label htmlFor="lsite">Site</label>
          <select id="lsite" value={site} onChange={(e) => { setSite(e.target.value); setErr(""); }}>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
            <option value={CUSTOM}>Lainnya (site lain)</option>
          </select>
        </div>
        {custom && (
          <div className="g1">
            <label htmlFor="lnama">Nama site</label>
            <input id="lnama" value={nama} maxLength={60} autoComplete="organization" placeholder="Mis. Site Tambang ABC" onChange={(e) => setNama(e.target.value)} />
            <div className="note">Ketik nama site seperti yang didaftarkan admin. Huruf besar kecil tidak berpengaruh.</div>
          </div>
        )}
        <div className="g1">
          <label htmlFor="pin">PIN site</label>
          <input id="pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} />
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="acts"><button className="p" type="submit" disabled={busy || !ready}>{busy ? "Memeriksa…" : "Masuk"}</button></div>
        <p className="hint">Tiap site punya PIN dan data sendiri. Isian site lain tidak terlihat di sini.</p>
      </form>
    </section>
  );
}
