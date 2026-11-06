import { NextRequest, NextResponse } from "next/server";
import { authContext, clientIp, isMock, openMock, pinAllowed, pinFailed, session } from "@/lib/auth";
import { enabledStandard, findSite, toPublic } from "@/lib/site";
import { COOKIE, makeToken, same, TOKEN_DAYS } from "@/lib/token";

// Data site yang boleh dilihat browser setelah login (tanpa PIN).
const me = (s: { id: string; nama: string; jenis: "standar" | "custom"; laporan: string; camp: string }) => ({ ...toPublic(s), laporan: s.laporan, camp: s.camp });

// GET: status login, site aktif, dan daftar site standar yang bisa dipilih di layar login.
// Nama site custom tidak pernah didaftar di sini; pengguna mengetiknya sendiri.
export async function GET(req: NextRequest) {
  const c = authContext();
  if ("error" in c) return c.error;
  const sites = enabledStandard(c.cfg).map(toPublic);
  const s = session(req);
  if ("error" in s) {
    if (s.error.status !== 401) return s.error;
    return NextResponse.json({ ok: false, mock: isMock(), sites, custom: c.cfg.custom.length > 0 });
  }
  return NextResponse.json({ ok: true, mock: isMock(), open: openMock(c.cfg), site: me(s.site), sites });
}

// POST { site: "bcp" | "dps" | "kintap" | "custom", nama?: string, pin }. Klien lama yang hanya mengirim { pin } = BCP.
export async function POST(req: NextRequest) {
  const c = authContext();
  if ("error" in c) return c.error;
  const ip = clientIp(req);
  const b = (await req.json().catch(() => ({}))) as { site?: unknown; nama?: unknown; pin?: unknown };
  // Cek batas SETELAH isi permintaan dibaca: dari sini sampai pinFailed() tidak ada await, jadi permintaan yang
  // dikirim bersamaan tidak bisa lolos semua sebelum kegagalannya terhitung.
  if (!pinAllowed(ip)) return NextResponse.json({ error: "Terlalu banyak PIN salah dari jaringan ini. Coba lagi 10 menit lagi." }, { status: 429 });
  const pin = String(b.pin ?? "").slice(0, 64), id = String(b.site ?? "bcp");
  const custom = id === "custom";
  const site = custom ? findSite(c.cfg, { nama: String(b.nama ?? "").slice(0, 80) }) : findSite(c.cfg, { id });
  if (!site) {
    // Site standar yang belum punya PIN boleh disebut; nama site custom yang tidak ada tidak (supaya daftar site tidak bisa ditebak).
    if (!custom && ["bcp", "dps", "kintap"].includes(id)) return NextResponse.json({ error: "Site ini belum diaktifkan. Hubungi admin." }, { status: 403 });
    pinFailed(ip);
    return NextResponse.json({ error: custom ? "Nama site atau PIN salah" : "Site tidak dikenal" }, { status: custom ? 401 : 400 });
  }
  const real = c.cfg.pins.get(site.id) as string;
  if (!pin || !same(pin, real)) {
    pinFailed(ip);
    return NextResponse.json({ error: custom ? "Nama site atau PIN salah" : "PIN salah" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, site: me(site) });
  res.cookies.set(COOKIE, makeToken(c.secret, site.id, real), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TOKEN_DAYS * 86400 });
  return res;
}
