// Loader uji: membuat kode sumber bisa diimpor langsung oleh `node --test` (Node 22, tanpa paket tambahan).
// - "@/x"         -> src/x.ts (alias dari tsconfig)
// - "./x" tanpa ekstensi -> ./x.ts atau ./x/index.ts (gaya impor Next.js)
// - "next/server" -> stub kecil di tests/stubs bila paket next belum terpasang (mis. di sandbox tanpa npm install).
//   Di CI (setelah npm ci) paket next yang asli yang dipakai.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SRC = path.join(ROOT, "src");
const STUBS = { "next/server": path.join(ROOT, "tests", "stubs", "next-server.ts") };
const EXTS = [".ts", ".tsx", "/index.ts"];

function withExt(base) {
  for (const e of EXTS) if (existsSync(base + e)) return pathToFileURL(base + e).href;
  return null;
}

export async function resolve(spec, ctx, next) {
  if (spec.startsWith("@/")) {
    const hit = withExt(path.join(SRC, spec.slice(2)));
    if (hit) return next(hit, ctx);
  }
  if ((spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL?.startsWith("file:") && !path.extname(spec)) {
    const hit = withExt(path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec));
    if (hit) return next(hit, ctx);
  }
  if (spec in STUBS) {
    try { return await next(spec, ctx); } catch { return next(pathToFileURL(STUBS[spec]).href, ctx); }
  }
  return next(spec, ctx);
}
