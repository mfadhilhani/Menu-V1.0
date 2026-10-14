// Penggambar poster, kartu kode warna, dan kolase (semua di canvas, sisi klien).
import { fmt } from "./text";

export type Bmp = ImageBitmap | HTMLImageElement;
export type Meal = "Breakfast" | "Dinner";
export type SlotView = { name: string; desc: string; kkal: number | null; img: Bmp | null };

const srcCache = new Map<string, Promise<HTMLImageElement>>();
export function loadSrc(src: string) {
  let p = srcCache.get(src);
  if (!p) {
    p = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(src)); i.src = src; });
    srcCache.set(src, p);
  }
  return p;
}
export async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('700 56px Gaegu', "Nama"),
      document.fonts.load('700 24px "Playfair Display SC"', "NAMA"),
      document.fonts.load('400 22px "Hanken Grotesk"', "Deskripsi"),
    ]);
  } catch { /* pakai font cadangan */ }
}

type Ctx = CanvasRenderingContext2D;
const ctx2d = (c: HTMLCanvasElement) => c.getContext("2d") as Ctx;
function wrap(X: Ctx, t: string, mw: number) {
  const L: string[] = [];
  let c = "";
  t.split(" ").forEach((w) => {
    const n = c ? c + " " + w : w;
    if (X.measureText(n).width > mw && c) { L.push(c); c = w; } else c = n;
  });
  if (c) L.push(c);
  return L;
}
function rrect(X: Ctx, x: number, y: number, w: number, h: number, r: number) {
  X.beginPath(); X.moveTo(x + r, y);
  X.arcTo(x + w, y, x + w, y + h, r); X.arcTo(x + w, y + h, x, y + h, r); X.arcTo(x, y + h, x, y, r); X.arcTo(x, y, x + w, y, r);
  X.closePath();
}
const wOf = (b: Bmp) => ("naturalWidth" in b ? b.naturalWidth : b.width);
const hOf = (b: Bmp) => ("naturalHeight" in b ? b.naturalHeight : b.height);
export const blobOf = (c: HTMLCanvasElement, type = "image/png", q?: number) => new Promise<Blob>((r) => c.toBlob((b) => r(b as Blob), type, q));

// ---------- poster ----------
const SL4 = [{ cx: 992, cy: 650.5, tx: 999, ty: 891.5 }, { cx: 415, cy: 935, tx: 425.5, ty: 1166.5 }, { cx: 1082.5, cy: 1309, tx: 1035, ty: 1553.5 }, { cx: 425.5, cy: 1499, tx: 429.5, ty: 1762.5 }];
const SL6 = [
  { x: 193, y: 637, w: 323, h: 457, nx: 353.5, ny: 466.5, dx: 353.5, dy: 533 },
  { x: 549, y: 493, w: 322, h: 456, nx: 705.5, ny: 1089.5, dx: 706.5, dy: 982 },
  { x: 914, y: 629, w: 322, h: 457, nx: 1061.5, ny: 466.5, dx: 1069.5, dy: 527 },
  { x: 190, y: 1371, w: 322, h: 456, nx: 361, ny: 1191.5, dx: 352, dy: 1241 },
  { x: 549, y: 1191, w: 322, h: 457, nx: 714, ny: 1818.5, dx: 710.5, dy: 1682 },
  { x: 902, y: 1374, w: 322, h: 457, nx: 1068, ny: 1187.5, dx: 1067.5, dy: 1254 },
];
export const SLOT_COUNT: Record<Meal, number> = { Breakfast: SL4.length, Dinner: SL6.length };
const PFONT = '"Gaegu", "Comic Sans MS", "Chalkboard SE", cursive';
const TF = '"Playfair Display SC", Georgia, "Times New Roman", serif';
const DF = '"Hanken Grotesk", Arial, sans-serif';
const IND = "#3A3AA0";

export async function drawPoster(cv: HTMLCanvasElement, meal: Meal, slots: SlotView[]) {
  const [bg] = await Promise.all([loadSrc(meal === "Breakfast" ? "/assets/poster-breakfast.png" : "/assets/poster-dinner.jpg"), loadFonts()]);
  cv.width = bg.naturalWidth; cv.height = bg.naturalHeight;
  const X = ctx2d(cv);
  X.drawImage(bg, 0, 0); X.imageSmoothingQuality = "high";
  if (meal === "Breakfast") {
    SL4.forEach((s, i) => {
      const p = slots[i]; if (!p) return;
      if (p.img) {
        const d = 384, k = Math.max(d / wOf(p.img), d / hOf(p.img)), w = wOf(p.img) * k, h = hOf(p.img) * k;
        X.save(); X.beginPath(); X.arc(s.cx, s.cy, 192, 0, Math.PI * 2); X.clip();
        X.drawImage(p.img, s.cx - w / 2, s.cy - h / 2, w, h); X.restore();
      }
      const nm = p.name.trim();
      if (nm) {
        let fs = 58; X.font = `700 ${fs}px ${PFONT}`;
        while (X.measureText(nm).width > 480 && fs > 28) { fs -= 2; X.font = `700 ${fs}px ${PFONT}`; }
        X.fillStyle = "#000"; X.textAlign = "center"; X.textBaseline = "middle"; X.fillText(nm, s.tx, s.ty);
      }
    });
  } else {
    SL6.forEach((s, i) => {
      const p = slots[i]; if (!p) return;
      if (p.img) {
        const k = Math.max(s.w / wOf(p.img), s.h / hOf(p.img)), w = wOf(p.img) * k, h = hOf(p.img) * k;
        X.save(); X.beginPath(); X.rect(s.x - 3, s.y - 3, s.w + 6, s.h + 6); X.clip();
        X.drawImage(p.img, s.x + s.w / 2 - w / 2, s.y + s.h / 2 - h / 2, w, h); X.restore();
      }
      X.fillStyle = IND; X.textAlign = "center"; X.textBaseline = "middle";
      const nm = p.name.trim().toUpperCase();
      if (nm) {
        let fs = 25; X.font = `700 ${fs}px ${TF}`;
        while (X.measureText(nm).width > 290 && fs > 14) { fs--; X.font = `700 ${fs}px ${TF}`; }
        X.fillText(nm, s.nx, s.ny);
      }
      const ds = p.desc.trim();
      if (ds) {
        let fs = 22, L: string[];
        for (;;) { X.font = `400 ${fs}px ${DF}`; L = wrap(X, ds, 290); if (L.length <= 3 || fs <= 14) break; fs -= 2; }
        const lh = Math.round(fs * 1.1);
        L.slice(0, 3).forEach((t, k) => X.fillText(t, s.dx, s.dy + k * lh));
      }
    });
  }
}

// ---------- kartu kode warna ----------
export const level = (k: number) => (k < 100 ? "g" : k < 200 ? "y" : "r") as "g" | "y" | "r";
const COL = { g: "#00AF50", y: "#FFFF00", r: "#EE0000" };
const LBL = { g: "Makan lebih Banyak", y: "Makanlah Secukupnya", r: "Makanlah Sedikit" };
const AF = 'Arial, "Helvetica Neue", "Liberation Sans", sans-serif';
export async function colorCard(name: string, kk: number) {
  const [logo, face] = await Promise.all([loadSrc("/assets/logo.jpg"), loadSrc(`/assets/face-${level(kk)}.png`)]);
  const W = 552, H = 940, c = document.createElement("canvas"); c.width = W; c.height = H;
  const X = ctx2d(c), l = level(kk);
  X.fillStyle = COL[l]; rrect(X, 0, 0, W, H, 110); X.fill();
  X.imageSmoothingQuality = "high";
  X.drawImage(logo, (W - 124) / 2, 14, 124, 61);
  X.drawImage(face, (W - 240) / 2, 96, 240, 368);
  X.fillStyle = "#fff"; X.fillRect(8, 486, W - 16, 122);
  X.fillStyle = "#000"; X.textAlign = "center"; X.textBaseline = "middle";
  X.font = `bold 42px ${AF}`;
  const lb = wrap(X, LBL[l], W - 40);
  lb.forEach((t, i) => X.fillText(t, W / 2, 547 + (i - (lb.length - 1) / 2) * 50));
  X.fillStyle = "#fff"; X.fillRect(40, 634, W - 80, 258);
  X.fillStyle = "#000";
  X.font = `bold 42px ${AF}`; X.fillText("Nama Menu", W / 2, 676);
  X.font = `bold 40px ${AF}`;
  const nl = wrap(X, name, W - 120).slice(0, 3);
  nl.forEach((t, i) => X.fillText(t, W / 2, 740 + i * 46));
  X.fillText("100G/ " + fmt(kk) + " kkal", W / 2, 740 + nl.length * 46 + 4);
  return c;
}
export function gridSheet(cards: HTMLCanvasElement[], perRow: number, gap: number) {
  const per = Math.min(perRow, cards.length), rows = Math.ceil(cards.length / per);
  const w = cards[0].width, h = cards[0].height;
  const s = document.createElement("canvas"); s.width = gap + per * (w + gap); s.height = gap + rows * (h + gap);
  const X = ctx2d(s); X.fillStyle = "#fff"; X.fillRect(0, 0, s.width, s.height);
  cards.forEach((c, i) => X.drawImage(c, gap + (i % per) * (w + gap), gap + Math.floor(i / per) * (h + gap)));
  return s;
}

// ---------- kartu landscape + kolase ----------
const CB = { cx: 514, cy: 733.5, r: 367.5, dx: 905.5, dy: 588, dr: 153.5, bx: 162, by: 1011, bw: 719, bh: 151, rx: 1173, ry: 447, rw: 359, rh: 640 };
export async function landscapeCard(p: SlotView) {
  const bg = await loadSrc("/assets/kartu-landscape.jpg");
  const sc = 1200 / 1748, c = document.createElement("canvas"); c.width = 1200; c.height = Math.round(1240 * sc);
  const X = ctx2d(c); X.scale(sc, sc); X.imageSmoothingQuality = "high";
  X.drawImage(bg, 0, 0, 1748, 1240);
  if (p.img) {
    const d = CB.r * 2, k = Math.max(d / wOf(p.img), d / hOf(p.img)), w = wOf(p.img) * k, h = hOf(p.img) * k;
    X.save(); X.beginPath(); X.arc(CB.cx, CB.cy, CB.r + 1.5, 0, Math.PI * 2); X.clip();
    X.drawImage(p.img, CB.cx - w / 2, CB.cy - h / 2, w, h); X.restore();
  }
  X.fillStyle = "#CEDEEB"; X.fillRect(CB.rx - 3, CB.ry - 3, CB.rw + 6, CB.rh + 6);
  if (p.kkal != null) X.drawImage(await colorCard(p.name.trim() || "Nama menu", p.kkal), CB.rx, CB.ry, CB.rw, CB.rh);
  X.fillStyle = "#40421A";
  X.beginPath(); X.arc(CB.dx, CB.dy, CB.dr + 1.5, 0, Math.PI * 2); X.fill();
  rrect(X, CB.bx - 1, CB.by - 1, CB.bw + 2, CB.bh + 2, 14); X.fill();
  X.fillStyle = "#fff"; X.textAlign = "center"; X.textBaseline = "middle";
  const kv = p.kkal != null ? fmt(p.kkal) : "-";
  let fs = 88; X.font = `bold ${fs}px ${AF}`;
  while (X.measureText(kv).width > 230 && fs > 40) { fs -= 4; X.font = `bold ${fs}px ${AF}`; }
  X.fillText(kv, CB.dx, CB.dy - 24);
  X.font = `bold 48px ${AF}`; X.fillText("kkal", CB.dx, CB.dy + 56);
  const nm = p.name.trim().toUpperCase();
  if (nm) {
    fs = 80; X.font = `bold ${fs}px ${AF}`;
    while (X.measureText(nm).width > 650 && fs > 34) { fs -= 2; X.font = `bold ${fs}px ${AF}`; }
    X.fillText(nm, CB.bx + CB.bw / 2, CB.by + CB.bh / 2 + 4);
  }
  return c;
}
// Kolase kode warna: dua kartu ke samping, sisanya ke bawah. Mengembalikan false kalau tidak ada isi.
export async function drawKolase(cv: HTMLCanvasElement, items: SlotView[]) {
  const act = items.filter((p) => p.name.trim() || p.img);
  if (!act.length) return false;
  const cards: HTMLCanvasElement[] = [];
  for (const p of act) cards.push(await landscapeCard(p));
  const s = gridSheet(cards, 2, 24);
  cv.width = s.width; cv.height = s.height; ctx2d(cv).drawImage(s, 0, 0);
  return true;
}

// ---------- kolase foto ----------
// Kolase Test Food (grid rapat, 1080 px).
export function drawTfCollage(cv: HTMLCanvasElement, imgs: Bmp[]) {
  const n = imgs.length;
  if (!n) return false;
  const cols = n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 4, rows = Math.ceil(n / cols), W = 1080, g = 4;
  const cw = (W - g * (cols - 1)) / cols;
  const h = n <= 3 ? 470 : cols === 2 ? Math.round(cw * 0.75) : Math.round((cw * 4) / 3);
  cv.width = W; cv.height = rows * h + (rows - 1) * g;
  const c = ctx2d(cv); c.fillStyle = "#111"; c.fillRect(0, 0, cv.width, cv.height);
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const cnt = Math.min(cols, n - k), w = (W - g * (cnt - 1)) / cnt;
    for (let j = 0; j < cnt; j++, k++) {
      const im = imgs[k], iw = wOf(im), ih = hOf(im), x = j * (w + g), y = r * (h + g);
      const s = Math.max(w / iw, h / ih), sw = w / s, sh = h / s;
      c.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
    }
  }
  return true;
}
// Kolase satu baris (laporan kalori): tinggi sama, lebar menyesuaikan.
export function drawRowCollage(cv: HTMLCanvasElement, imgs: Bmp[]) {
  if (!imgs.length) return false;
  let H = 900;
  const raw = imgs.reduce((s, b) => s + (wOf(b) * H) / hOf(b), 0);
  if (raw > 2400) H = Math.floor((H * 2400) / raw);
  const ws = imgs.map((b) => Math.round((wOf(b) * H) / hOf(b)));
  cv.width = ws.reduce((a, b) => a + b, 0); cv.height = H;
  const X = ctx2d(cv); let off = 0;
  imgs.forEach((b, i) => { X.drawImage(b, off, 0, ws[i], H); off += ws[i]; });
  return true;
}
