import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { getDraft, putDraft } from "@/lib/store";

// Sinkronisasi isian (teks saja) antar perangkat. Disimpan di tab "draf" pada Google Sheet yang sama.
const fail = (e: unknown) => NextResponse.json({ error: e instanceof Error ? e.message : "Kesalahan server" }, { status: 500 });
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// GET ?since=<waktu>: isi draf hanya dikirim kalau lebih baru dari yang sudah dimiliki perangkat (hemat data).
export async function GET(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  try {
    const since = Number(req.nextUrl.searchParams.get("since") || 0);
    const cur = await getDraft();
    if (!cur) return NextResponse.json({ draft: null });
    return NextResponse.json({ draft: cur.at > since ? cur : { at: cur.at, day: cur.day, device: cur.device } });
  } catch (e) { return fail(e); }
}

export async function PUT(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  try {
    const raw = await req.text();
    if (raw.length > 900000) return NextResponse.json({ error: "Isian terlalu besar" }, { status: 413 });
    const b = JSON.parse(raw) as { at?: number; day?: string; device?: string; state?: Record<string, unknown> };
    const at = Number(b.at);
    if (!Number.isFinite(at) || at <= 0 || !DAY.test(String(b.day || "")) || !b.state || typeof b.state !== "object") {
      return NextResponse.json({ error: "Data draf tidak valid" }, { status: 400 });
    }
    const r = await putDraft({ at, day: String(b.day), device: String(b.device || "").slice(0, 30), state: b.state });
    return NextResponse.json(r);
  } catch (e) { return fail(e); }
}
