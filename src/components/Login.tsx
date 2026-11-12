"use client";
import { FormEvent, useState } from "react";
import { useFoods } from "./FoodsContext";

export default function Login() {
  const { login } = useFoods();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr((await login(pin)) || "");
    setBusy(false);
  }
  return (
    <section>
      <h2>Masuk</h2>
      <form onSubmit={go}>
        <label htmlFor="pin">PIN</label>
        <input id="pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} />
        {err && <p className="err">{err}</p>}
        <div className="acts"><button className="p" type="submit" disabled={busy || !pin}>{busy ? "Memeriksa…" : "Masuk"}</button></div>
      </form>
    </section>
  );
}
