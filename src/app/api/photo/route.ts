import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { PHOTO_MAX, photoDelete, photoEnabled, photoRead, photoWrite } from "@/lib/photostore";
import { norm } from "@/lib/text";

export const runtime = "nodejs";

// Simpanan foto menu di server (hanya kalau PHOTO_DIR diisi). Kunci = nama makanan yang dinormalkan.
const keyOf = (req: NextRequest) => norm(req.nextUrl.searchParams.get("key") || "").slice(0, 120);

// GET ?info=1 -> { enabled }. GET ?key=<nama> -> JPEG, atau 404 kalau belum ada.
export async function GET(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  if (req.nextUrl.searchParams.get("info")) return NextResponse.json({ enabled: photoEnabled() });
  const key = keyOf(req);
  if (!key) return NextResponse.json({ error: "Kunci kosong" }, { status: 400 });
  const f = await photoRead(key);
  if (!f) return NextResponse.json({ error: "Tidak ada" }, { status: 404 });
  return new NextResponse(new Uint8Array(f.data), { headers: { "Content-Type": "image/jpeg", "Content-Length": String(f.data.length), "Cache-Control": "private, no-cache", "X-Photo-At": String(f.at) } });
}

// PUT ?key=<nama>, isi = file JPEG (sudah dikecilkan di browser).
export async function PUT(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  if (!photoEnabled()) return NextResponse.json({ error: "Simpanan foto di server belum diaktifkan (PHOTO_DIR)" }, { status: 501 });
  const key = keyOf(req);
  if (key.length < 2) return NextResponse.json({ error: "Kunci kosong" }, { status: 400 });
  try {
    const data = Buffer.from(await req.arrayBuffer());
    if (data.length > PHOTO_MAX) return NextResponse.json({ error: "Foto terlalu besar" }, { status: 413 });
    if (!(data[0] === 0xff && data[1] === 0xd8)) return NextResponse.json({ error: "Foto harus JPEG" }, { status: 400 });
    await photoWrite(key, data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[photo]", e);
    return NextResponse.json({ error: "Foto gagal disimpan di server" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  if (!photoEnabled()) return NextResponse.json({ ok: true });
  const key = keyOf(req);
  if (key) await photoDelete(key);
  return NextResponse.json({ ok: true });
}
