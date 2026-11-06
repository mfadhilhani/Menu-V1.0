// Uji argumen ffmpeg (murni) dan render nyata bila ffmpeg tersedia di mesin.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { ffmpegArgs, makeMp4, VIDEO } from "@/lib/video";

test("ffmpegArgs: satu input per gambar, crossfade di antaranya, durasi n*sec+fade", () => {
  const a = ffmpegArgs(["a.jpg", "b.jpg", "c.jpg"], 5, "out.mp4");
  assert.equal(a.filter((x) => x === "-i").length, 4); // 3 gambar + audio senyap
  const fc = a[a.indexOf("-filter_complex") + 1];
  assert.equal((fc.match(/xfade=/g) || []).length, 2);
  assert.equal(a[a.lastIndexOf("-t") + 1], (3 * 5 + VIDEO.FADE).toFixed(3));
  assert.ok(a.includes("+faststart"));
});

const hasFfmpeg = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", ["-version"]).status === 0;
test("makeMp4: menghasilkan MP4 dari template", { skip: !hasFfmpeg && "ffmpeg tidak ada di mesin ini" }, async () => {
  const f = (p: string) => ({ data: readFileSync(new URL(`../public/assets/${p}`, import.meta.url)), ext: "jpg" });
  const mp4 = await makeMp4([f("video-sampul.jpg"), f("kartu-landscape.jpg"), f("video-penutup.jpg")], 2);
  assert.ok(mp4.length > 10_000);
  assert.equal(mp4.subarray(4, 8).toString("ascii"), "ftyp");
});
