// Uji browser site (Playwright + Chromium). Jalankan terhadap server yang sudah hidup, mode coba:
//   MOCK_BACKEND=1 AUTH_SECRET=<32+ karakter> SITE_PINS='{"bcp":"1111","dps":"2222"}' \
//   SITE_CUSTOM='[{"nama":"Site Tambang ABC","pin":"3333"}]' npm run dev
//   BASE_URL=http://localhost:3000 node tests/e2e/site.e2e.mjs
// Butuh paket playwright + Chromium (tidak termasuk dependensi proyek). Tangkapan layar ke E2E_OUT (bawaan: folder sementara).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const B = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT = (process.env.E2E_OUT || require("node:os").tmpdir()) + "/";
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const errs = [];

const browser = await chromium.launch();
const phone = { ...devices["iPhone 13"] };
async function ctx(opts = phone) { return browser.newContext(opts); }
async function page(c) {
  const p = await c.newPage();
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text() + " @ " + (m.location()?.url || "?")); });
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  return p;
}
async function login(p, site, pin, nama) {
  await p.goto(B);
  await p.waitForSelector("#lsite");
  await p.selectOption("#lsite", site);
  if (nama) await p.fill("#lnama", nama);
  await p.fill("#pin", pin);
  await p.click("button[type=submit]");
}
const infoUmum = (p) => p.waitForSelector("h2:has-text('Info umum')", { timeout: 10000 });
async function breakfast(p) {
  const auto = p.locator("label.chk:has-text('Waktu makan otomatis') input");
  if (await auto.isChecked()) await auto.uncheck();
  await p.selectOption("#meal", "Breakfast");
}
const report = (p) => p.inputValue("#pv");
const synced = (p) => p.waitForSelector("[role=status]:has-text('Tersinkron, terakhir diubah')", { timeout: 15000 });
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

try {
  // 1. Layar login: hanya site yang punya PIN + Lainnya
  const cA = await ctx(), a = await page(cA);
  await a.goto(B);
  await a.waitForSelector("#lsite");
  const opts = await a.$$eval("#lsite option", (o) => o.map((x) => x.textContent));
  check("Login menampilkan BCP, DPS, Lainnya (Kintap tanpa PIN disembunyikan)", JSON.stringify(opts) === JSON.stringify(["BCP", "DPS", "Lainnya (site lain)"]), JSON.stringify(opts));
  await a.setViewportSize({ width: 360, height: 740 });
  await a.screenshot({ path: OUT + "login-360.png" });
  check("Login 360 px tanpa geser horizontal", (await overflow(a)) <= 0, `selisih ${await overflow(a)} px`);
  await a.setViewportSize(phone.viewport);

  // 2. HP BCP mengisi menu
  await login(a, "bcp", "1111");
  await infoUmum(a);
  check("Info umum menampilkan site BCP", (await a.textContent(".site-box b")) === "BCP");
  await breakfast(a);
  await a.fill("input[aria-label='Nama makanan 2']", "Tempe Mendoan");
  await a.press("input[aria-label='Nama makanan 2']", "Tab");
  await synced(a);
  const ra = await report(a);
  check("Laporan BCP: judul 'Menu Breakfast Site BCP' dan menu terisi", ra.includes("*Menu Breakfast Site BCP*") && ra.includes("2. Tempe Mendoan: Ok"));

  // 3. Perangkat kedua BCP menerima isian yang sama
  const cA2 = await ctx({ viewport: { width: 1440, height: 900 } }), a2 = await page(cA2);
  await login(a2, "bcp", "1111");
  await infoUmum(a2);
  await a2.waitForFunction(() => (document.querySelector("#pv")?.value || "").includes("Tempe Mendoan"), null, { timeout: 15000 }).catch(() => {});
  check("Laptop BCP melihat isian dari HP BCP (sinkron dalam site)", (await report(a2)).includes("2. Tempe Mendoan: Ok"));

  // 4. DPS: data BCP tidak terlihat, identitas DPS dipakai
  const cB = await ctx(), b = await page(cB);
  await login(b, "dps", "2222");
  await infoUmum(b);
  await breakfast(b);
  await synced(b).catch(() => {});
  const rb = await report(b);
  check("DPS tidak melihat isian BCP", !rb.includes("Tempe Mendoan"));
  check("Laporan DPS memakai 'Site DPS'", rb.includes("*Menu Breakfast Site DPS*"));
  await b.click("button.tb:has-text('Menu & Kalori')");
  await b.waitForSelector("#ksite");
  check("Kode site laporan bawaan DPS = 'DH DPS' (B3)", (await b.inputValue("#ksite")) === "DH DPS", await b.inputValue("#ksite"));
  check("Peringatan template BCP tampil untuk DPS", await b.isVisible(".warn:has-text('DPS')"));
  await b.setViewportSize({ width: 360, height: 740 });
  await b.screenshot({ path: OUT + "dps-kalori-360.png", fullPage: false });
  check("Halaman DPS 360 px tanpa geser horizontal", (await overflow(b)) <= 0, `selisih ${await overflow(b)} px`);
  await b.click("button.tb:has-text('Test Food')");
  await b.evaluate(() => window.scrollTo(0, 0));
  await b.screenshot({ path: OUT + "dps-infoumum-360.png" });
  await b.setViewportSize(phone.viewport);
  check("HP BCP tetap tidak menerima isian DPS", !(await report(a)).includes("DPS*"));

  // 5. Site custom lewat nama
  const cC = await ctx(), c = await page(cC);
  await login(c, "custom", "3333", "tambang abc");
  await infoUmum(c);
  const rc = await report(c);
  check("Site custom: nama 'Site Tambang ABC' tanpa 'Site Site' (B9)", rc.includes(" Site Tambang ABC*") && !rc.includes("Site Site"));
  check("Info umum site custom", (await c.textContent(".site-box b")) === "Site Tambang ABC");

  // 6. PIN salah: pesan jelas, site tidak berubah, PIN dikosongkan
  const cE = await ctx(), e = await page(cE);
  await login(e, "dps", "1111");
  await e.waitForSelector("p.err[role=alert]");
  check("PIN salah: pesan 'PIN salah'", (await e.textContent("p.err")) === "PIN salah");
  check("PIN salah: pilihan site tetap DPS, PIN dikosongkan", (await e.inputValue("#lsite")) === "dps" && (await e.inputValue("#pin")) === "");

  // 7. Dua tab satu browser: tab lama BCP tidak boleh menulis ke DPS setelah tab lain ganti site
  const cX = await ctx(), t1 = await page(cX);
  await login(t1, "bcp", "1111");
  await infoUmum(t1);
  await breakfast(t1);
  await synced(t1).catch(() => {});
  const t2 = await page(cX);
  await t2.goto(B);
  await infoUmum(t2);
  await t2.click("button.lnk:has-text('Ganti site')");
  await t2.waitForSelector("#lsite");
  await t2.selectOption("#lsite", "dps");
  await t2.fill("#pin", "2222");
  await t2.click("button[type=submit]");
  await infoUmum(t2);
  await t1.bringToFront();
  await t1.fill("input[aria-label='Nama makanan 3']", "Isian Tab Lama BCP");
  await t1.waitForFunction(() => document.querySelector(".site-box b")?.textContent === "DPS", null, { timeout: 15000 }).catch(() => {});
  check("Tab lama dimuat ulang mengikuti site DPS (409 site)", (await t1.textContent(".site-box b").catch(() => "")) === "DPS");
  await t2.reload();
  await infoUmum(t2);
  await t2.waitForTimeout(1500);
  check("Isian tab lama BCP tidak masuk ke draf DPS", !(await report(t2)).includes("Isian Tab Lama BCP"));

  // 8. Mulai baru di DPS tidak mengembalikan site ke BCP (B4)
  await b.click("button:has-text('Mulai baru')");
  await b.click("button:has-text('Yakin? Klik lagi')");
  await b.waitForLoadState("load");
  await infoUmum(b);
  check("Mulai baru di DPS: site tetap DPS", (await b.textContent(".site-box b")) === "DPS");
  await b.click("button.tb:has-text('Menu & Kalori')");
  const kb = await b.$("#ksite");
  check("Mulai baru di DPS: kode site laporan tetap 'DH DPS'", !kb || (await kb.inputValue()) === "DH DPS", kb ? await kb.inputValue() : "(waktu makan tanpa laporan kalori)");

  // 9. Draf V1 yang memakai "Lainnya…" + nama ketikan: pengguna diberi tahu, laporan memakai site login
  const cL = await ctx(), l = await page(cL);
  await cL.addInitScript(() => {
    if (!localStorage.getItem("tfm2_draft")) localStorage.setItem("tfm2_draft", JSON.stringify({ v: 1, day: "2099-01-01", at: 1, state: { site: "__x", sxi: "Site Lama", jn: "Reguler" } }));
  });
  await login(l, "bcp", "1111");
  await infoUmum(l);
  check("Draf V1 dengan site ketikan: pemberitahuan tampil", await l.isVisible(".warn:has-text('Site Lama')"));
  check("Draf V1 dengan site ketikan: laporan memakai 'Site BCP'", (await report(l)).includes(" Site BCP*"));
  await l.click(".warn button.lnk:has-text('Tutup')");
  check("Pemberitahuan bisa ditutup", !(await l.isVisible(".warn:has-text('Site Lama')")));
} catch (err) {
  check("Skenario berjalan sampai selesai", false, String(err).slice(0, 300));
} finally {

  // Status yang memang diharapkan skenario: PIN salah (401) dan tab lama setelah ganti site (409).
  const expected = (x) => (x.includes("status of 401") && x.endsWith(B + "/api/auth")) || (x.includes("status of 409") && x.includes(B + "/api/draft"));
  const real = errs.filter((x) => !expected(x));
  check("Tidak ada error console / halaman", real.length === 0, real.slice(0, 5).join(" | "));
  await browser.close();
  const f = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - f}/${results.length} PASS`);
  process.exit(f ? 1 : 0);
}
