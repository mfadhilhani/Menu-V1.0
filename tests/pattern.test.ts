// Uji karakterisasi pola daftar makanan (src/lib/pattern.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMeal, fillMealPattern, initMD } from "@/lib/pattern";

test("id baris pola tetap (sama di semua perangkat)", () => {
  const b = buildMeal("Breakfast");
  assert.deepEqual(b.slots.map((x) => x.id), ["B-sl-m1", "B-sl-m2", "B-sl-m3", "B-sl-m4"]);
  assert.deepEqual(b.menu.map((x) => x.n), ["Nasi Putih", "", "", "", "", "Sambal"]);
  assert.equal(b.rows.length, 9);
  const d = buildMeal("Dinner");
  assert.deepEqual(d.slots.map((x) => x.sid), ["m1", "m2", "m3", "m4", "kue1", "kue2"]);
  assert.equal(buildMeal("Lunch").slots.length, 0);
});

test("fillMealPattern: baris lama Breakfast dibuang, Lunch kosong diisi pola", () => {
  const md = initMD();
  md.Breakfast.menu.push({ id: "x", sid: "kerupuk", n: "Kerupuk", k: "Ok" });
  md.Lunch = { menu: [{ id: "a", n: "", k: "Ok" }], snack: [], buah: [], rows: [], slots: [] };
  const out = fillMealPattern(md);
  assert.ok(!out.Breakfast.menu.some((r) => r.sid === "kerupuk"));
  assert.equal(out.Lunch.menu[0].n, "Nasi Putih");
});
