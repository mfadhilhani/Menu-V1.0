// Uji karakterisasi teks laporan (src/lib/report.ts). Teks laporan dipakai di WhatsApp, jadi hasilnya dikunci persis.
import { test } from "node:test";
import assert from "node:assert/strict";
import { kaloriInfo, kaloriReport, testFoodReport, warnaMessage } from "@/lib/report";
import { baseState } from "./fixtures";

test("laporan Test Food Breakfast site BCP (format sekarang)", () => {
  const s = baseState();
  s.md.Breakfast.menu[1].n = "nasi pecel";
  s.md.Breakfast.menu[2].n = "Bubur Sumsum";
  assert.equal(testFoodReport(s), [
    "*Test Food Menu Reguler*",
    "*Jum’at, 06 November 2026*",
    "",
    "*Menu Breakfast Site BCP*",
    "1. Nasi Putih: Ok",
    "2. Nasi Pecel: Ok",
    "3. Bubur Sumsum: Ok",
    "4. Sambal: Ok",
    "",
    "*Kesimpulan :*",
    "Makanan dalam kondisi layak untuk dikonsumsi",
  ].join("\n"));
});

test("Pukul dan Live Cooking: Live Cooking hanya di Dinner", () => {
  const dinner = baseState({ meal: "Dinner", live: true, liveMenu: "menu lalapan", pukul: true, jam: "10:34" });
  const t = testFoodReport(dinner).split("\n");
  assert.equal(t[1], "*Live Cooking : Menu Lalapan*");
  assert.equal(t[3], "*Pukul : 10.34 WITA*");
  const bf = baseState({ live: true, liveMenu: "menu lalapan" });
  assert.ok(!testFoodReport(bf).includes("Live Cooking"));
});

test("Dinner: Snack dan Buah tampil kalau diisi", () => {
  const s = baseState({ meal: "Dinner" });
  s.md.Dinner.snack[0].n = "Kue Lapis";
  s.md.Dinner.buah[0].n = "Pisang";
  const t = testFoodReport(s);
  assert.ok(t.includes("*Snack*\nKue Lapis: Ok"));
  assert.ok(t.includes("*Buah*\nPisang: Ok"));
});

test("laporan kalori: aturan 1.800 kkal tidak menghitung sambal dan kerupuk", () => {
  const s = baseState();
  const rows = s.md.Breakfast.rows;
  rows[0].kkal = "1500";
  rows[5].kkal = "300"; // Sambal
  rows[6].kkal = "100"; // Kerupuk
  const info = kaloriInfo(s);
  assert.equal(info.all, 1900);
  assert.equal(info.skip, true);
  assert.equal(info.tot, 1500);
  const r = kaloriReport(s).split("\n");
  assert.equal(r[0], "🍽️ Menu Breakfast DH BCP 🍽️");
  assert.equal(r[2], "🌈 Camp Pelangi 🌈");
  assert.ok(kaloriReport(s).includes("Total Kalori = 1.500kkal"));
});

test("pesan kode warna", () => {
  assert.equal(warnaMessage(baseState()), "Kode warna makanan Breakfast site BCP\nJum’at, 06 November 2026");
});

test("nama site custom berawalan 'Site' tidak ditulis ganda (B9)", () => {
  const s = baseState({ site: "Site Tambang ABC" });
  assert.ok(testFoodReport(s).includes("\n*Menu Breakfast Site Tambang ABC*\n"));
  assert.equal(warnaMessage(s).split("\n")[0], "Kode warna makanan Breakfast Site Tambang ABC");
  const k = baseState({ site: "Kintap Project" });
  assert.ok(testFoodReport(k).includes("\n*Menu Breakfast Site Kintap Project*\n"));
});

test("draf lama dengan site custom kosong tidak menulis 'Site -' (B10)", () => {
  const s = baseState({ site: "__x", sxi: " " });
  assert.ok(testFoodReport(s).includes("\n*Menu Breakfast*\n"));
  assert.ok(!testFoodReport(s).includes("Site -"));
});
