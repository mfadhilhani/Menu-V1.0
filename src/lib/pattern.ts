// Pola daftar makanan per waktu makan. Baris dengan sid yang sama tersinkron antar Test Food, Daftar makanan, dan Poster.
import type { KR, MealData, MealKey, Slot, TF } from "./report";
import { uid } from "./text";

const tf = (sid?: string, n = ""): TF => ({ id: uid(), sid, n, k: "Ok" });
const kr = (sid: string, n = ""): KR => ({ id: uid(), sid, n, kkal: "", gram: "100", pf: !!n }); // pf: kalori diisi dari Sheet begitu datanya ada
const sl = (sid: string): Slot => ({ id: uid(), sid, n: "", kkal: "", desc: "" });

export function buildMeal(m: MealKey): MealData {
  if (m === "Breakfast") {
    // 1 Nasi Putih | 2-5 menu berubah (m1-m4) | 6 Sambal | 7 Kerupuk | 8 Roti & Selai | 9 Gula, Kopi, Teh
    const f: [string, string][] = [["sambal", "Sambal"], ["kerupuk", "Kerupuk"], ["roti", "Roti & Selai"], ["gkt", "Gula, Kopi, Teh"]];
    return {
      menu: [tf("nasi", "Nasi Putih"), tf("m1"), tf("m2"), tf("m3"), tf("m4"), ...f.map(([s, n]) => tf(s, n))],
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
  // Lunch dan Supper: belum ada pola, hanya Test Food.
  return { menu: Array.from({ length: 6 }, () => tf()), snack: [], buah: [], rows: [], slots: [] };
}
export const initMD = (): Record<MealKey, MealData> => ({
  Breakfast: buildMeal("Breakfast"), Lunch: buildMeal("Lunch"), Dinner: buildMeal("Dinner"), Supper: buildMeal("Supper"),
});
