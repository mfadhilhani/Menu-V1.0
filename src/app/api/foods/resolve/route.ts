import { NextRequest, NextResponse } from "next/server";
import { aiAllowed, guard } from "@/lib/auth";
import { askGemini } from "@/lib/gemini";
import { addFood, listFoods } from "@/lib/store";
import { clean, norm, similar } from "@/lib/text";

export const maxDuration = 30;

// Alur: cocok persis -> found | mirip -> similar (klien menanyakan) | baru -> Gemini lalu tulis ke Sheet -> created
export async function POST(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  const { name, forceNew } = (await req.json().catch(() => ({}))) as { name?: string; forceNew?: boolean };
  const nm = clean(String(name || ""));
  const key = norm(nm);
  if (nm.length < 2 || nm.length > 80 || !key) return NextResponse.json({ status: "error", message: "Nama tidak valid" }, { status: 400 });
  try {
    const foods = await listFoods();
    const exact = foods.find((f) => f.key === key);
    if (exact) return NextResponse.json({ status: "found", food: exact });
    if (!forceNew) {
      const cands = similar(nm, foods);
      if (cands.length) return NextResponse.json({ status: "similar", candidates: cands });
    }
    if (!aiAllowed()) return NextResponse.json({ status: "error", message: "Batas panggilan AI hari ini habis" });
    const ai = await askGemini(nm);
    const { food, created } = await addFood({ nama: ai.nama, deskripsi: ai.deskripsi, kkal: ai.kkal, sumber: "AI", status: "belum dicek" });
    return NextResponse.json({ status: created ? "created" : "found", food });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e instanceof Error ? e.message : "Gagal" });
  }
}
