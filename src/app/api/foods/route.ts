import { NextRequest, NextResponse } from "next/server";
import { guard, isMock } from "@/lib/auth";
import { deleteFood, listFoods, updateFood } from "@/lib/store";
import { clean, num } from "@/lib/text";

const fail = (e: unknown) => NextResponse.json({ error: e instanceof Error ? e.message : "Kesalahan server" }, { status: 500 });

export async function GET(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  try {
    return NextResponse.json({ foods: await listFoods(req.nextUrl.searchParams.get("fresh") === "1"), mock: isMock() });
  } catch (e) { return fail(e); }
}
export async function PATCH(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  try {
    const b = await req.json();
    const patch: { deskripsi?: string; kkal?: number | null; status?: string; sumber?: string } = {};
    if (typeof b.deskripsi === "string") patch.deskripsi = clean(b.deskripsi).split(" ").slice(0, 14).join(" ");
    if ("kkal" in b) patch.kkal = num(b.kkal);
    if (b.status === "sudah dicek" || b.status === "belum dicek") patch.status = b.status;
    if (patch.kkal !== undefined) patch.sumber = "manual";
    const f = await updateFood(String(b.key || ""), patch);
    return f ? NextResponse.json({ food: f }) : NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  } catch (e) { return fail(e); }
}
export async function DELETE(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  try {
    const ok = await deleteFood(req.nextUrl.searchParams.get("key") || "");
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  } catch (e) { return fail(e); }
}
