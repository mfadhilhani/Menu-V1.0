import { NextRequest, NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getDraft, putDraft } from "@/lib/store";

// Sinkronisasi isian (teks saja) antar perangkat dalam SATU site. Site diambil dari cookie login,
// jadi perangkat DPS tidak bisa membaca atau menimpa draf BCP walau isi permintaannya diubah.
const fail = (e: unknown) => {
  console.error("[draft]", e);
  return NextResponse.json({ error: "Gagal menyimpan atau membaca draf di server" }, { status: 500 });
};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
// Cookie login dipakai bersama semua tab di browser. Kalau satu tab login ke site lain, tab lama yang masih
// membuka site sebelumnya mengirim X-Site lama: ditolak 409 supaya isiannya tidak masuk ke draf site baru.
function siteOf(req: NextRequest) {
  const s = session(req);
  if ("error" in s) return s;
  const want = req.headers.get("x-site");
  if (want && want !== s.site.id) return { error: NextResponse.json({ error: "site", site: s.site.id }, { status: 409 }) };
  return s;
}

// GET ?since=<waktu>: isi draf hanya dikirim kalau lebih baru dari yang sudah dimiliki perangkat (hemat data).
export async function GET(req: NextRequest) {
  const s = siteOf(req);
  if ("error" in s) return s.error;
  try {
    const since = Number(req.nextUrl.searchParams.get("since") || 0);
    const cur = await getDraft(s.site.id);
    if (!cur) return NextResponse.json({ draft: null });
    return NextResponse.json({ draft: cur.at > since ? cur : { at: cur.at, day: cur.day, device: cur.device } });
  } catch (e) { return fail(e); }
}

export async function PUT(req: NextRequest) {
  const s = siteOf(req);
  if ("error" in s) return s.error;
  try {
    const raw = await req.text();
    if (raw.length > 900000) return NextResponse.json({ error: "Isian terlalu besar" }, { status: 413 });
    let b: { at?: number; day?: string; device?: string; state?: Record<string, unknown> };
    try { b = JSON.parse(raw); } catch { return NextResponse.json({ error: "Data draf tidak valid" }, { status: 400 }); }
    const at = Number(b.at);
    if (!Number.isFinite(at) || at <= 0 || !DAY.test(String(b.day || "")) || !b.state || typeof b.state !== "object" || Array.isArray(b.state)) {
      return NextResponse.json({ error: "Data draf tidak valid" }, { status: 400 });
    }
    const r = await putDraft(s.site.id, { at, day: String(b.day), device: String(b.device || "").slice(0, 30), state: b.state });
    return NextResponse.json(r);
  } catch (e) { return fail(e); }
}
