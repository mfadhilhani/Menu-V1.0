import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { makeMp4, VIDEO } from "@/lib/video";

export const runtime = "nodejs";
export const maxDuration = 60;

// Terima gambar kartu (multipart: frames[] + sec), kembalikan MP4 untuk TV.
export async function POST(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
  let fd: FormData;
  try { fd = await req.formData(); } catch { return bad("Data tidak terbaca. Coba lagi dengan menu lebih sedikit."); }
  const sec = Number(fd.get("sec") || 5);
  if (!Number.isFinite(sec) || sec < VIDEO.MIN_SEC || sec > VIDEO.MAX_SEC) return bad("Durasi tidak valid");
  const list = fd.getAll("frames").filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f);
  if (!list.length) return bad("Tidak ada kartu untuk dijadikan video");
  if (list.length > VIDEO.MAX_FRAMES) return bad(`Maksimal ${VIDEO.MAX_FRAMES} kartu per video`);
  const frames: { data: Buffer; ext: string }[] = [];
  for (const f of list) {
    if (f.size > VIDEO.MAX_FRAME_BYTES) return bad("Gambar kartu terlalu besar");
    const data = Buffer.from(await f.arrayBuffer());
    const jpg = data[0] === 0xff && data[1] === 0xd8, png = data[0] === 0x89 && data[1] === 0x50;
    if (!jpg && !png) return bad("Format gambar tidak didukung");
    frames.push({ data, ext: jpg ? "jpg" : "png" });
  }
  try {
    const mp4 = await makeMp4(frames, sec);
    return new NextResponse(new Uint8Array(mp4), {
      headers: { "Content-Type": "video/mp4", "Content-Length": String(mp4.length), "Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="video-menu.mp4"' },
    });
  } catch (e) {
    console.error("[video]", e);
    return bad("Video gagal dibuat di server. " + (e instanceof Error ? e.message.slice(0, 300) : ""), 500);
  }
}
