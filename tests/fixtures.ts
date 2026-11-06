// State contoh untuk uji (sama dengan nilai awal App.tsx).
import { initMD } from "@/lib/pattern";
import type { State } from "@/lib/report";

export function baseState(p: Partial<State> = {}): State {
  return {
    tab: "tf", pukul: false, jam: "", zona: "WITA", mealAuto: true, jn: "Reguler", live: false, liveMenu: "",
    dt: "2026-11-06", meal: "Breakfast", site: "BCP", sxi: "", ks: "Makanan dalam kondisi layak untuk dikonsumsi",
    ksite: "DH BCP", camp: "Camp Pelangi", rule: true, md: initMD(), ...p,
  };
}
