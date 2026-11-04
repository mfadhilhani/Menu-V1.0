// Pola daftar makanan per waktu makan. Baris dengan sid yang sama tersinkron antar Test Food, Daftar makanan, dan Poster.
import type { KR, MealData, MealKey, Slot, TF } from "./report";

// Id baris pola dibuat tetap (mis. "B-sl-m1"), bukan acak, supaya sama di semua perangkat.
// Foto poster disimpan per id kotak, jadi foto yang diunggah di HP tetap menempel di kotak yang benar
// walaupun isiannya diketik di laptop. Foto dihapus tiap hari kerja baru, jadi id yang sama tidak membawa foto kemarin.
export function buildMeal(m: MealKey): MealData {
  const p = m[0];
  const tf = (sid: string, n = ""): TF => ({ id: `${p}-tf-${sid}`, sid, n, k: "Ok" });
  const kr = (sid: string, n = ""): KR => ({ id: `${p}-kr-${sid}`, sid, n, kkal: "", gram: "100", pf: !!n }); // pf: kalori diisi dari Sheet begitu datanya ada
  const sl = (sid: string): Slot => ({ id: `${p}-sl-${sid}`, sid, n: "", kkal: "", desc: "" });
  if (m === "Breakfast") {
    // Daftar makanan: 1 Nasi Putih | 2-5 menu berubah (m1-m4) | 6 Sambal | 7 Kerupuk | 8 Roti & Selai | 9 Gula, Kopi, Teh
    // Test Food cukup sampai nomor 6 (Nasi Putih, 4 menu, Sambal).
    const f: [string, string][] = [["sambal", "Sambal"], ["kerupuk", "Kerupuk"], ["roti", "Roti & Selai"], ["gkt", "Gula, Kopi, Teh"]];
    return {
      menu: [tf("nasi", "Nasi Putih"), tf("m1"), tf("m2"), tf("m3"), tf("m4"), tf("sambal", "Sambal")],
      snack: [], buah: [],
      rows: [kr("nasi", "Nasi Putih"), kr("m1"), kr("m2"), kr("m3"), kr("m4"), ...f.map(([s, n]) => kr(s, n))],
      slots: [sl("m1"), sl("m2"), sl("m3"), sl("m4")],
    };
  }
  if (m === "Dinner") {
    // 1 Nasi Putih | 2-5 menu berubah | 6 Sambal | 7 Buah | 8-9 Kue. Poster 6 menu = 2,3,4,5,8,9.
    return {
      menu: [tf("nasi", "Nasi Putih"), tf("m1"), tf("m2"), tf("m3"), tf("m4"), tf("sambal", "Sambal")],
      snack: [tf("kue1"), tf("kue2")],
      buah: [tf("buah")],
      rows: [kr("nasi", "Nasi Putih"), kr("m1"), kr("m2"), kr("m3"), kr("m4"), kr("sambal", "Sambal"), kr("buah"), kr("kue1"), kr("kue2")],
      slots: [sl("m1"), sl("m2"), sl("m3"), sl("m4"), sl("kue1"), sl("kue2")],
    };
  }
  // Lunch dan Supper (hanya Test Food): 1 Nasi Putih | 2-5 menu berubah | 6 Sambal.
  return {
    menu: [tf("nasi", "Nasi Putih"), tf("m1"), tf("m2"), tf("m3"), tf("m4"), tf("sambal", "Sambal")],
    snack: [], buah: [], rows: [], slots: [],
  };
}
// Menyesuaikan draf hari ini yang dibuat dengan pola lama:
// - Test Food Breakfast: baris tetap Kerupuk, Roti & Selai, dan Gula, Kopi, Teh dibuang (cukup sampai Sambal).
// - Lunch/Supper yang daftarnya masih kosong diisi pola baru; daftar yang sudah kamu isi tidak disentuh.
const BF_OLD = new Set(["kerupuk", "roti", "gkt"]);
export function fillMealPattern(md: Record<MealKey, MealData>): Record<MealKey, MealData> {
  const out = { ...md };
  if (out.Breakfast?.menu?.some((r) => r.sid && BF_OLD.has(r.sid))) {
    out.Breakfast = { ...out.Breakfast, menu: out.Breakfast.menu.filter((r) => !(r.sid && BF_OLD.has(r.sid))) };
  }
  (["Lunch", "Supper"] as MealKey[]).forEach((m) => {
    const menu = out[m]?.menu;
    if (!menu || (!menu.some((r) => r.sid) && menu.every((r) => !r.n.trim()))) out[m] = buildMeal(m);
  });
  return out;
}
export const initMD = (): Record<MealKey, MealData> => ({
  Breakfast: buildMeal("Breakfast"), Lunch: buildMeal("Lunch"), Dinner: buildMeal("Dinner"), Supper: buildMeal("Supper"),
});
