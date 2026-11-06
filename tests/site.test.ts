// Identitas site (src/lib/site.ts): satu sumber nama site untuk laporan, poster, dan video.
import { test } from "node:test";
import assert from "node:assert/strict";
import { enabledStandard, findSite, pinFor, siteById, siteConfig, siteLabel, slug, STANDARD } from "@/lib/site";

test("site standar: BCP, DPS, Kintap Project", () => {
  assert.deepEqual(STANDARD.map((s) => [s.id, s.nama, s.jenis]), [["bcp", "BCP", "standar"], ["dps", "DPS", "standar"], ["kintap", "Kintap Project", "standar"]]);
  assert.equal(STANDARD[0].laporan, "DH BCP");
  assert.equal(STANDARD[0].camp, "Camp Pelangi");
});

test("siteLabel: awalan 'Site' tidak ditulis ganda (B9)", () => {
  assert.equal(siteLabel("BCP"), "Site BCP");
  assert.equal(siteLabel("Site Tambang ABC"), "Site Tambang ABC");
  assert.equal(siteLabel("site tambang"), "site tambang");
  assert.equal(siteLabel("BCP", "site"), "site BCP");
  assert.equal(siteLabel("Situs Baru"), "Site Situs Baru");
  assert.equal(siteLabel("  "), "");
});

test("slug: huruf kecil, tanda hubung, maks. 40 karakter", () => {
  assert.equal(slug("  Tambang  ABC! "), "tambang-abc");
  assert.equal(slug("Kintap Project"), "kintap-project");
  assert.equal(slug("x".repeat(60)).length, 40);
});

test("siteConfig: SITE_PINS per site, APP_PIN lama dipakai untuk BCP", () => {
  const a = siteConfig({ APP_PIN: "1111" });
  assert.equal(pinFor(a, "bcp"), "1111");
  assert.equal(pinFor(a, "dps"), undefined);
  const b = siteConfig({ APP_PIN: "1111", SITE_PINS: '{"bcp":"9999","dps":"2222"}' });
  assert.equal(pinFor(b, "bcp"), "9999");
  assert.equal(pinFor(b, "dps"), "2222");
  assert.deepEqual(enabledStandard(b).map((s) => s.id), ["bcp", "dps"]);
  assert.equal(siteById(b, "kintap"), null); // tanpa PIN = belum aktif
});

test("siteConfig: site custom dari SITE_CUSTOM", () => {
  const c = siteConfig({ SITE_CUSTOM: '[{"nama":"Site Tambang ABC","pin":"3333","laporan":"ABC"}]' });
  const s = siteById(c, "c-tambang-abc");
  assert.ok(s);
  assert.equal(s.nama, "Site Tambang ABC");
  assert.equal(s.jenis, "custom");
  assert.equal(s.laporan, "ABC");
  assert.equal(s.camp, "");
  assert.equal(pinFor(c, "c-tambang-abc"), "3333");
});

test("findSite: nama custom cocok tanpa peduli huruf besar dan awalan 'Site'", () => {
  const c = siteConfig({ SITE_CUSTOM: '[{"nama":"Site Tambang ABC","pin":"3333"}]', SITE_PINS: '{"dps":"2"}' });
  for (const n of ["Tambang ABC", "site tambang abc", "SITE  Tambang-ABC"]) assert.equal(findSite(c, { nama: n })?.id, "c-tambang-abc", n);
  assert.equal(findSite(c, { nama: "Tambang XYZ" }), null);
  assert.equal(findSite(c, { id: "dps" })?.nama, "DPS");
  assert.equal(findSite(c, { id: "bcp" }), null);
  assert.equal(findSite(c, { id: "c-tambang-abc" }), null, "site custom hanya ditemukan lewat nama");
});

test("siteConfig: konfigurasi rusak ditolak, tidak diam-diam diabaikan", () => {
  assert.throws(() => siteConfig({ SITE_PINS: "{bukan json" }), /SITE_PINS/);
  assert.throws(() => siteConfig({ SITE_PINS: '{"xyz":"1"}' }), /SITE_PINS/);
  assert.throws(() => siteConfig({ SITE_CUSTOM: '[{"nama":"A"}]' }), /SITE_CUSTOM/);
  assert.throws(() => siteConfig({ SITE_CUSTOM: '[{"nama":"Tambang A","pin":"1"},{"nama":"Site tambang a","pin":"2"}]' }), /SITE_CUSTOM/);
});
