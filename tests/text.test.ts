// Uji karakterisasi src/lib/text.ts: mengunci perilaku yang sudah benar sebelum V2.0 diubah.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dateParts, fmt, icon, mealByHour, norm, num, similar, toTitle, typoOnly, workDay } from "@/lib/text";

test("toTitle: kapital tiap kata, singkatan dan merek dipertahankan", () => {
  assert.equal(toTitle("nasi putih"), "Nasi Putih");
  assert.equal(toTitle("NASI PUTIH"), "Nasi Putih");
  assert.equal(toTitle("ayam BBQ"), "Ayam BBQ");
  assert.equal(toTitle("es krim McFlurry"), "Es Krim McFlurry");
  assert.equal(toTitle("  roti   bakar "), "Roti Bakar");
});

test("norm: huruf kecil, tanda baca jadi spasi, & dipertahankan", () => {
  assert.equal(norm("Roti & Selai!"), "roti & selai");
  assert.equal(norm("Gado-Gado"), "gado gado");
});

test("similar: typo dikenali, nama pendek dan nama sama diabaikan", () => {
  const list = [{ key: "nasi putih" }, { key: "tempe mendoan" }];
  assert.deepEqual(similar("Nasi Puth", list).map((x) => x.key), ["nasi putih"]);
  assert.deepEqual(similar("nasi putih", list), []);
  assert.deepEqual(similar("abc", list), []);
});

test("typoOnly: hanya typo yang dibetulkan, terjemahan ditolak", () => {
  assert.equal(typoOnly("Chiken Katsu", "Chicken Katsu").nama, "Chicken Katsu");
  assert.equal(typoOnly("Chicken Katsu", "Ayam Katsu").nama, "Chicken Katsu");
  assert.equal(typoOnly("Ice Lemon Tea", "Es Teh Lemon").nama, "Ice Lemon Tea");
  assert.equal(typoOnly("Ayamgoreng", "Ayam Goreng").nama, "Ayam Goreng");
});

test("num dan fmt: koma desimal Indonesia", () => {
  assert.equal(num("42,5"), 42.5);
  assert.equal(num(""), null);
  assert.equal(num("abc"), null);
  assert.equal(fmt(53.85), "53,85");
});

test("icon: jenis hidangan didahulukan atas bahan", () => {
  assert.equal(icon("Mie Ayam"), "🍜");
  assert.equal(icon("Nasi Putih"), "🍚");
  assert.equal(icon("Soto Ayam"), "🍲");
  assert.equal(icon("Ayam Goreng"), "🍗");
  assert.equal(icon("Sambal"), "🌶️");
  assert.equal(icon(""), "");
});

test("mealByHour: batas jam waktu makan", () => {
  assert.equal(mealByHour(2), "Supper");
  assert.equal(mealByHour(3), "Breakfast");
  assert.equal(mealByHour(8), "Breakfast");
  assert.equal(mealByHour(9), "Lunch");
  assert.equal(mealByHour(13), "Lunch");
  assert.equal(mealByHour(14), "Dinner");
  assert.equal(mealByHour(17), "Dinner");
  assert.equal(mealByHour(18), "Supper");
});

test("workDay: hari kerja berganti pukul 03.00", () => {
  assert.equal(workDay(new Date(2026, 10, 7, 2, 59)), "2026-11-06");
  assert.equal(workDay(new Date(2026, 10, 7, 3, 0)), "2026-11-07");
});

test("dateParts: nama hari dan bulan", () => {
  assert.deepEqual(dateParts("2026-11-06"), { hari: "Jum’at", d: 6, m: "November", y: 2026 });
});
