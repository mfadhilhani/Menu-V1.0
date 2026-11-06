// Pemisahan kunci foto per site di IndexedDB (logika kunci saja; IndexedDB sendiri hanya ada di browser).
import { test } from "node:test";
import assert from "node:assert/strict";
import { inScope, scopePrefix } from "@/lib/idb";

test("BCP memakai kunci lama tanpa awalan, site lain berawalan", () => {
  assert.equal(scopePrefix("bcp"), "");
  assert.equal(scopePrefix("dps"), "s:dps:");
  assert.equal(scopePrefix("c-tambang-abc"), "s:c-tambang-abc:");
});

test("Mulai baru hanya menghapus foto site aktif", () => {
  const keys = ["slot:B-sl-m1", "foto", "s:dps:slot:B-sl-m1", "s:dps:foto", "s:kintap:foto", "__hari"];
  assert.deepEqual(keys.filter((k) => inScope(k, scopePrefix("bcp"))), ["slot:B-sl-m1", "foto"]);
  assert.deepEqual(keys.filter((k) => inScope(k, scopePrefix("dps"))), ["s:dps:slot:B-sl-m1", "s:dps:foto"]);
});
