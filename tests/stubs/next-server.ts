// Stub minimal "next/server" untuk uji di lingkungan tanpa paket next.
// Hanya bagian yang dipakai route di proyek ini: req.cookies.get, req.nextUrl, NextResponse.json, res.cookies.set.
// Dipakai oleh tests/hooks.mjs hanya kalau paket next yang asli tidak ditemukan.
type CookieOpts = { httpOnly?: boolean; sameSite?: string; secure?: boolean; path?: string; maxAge?: number };

function parseCookies(h: string | null) {
  const m = new Map<string, string>();
  (h || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) m.set(p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1).trim()));
  });
  return m;
}

export class NextRequest extends Request {
  nextUrl: URL;
  cookies: { get: (name: string) => { name: string; value: string } | undefined };
  constructor(input: string | URL, init?: RequestInit) {
    super(input, init);
    this.nextUrl = new URL(typeof input === "string" ? input : input.href);
    const jar = parseCookies(this.headers.get("cookie"));
    this.cookies = { get: (name) => (jar.has(name) ? { name, value: jar.get(name) as string } : undefined) };
  }
}

export class NextResponse extends Response {
  cookies: { set: (name: string, value: string, o?: CookieOpts) => void };
  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body, init);
    this.cookies = {
      set: (name, value, o = {}) => {
        const parts = [`${name}=${encodeURIComponent(value)}`];
        if (o.path) parts.push(`Path=${o.path}`);
        if (o.maxAge !== undefined) parts.push(`Max-Age=${o.maxAge}`);
        if (o.httpOnly) parts.push("HttpOnly");
        if (o.secure) parts.push("Secure");
        if (o.sameSite) parts.push(`SameSite=${o.sameSite}`);
        this.headers.append("set-cookie", parts.join("; "));
      },
    };
  }
  static json(body: unknown, init?: ResponseInit) {
    const h = new Headers(init?.headers);
    h.set("content-type", "application/json");
    return new NextResponse(JSON.stringify(body), { ...init, headers: h });
  }
}
