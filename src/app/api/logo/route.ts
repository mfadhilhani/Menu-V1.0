import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { getLogo, putLogo } from "@/lib/store";
import { siteKeyOf } from "@/lib/text";

// Logo site selain BCP (gambar kecil, dikecilkan dulu di browser). Disimpan di tab "logo" Google Sheet supaya
// muncul di semua perangkat pada site yang sama.
const fail = (e: unknown) => NextResponse.json({ error: e instanceof Error ? e.message : "Kesalahan server" }, { status: 500 });
const DATA = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX = 400000; // karakter data URL (sekitar 300 KB gambar)

// GET ?site=<kunci>&since=<versi>
export async function GET(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  try {
    const site = siteKeyOf(req.nextUrl.searchParams.get("site") || "");
    if (!site) return NextResponse.json({ error: "Site belum diisi" }, { status: 400 });
    const since = Number(req.nextUrl.searchParams.get("since") || 0);
    const cur = await getLogo(site);
    if (!cur) return NextResponse.json({ logo: null });
    return NextResponse.json({ logo: cur.at > since ? cur : { at: cur.at } });
  } catch (e) { return fail(e); }
}

// PUT { site, data, device }: data = data URL gambar, atau "" untuk menghapus logo.
export async function PUT(req: NextRequest) {
  const d = guard(req);
  if (d) return d;
  try {
    const raw = await req.text();
    if (raw.length > MAX + 1000) return NextResponse.json({ error: "Logo terlalu besar" }, { status: 413 });
    const b = JSON.parse(raw) as { site?: string; data?: string; device?: string };
    const site = siteKeyOf(String(b.site || "")), data = String(b.data || "");
    if (!site || (data && (data.length > MAX || !DATA.test(data)))) return NextResponse.json({ error: "Logo tidak valid" }, { status: 400 });
    const r = await putLogo(site, data, String(b.device || "").slice(0, 30));
    return NextResponse.json({ ok: true, at: r.at });
  } catch (e) { return fail(e); }
}
