// Token login yang membawa site (src/lib/token.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { AuthConfigError, authSecret, makeToken, readToken } from "@/lib/token";

const S = "s".repeat(40);
const pins: Record<string, string> = { bcp: "1111", dps: "2222" };
const pinOf = (id: string) => pins[id];

test("token membawa site dan bisa dibaca ulang", () => {
  const t = makeToken(S, "dps", "2222");
  assert.deepEqual(readToken(S, t, pinOf), { siteId: "dps", legacy: false });
});

test("site di token tidak bisa diganti (tanda tangan rusak)", () => {
  const t = makeToken(S, "dps", "2222").split(".");
  t[1] = "bcp";
  assert.equal(readToken(S, t.join("."), pinOf), null);
});

test("ganti PIN site mencabut token lama site itu saja", () => {
  const dps = makeToken(S, "dps", "2222"), bcp = makeToken(S, "bcp", "1111");
  const after = (id: string) => ({ bcp: "1111", dps: "5555" } as Record<string, string>)[id];
  assert.equal(readToken(S, dps, after), null);
  assert.equal(readToken(S, bcp, after)?.siteId, "bcp");
});

test("token kedaluwarsa, rahasia lain, site nonaktif, dan teks acak ditolak", () => {
  const now = Date.now();
  assert.equal(readToken(S, makeToken(S, "dps", "2222", 30, now - 31 * 86400000), pinOf), null);
  assert.equal(readToken("lain".repeat(10), makeToken(S, "dps", "2222"), pinOf), null);
  assert.equal(readToken(S, makeToken(S, "kintap", "x"), pinOf), null);
  for (const bad of ["", "abc", "v2.dps.1.2", "v2....", "1.2.3"]) assert.equal(readToken(S, bad, pinOf), null, bad);
});

test("token V1 (exp.tanda) tetap diterima sebagai BCP selama BCP aktif", () => {
  const exp = Date.now() + 86400000;
  const legacy = `${exp}.${createHmac("sha256", S).update(String(exp)).digest("hex")}`;
  assert.deepEqual(readToken(S, legacy, pinOf), { siteId: "bcp", legacy: true });
  assert.equal(readToken(S, legacy, (id) => (id === "dps" ? "2222" : undefined)), null);
});

test("AUTH_SECRET wajib di produksi; mode coba dan pengembangan punya cadangan", () => {
  assert.throws(() => authSecret({ NODE_ENV: "production", APP_PIN: "1111" }), AuthConfigError);
  assert.equal(authSecret({ NODE_ENV: "production", AUTH_SECRET: S }), S);
  assert.ok(authSecret({ NODE_ENV: "production", MOCK_BACKEND: "1" }).length > 0);
  assert.ok(authSecret({ NODE_ENV: "development" }).length > 0);
});
