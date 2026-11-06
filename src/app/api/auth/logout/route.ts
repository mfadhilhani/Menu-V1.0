import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/token";

// Keluar / ganti site: hapus cookie login di browser ini.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return res;
}
