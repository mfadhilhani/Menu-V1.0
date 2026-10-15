import { NextRequest, NextResponse } from "next/server";
import { aiAllowed, guard } from "@/lib/auth";
import { AIError, askGemini } from "@/lib/gemini";
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
    if (!aiAllowed()) return NextResponse.json({ status: "error", message: "Batas AI hari ini habis", hint: "Batas panggilan AI per hari (AI_DAILY_LIMIT) tercapai. Isi kalori manual atau coba besok." });
    const ai = await askGemini(nm);
    const { food, created } = await addFood({ nama: ai.nama, deskripsi: ai.deskripsi, kkal: ai.kkal, sumber: "AI", status: "belum dicek" });
    return NextResponse.json({ status: created ? "created" : "found", food });
  } catch (e) {
    console.error("[resolve]", e);
    if (e instanceof AIError) {
      const m: Record<string, [string, string, boolean]> = {
        busy: ["AI sedang sibuk", "Server Gemini sedang penuh atau tidak menjawab (sementara). Sudah dicoba ulang dan dengan model cadangan. Coba lagi sebentar lagi, atau isi kalori manual.", true],
        quota: ["Kuota AI habis", "Batas kuota Gemini tercapai. Coba lagi nanti atau isi kalori manual.", true],
        config: ["AI belum diatur", "GEMINI_API_KEY belum diisi atau ditolak. Periksa pengaturan di server.", false],
        notfood: ["Bukan makanan?", "AI tidak mengenali ini sebagai makanan atau minuman. Periksa tulisannya.", false],
        bad: ["AI gagal, coba lagi", "Jawaban AI tidak bisa dipakai. Coba lagi.", true],
      };
      const [message, hint, retry] = m[e.code] || m.bad;
      return NextResponse.json({ status: "error", message, hint, retry });
    }
    return NextResponse.json({ status: "error", message: "Gagal, coba lagi", hint: e instanceof Error ? e.message : "Kesalahan server", retry: true });
  }
}
