import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { addFood } from "@/lib/store";
import { clean, num } from "@/lib/text";

export const maxDuration = 60;

// Impor cadangan lama (tanpa AI): hanya menambah makanan yang belum ada.
export async function POST(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  try {
    const { items } = (await req.json()) as { items?: { n?: string; k?: number | string; d?: string }[] };
    let added = 0, skipped = 0;
    for (const it of (items || []).slice(0, 500)) {
      const nama = clean(String(it.n || ""));
      if (nama.length < 2) continue;
      const r = await addFood({ nama, deskripsi: clean(String(it.d || "")).split(" ").slice(0, 14).join(" "), kkal: num(it.k as string), sumber: "manual", status: "sudah dicek" });
      if (r.created) added++; else skipped++;
    }
    return NextResponse.json({ added, skipped });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal" }, { status: 500 });
  }
}
