// Nama tab draf per site di Google Sheet (tanpa memanggil Google).
import { test } from "node:test";
import assert from "node:assert/strict";
import { draftTabName } from "@/lib/sheets";

test("BCP tetap memakai tab draf lama; site lain draf_<id>", () => {
  const prev = process.env.SHEET_DRAFT_TAB;
  delete process.env.SHEET_DRAFT_TAB;
  try {
    assert.equal(draftTabName("bcp"), "draf");
    assert.equal(draftTabName("dps"), "draf_dps");
    assert.equal(draftTabName("c-tambang-abc"), "draf_c-tambang-abc");
    process.env.SHEET_DRAFT_TAB = "isian";
    assert.equal(draftTabName("bcp"), "isian");
    assert.equal(draftTabName("kintap"), "isian_kintap");
  } finally {
    if (prev === undefined) delete process.env.SHEET_DRAFT_TAB; else process.env.SHEET_DRAFT_TAB = prev;
  }
});
