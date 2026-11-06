// Uji lapisan data (src/lib/store.ts) di mode coba (MOCK_BACKEND=1, memori server, tanpa Google).
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addFood, deleteFood, listFoods, updateFood } from "@/lib/store";

process.env.MOCK_BACKEND = "1";
const g = globalThis as unknown as { __mock?: unknown };
beforeEach(() => { g.__mock = undefined; });

test("katalog: tambah hanya kalau belum ada (tanpa beda huruf besar kecil)", async () => {
  const before = (await listFoods()).length;
  const a = await addFood({ nama: "soto banjar", deskripsi: "", kkal: 120, sumber: "manual", status: "sudah dicek", ikon: "" });
  assert.equal(a.created, true);
  assert.equal(a.food.nama, "Soto Banjar");
  const b = await addFood({ nama: "SOTO  BANJAR", deskripsi: "", kkal: 999, sumber: "AI", status: "belum dicek", ikon: "" });
  assert.equal(b.created, false);
  assert.equal(b.food.kkal, 120);
  assert.equal((await listFoods()).length, before + 1);
});

test("katalog: ubah dan hapus", async () => {
  const f = await updateFood("nasi putih", { kkal: 130, status: "sudah dicek" });
  assert.equal(f?.kkal, 130);
  assert.equal(await updateFood("tidak ada", { kkal: 1 }), null);
  assert.equal(await deleteFood("nasi putih"), true);
  assert.equal(await deleteFood("nasi putih"), false);
});
