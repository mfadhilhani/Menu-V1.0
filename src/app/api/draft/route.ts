import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { getDraft, putDraft } from "@/lib/store";
import { siteKeyOf } from "@/lib/text";

// Sinkronisasi isian (teks saja) antar perangkat pada site yang sama. Satu baris per site di tab "draf" Google Sheet.
const fail = (e: unknown) => NextResponse.json({ error: e instanceof Error ? e.message : "Kesalahan server" }, { status: 500 });
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// GET ?site=<kunci>&since=<versi>: isi draf hanya dikirim kalau versinya lebih baru dari yang dimiliki perangkat (hemat data).
export async function GET(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  try {
    const site = siteKeyOf(req.nextUrl.searchParams.get("site") || "");
    if (!site) return NextResponse.json({ error: "Site belum diisi" }, { status: 400 });
    const since = Number(req.nextUrl.searchParams.get("since") || 0);
    const cur = await getDraft(site);
    if (!cur) return NextResponse.json({ draft: null });
    return NextResponse.json({ draft: cur.at > since ? cur : { at: cur.at, day: cur.day, device: cur.device } });
  } catch (e) { return fail(e); }
}

// PUT { site, base, day, device, state }: base = versi terakhir yang sudah dilihat perangkat ini.
// Jawaban { ok: true, at } kalau diterima, atau { ok: false, draft } kalau perangkat lain sudah mengubah lebih dulu.
export async function PUT(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  try {
    const raw = await req.text();
    if (raw.length > 900000) return NextResponse.json({ error: "Isian terlalu besar" }, { status: 413 });
    const b = JSON.parse(raw) as { site?: string; base?: number; day?: string; device?: string; state?: Record<string, unknown> };
    const site = siteKeyOf(String(b.site || "")), base = Number(b.base || 0);
    if (!site || !Number.isFinite(base) || base < 0 || !DAY.test(String(b.day || "")) || !b.state || typeof b.state !== "object" || Array.isArray(b.state)) {
      return NextResponse.json({ error: "Data draf tidak valid" }, { status: 400 });
    }
    const r = await putDraft(site, { base, day: String(b.day), device: String(b.device || "").slice(0, 30), state: b.state });
    return NextResponse.json(r);
  } catch (e) { return fail(e); }
}
