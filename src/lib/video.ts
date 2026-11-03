// Pembuatan MP4 di server (ffmpeg). Hanya diimpor dari route API, tidak pernah dari browser.
// Hasil: H.264 High@4.0, yuv420p, 1920x1080, 25 fps (standar TV PAL di Indonesia), AAC senyap,
// moov di depan (faststart). Format ini diputar oleh TV, iPhone/Android, dan WhatsApp.
// Diuji dengan 6 kartu berfoto (mesin 2 core): preset veryfast + keyframe tiap 5 detik = ~0,8 MB, ~15 detik.
// (ultrafast lebih cepat sedikit tapi ~4,7 MB, melewati batas jawaban Vercel 4,5 MB.)
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const VIDEO = { W: 1920, H: 1080, FPS: 25, FADE: 0.6, EDGE: 0.5, MAX_FRAMES: 8, MIN_SEC: 2, MAX_SEC: 15, MAX_FRAME_BYTES: 3_000_000 };

// Urutan: FFMPEG_PATH (kalau diisi) -> paket ffmpeg-static -> "ffmpeg" di PATH server.
async function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    // @ts-ignore -- tipe paket bisa tidak ada; nilainya hanya path program (string atau null)
    const m = (await import("ffmpeg-static")) as unknown as { default?: string | null };
    if (m.default && existsSync(m.default)) return m.default;
  } catch { /* paket tidak terpasang */ }
  return "ffmpeg";
}

// Argumen ffmpeg untuk n gambar, tiap gambar tampil `sec` detik, dengan crossfade antar kartu
// serta fade dari/ke putih di awal dan akhir (enak diputar berulang di TV).
export function ffmpegArgs(files: string[], sec: number, out: string) {
  const { W, H, FPS, FADE, EDGE } = VIDEO;
  const n = files.length, len = sec + FADE, total = n * sec + FADE;
  const args = ["-y", "-hide_banner", "-loglevel", "error"];
  // Tiap gambar di-decode sekali, lalu frame-nya digandakan (loop filter). Jauh lebih cepat daripada
  // "-loop 1" yang men-decode JPEG ulang di setiap frame.
  files.forEach((f) => args.push("-i", f));
  args.push("-f", "lavfi", "-t", total.toFixed(3), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
  const fit = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0xCEDEEB,setsar=1,format=yuv420p,` +
    `loop=loop=-1:size=1:start=0,setpts=N/${FPS}/TB,trim=duration=${len.toFixed(3)}`;
  const parts = files.map((_, i) => `[${i}:v]${fit}[v${i}]`);
  let last = "v0";
  for (let i = 1; i < n; i++) {
    const o = `x${i}`;
    parts.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${(i * sec).toFixed(3)}[${o}]`);
    last = o;
  }
  parts.push(`[${last}]fade=t=in:st=0:d=${EDGE}:color=white,fade=t=out:st=${(total - EDGE).toFixed(3)}:d=${EDGE}:color=white[vout]`);
  args.push(
    "-filter_complex", parts.join(";"),
    "-map", "[vout]", "-map", `${n}:a`,
    "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-crf", "22",
    "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p", "-r", String(FPS), "-g", String(FPS * 5),
    "-c:a", "aac", "-b:a", "64k",
    "-t", total.toFixed(3), "-movflags", "+faststart", out,
  );
  return args;
}

function run(bin: string, args: string[], ms: number) {
  return new Promise<void>((res, rej) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err = (err + d).slice(-2000); });
    const t = setTimeout(() => { p.kill("SIGKILL"); rej(new Error("ffmpeg terlalu lama")); }, ms);
    p.on("error", (e) => { clearTimeout(t); rej(new Error(`ffmpeg tidak bisa dijalankan (${e.message})`)); });
    p.on("close", (code) => { clearTimeout(t); code === 0 ? res() : rej(new Error(`ffmpeg gagal (${code}): ${err.trim()}`)); });
  });
}

// frames: isi file gambar (JPEG/PNG) berurutan. Mengembalikan isi MP4.
export async function makeMp4(frames: { data: Buffer; ext: string }[], sec: number, timeoutMs = 50000) {
  const dir = await mkdtemp(join(tmpdir(), "tfvid-"));
  try {
    const files = await Promise.all(frames.map(async (f, i) => {
      const p = join(dir, `f${String(i).padStart(2, "0")}.${f.ext}`);
      await writeFile(p, f.data);
      return p;
    }));
    const out = join(dir, "out.mp4");
    await run(await ffmpegPath(), ffmpegArgs(files, sec, out), timeoutMs);
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
