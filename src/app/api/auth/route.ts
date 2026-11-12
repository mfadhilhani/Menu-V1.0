import { NextRequest, NextResponse } from "next/server";
import { COOKIE, isMock, makeToken, pinOk, pinTries, tokenOk } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const open = isMock() && !process.env.APP_PIN;
  return NextResponse.json({ ok: open || tokenOk(req.cookies.get(COOKIE)?.value), mock: isMock() });
}
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!pinTries(ip)) return NextResponse.json({ error: "Terlalu banyak percobaan, coba lagi nanti" }, { status: 429 });
  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
  if (!pinOk(String(pin || ""))) return NextResponse.json({ error: "PIN salah" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, makeToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
  return res;
}
