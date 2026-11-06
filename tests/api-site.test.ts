// Uji integrasi route API: login per site dan isolasi draf antar-site di sisi server.
// Memakai route asli; penyimpanan memakai mode coba (MOCK_BACKEND=1), tidak menyentuh Google Sheets.
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as authGet, POST as authPost } from "@/app/api/auth/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as draftGet, PUT as draftPut } from "@/app/api/draft/route";
import { GET as foodsGet } from "@/app/api/foods/route";
import { clientIp } from "@/lib/auth";

const BASE = "http://localhost:3000";
let ipSeq = 0;
const req = (path: string, init: RequestInit & { cookie?: string; ip?: string } = {}) => {
  const h = new Headers(init.headers);
  h.set("x-real-ip", init.ip || `10.0.0.${++ipSeq}`);
  if (init.cookie) h.set("cookie", `tf_auth=${init.cookie}`);
  if (init.body) h.set("content-type", "application/json");
  return new NextRequest(BASE + path, { ...init, headers: h });
};
const cookieOf = (r: Response) => /tf_auth=([^;]*)/.exec(r.headers.get("set-cookie") || "")?.[1] || "";
async function login(body: object) {
  const r = await authPost(req("/api/auth", { method: "POST", body: JSON.stringify(body) }));
  return { r, j: await r.json(), cookie: decodeURIComponent(cookieOf(r)) };
}
const g = globalThis as unknown as { __drafts?: unknown };

beforeEach(() => {
  Object.assign(process.env, {
    MOCK_BACKEND: "1", AUTH_SECRET: "a".repeat(40),
    SITE_PINS: '{"bcp":"1111","dps":"2222"}',
    SITE_CUSTOM: '[{"nama":"Site Tambang ABC","pin":"3333"}]',
  });
  delete process.env.APP_PIN;
  g.__drafts = undefined;
});

test("login: PIN harus milik site yang dipilih", async () => {
  assert.equal((await login({ site: "dps", pin: "1111" })).r.status, 401);
  const ok = await login({ site: "dps", pin: "2222" });
  assert.equal(ok.r.status, 200);
  assert.equal(ok.j.site.id, "dps");
  assert.ok(ok.cookie.startsWith("v2.dps."));
});

test("login: klien lama yang hanya mengirim PIN masuk ke BCP", async () => {
  const r = await login({ pin: "1111" });
  assert.equal(r.r.status, 200);
  assert.equal(r.j.site.id, "bcp");
});

test("login site custom lewat nama; nama salah tidak membocorkan daftar site", async () => {
  const ok = await login({ site: "custom", nama: "tambang abc", pin: "3333" });
  assert.equal(ok.r.status, 200);
  assert.equal(ok.j.site.nama, "Site Tambang ABC");
  const bad = await login({ site: "custom", nama: "Tambang XYZ", pin: "3333" });
  assert.equal(bad.r.status, 401);
  assert.equal(bad.j.error, (await login({ site: "custom", nama: "Tambang ABC", pin: "0000" })).j.error);
});

test("login site standar yang belum punya PIN ditolak", async () => {
  const r = await login({ site: "kintap", pin: "1111" });
  assert.equal(r.r.status, 403);
});

test("GET /api/auth: site aktif dan daftar site standar yang bisa dipilih", async () => {
  const anon = await (await authGet(req("/api/auth"))).json();
  assert.equal(anon.ok, false);
  assert.deepEqual(anon.sites.map((s: { id: string }) => s.id), ["bcp", "dps"]);
  const { cookie } = await login({ site: "dps", pin: "2222" });
  const me = await (await authGet(req("/api/auth", { cookie }))).json();
  assert.equal(me.ok, true);
  assert.equal(me.site.id, "dps");
  assert.equal(me.site.laporan, "DH DPS");
});

test("isolasi draf: DPS tidak bisa membaca atau menimpa draf BCP", async () => {
  const bcp = (await login({ site: "bcp", pin: "1111" })).cookie;
  const dps = (await login({ site: "dps", pin: "2222" })).cookie;
  const put = (cookie: string, at: number, jn: string, extra: object = {}) =>
    draftPut(req("/api/draft", { method: "PUT", cookie, body: JSON.stringify({ at, day: "2026-11-06", device: "HP", state: { jn, ...extra }, ...extra }) }));
  assert.equal((await put(bcp, 1000, "Reguler BCP")).status, 200);
  // DPS menulis dengan waktu lebih baru dan mencoba menyelipkan site lain di isi permintaan.
  assert.equal((await put(dps, 2000, "BBQ DPS", { site: "bcp" })).status, 200);
  const readBcp = await (await draftGet(req("/api/draft", { cookie: bcp }))).json();
  const readDps = await (await draftGet(req("/api/draft", { cookie: dps }))).json();
  assert.equal(readBcp.draft.state.jn, "Reguler BCP");
  assert.equal(readDps.draft.state.jn, "BBQ DPS");
});

test("tab lama yang masih membuka BCP tidak bisa menulis ke DPS setelah cookie berganti (409)", async () => {
  const dps = (await login({ site: "dps", pin: "2222" })).cookie;
  const body = JSON.stringify({ at: 5000, day: "2026-11-06", device: "HP", state: { jn: "isi tab BCP" } });
  const r = await draftPut(req("/api/draft", { method: "PUT", cookie: dps, body, headers: { "x-site": "bcp" } }));
  assert.equal(r.status, 409);
  assert.equal((await r.json()).error, "site");
  assert.equal((await draftGet(req("/api/draft", { cookie: dps, headers: { "x-site": "bcp" } }))).status, 409);
  assert.equal((await (await draftGet(req("/api/draft", { cookie: dps }))).json()).draft, null);
  assert.equal((await draftPut(req("/api/draft", { method: "PUT", cookie: dps, body, headers: { "x-site": "dps" } }))).status, 200);
});

test("tanpa cookie atau dengan cookie palsu, data ditolak (401)", async () => {
  const dps = (await login({ site: "dps", pin: "2222" })).cookie.split(".");
  dps[1] = "bcp";
  for (const cookie of [undefined, "acak", dps.join(".")]) {
    assert.equal((await draftGet(req("/api/draft", { cookie }))).status, 401, String(cookie));
    assert.equal((await foodsGet(req("/api/foods", { cookie }))).status, 401, String(cookie));
  }
});

test("logout menghapus cookie", async () => {
  const r = await logout();
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie") || "", /tf_auth=;.*Max-Age=0/);
});

test("batas percobaan PIN per IP: percobaan ke-11 ditolak (429)", async () => {
  let last = 0;
  for (let i = 0; i < 11; i++) last = (await authPost(req("/api/auth", { method: "POST", ip: "10.9.9.9", body: JSON.stringify({ site: "dps", pin: "0" }) }))).status;
  assert.equal(last, 429);
});

test("login yang berhasil tidak dihitung: satu Wi-Fi site (satu IP) bisa dipakai banyak orang", async () => {
  let last = 0;
  for (let i = 0; i < 15; i++) last = (await authPost(req("/api/auth", { method: "POST", ip: "10.8.8.8", body: JSON.stringify({ site: "dps", pin: "2222" }) }))).status;
  assert.equal(last, 200);
});

test("clientIp: X-Real-IP dari proxy, lalu entri terakhir X-Forwarded-For (yang ditambahkan proxy)", () => {
  const h = (o: Record<string, string>) => new NextRequest(BASE, { headers: o });
  assert.equal(clientIp(h({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "6.6.6.6, 2.2.2.2" })), "1.1.1.1");
  assert.equal(clientIp(h({ "x-forwarded-for": "6.6.6.6, 2.2.2.2" })), "2.2.2.2");
  assert.equal(clientIp(h({})), "local");
});

test("mode coba tanpa PIN sama sekali: terbuka sebagai BCP", async () => {
  delete process.env.SITE_PINS;
  delete process.env.SITE_CUSTOM;
  const me = await (await authGet(req("/api/auth"))).json();
  assert.equal(me.ok, true);
  assert.equal(me.site.id, "bcp");
  assert.equal((await draftGet(req("/api/draft"))).status, 200);
});
