// Normalisasi, kemiripan nama, ikon, format angka.
export const uid = () => Math.random().toString(36).slice(2, 10);
export const clean = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
// Capitalize Each Word. Singkatan 1-3 huruf yang sudah huruf besar (BBQ, KFC) dipertahankan,
// kecuali seluruh teks diketik huruf besar semua (mis. "NASI PUTIH" -> "Nasi Putih").
export function toTitle(s: string) {
  const t = clean(s);
  const words = t.split(" ");
  const allUp = t === t.toUpperCase() && t !== t.toLowerCase() && words.length > 1;
  return words
    .map((w) => {
      const letters = w.replace(/[^\p{L}]/gu, "");
      if (!allUp && letters.length > 0 && letters.length <= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) return w;
      return w.toLowerCase().replace(/\p{L}/u, (c) => c.toUpperCase());
    })
    .join(" ");
}
export const norm = (s: string) =>
  s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}& ]+/gu, " ").replace(/\s+/g, " ").trim();

function lev(a: string, b: string) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
export function sim(a: string, b: string) {
  if (a === b) return 1;
  const m = Math.max(a.length, b.length);
  if (!m) return 1;
  const s1 = 1 - lev(a, b) / m;
  const sa = a.split(" ").sort().join(" "), sb = b.split(" ").sort().join(" ");
  return Math.max(s1, 1 - lev(sa, sb) / m);
}
export const SIM = 0.8;
export function similar<T extends { key: string }>(q: string, list: T[]): T[] {
  const n = norm(q);
  if (n.length < 4) return [];
  return list
    .filter((f) => f.key !== n)
    .map((f) => ({ f, s: sim(n, f.key) }))
    .filter((x) => x.s >= SIM)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.f);
}

export const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
export function num(s: string | number | null | undefined): number | null {
  if (s === null || s === undefined || s === "") return null;
  const v = typeof s === "number" ? s : parseFloat(String(s).replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

// Ikon otomatis dari kata kunci. Awalan "*" = jenis hidangan/olahan (didahulukan), tanpa awalan = bahan.
// Dalam tingkat yang sama, kata kunci yang lebih panjang (lebih spesifik) dicocokkan lebih dulu.
const GROUPS: [string, string][] = [
  ["*nasi goreng|nasi uduk|nasi kuning|nasi liwet|nasi tim|nasi campur|nasi padang|nasi kebuli|nasi biryani", "🍛"],
  ["*nasi", "🍚"],
  ["*lontong|ketupat|lemper|onigiri|arem arem", "🍙"],
  ["*bubur|oatmeal|porridge|havermut", "🥣"],
  ["*mie|mi|bihun|kwetiau|soun|ramen|udon|laksa|bakmi", "🍜"],
  ["*spaghetti|spageti|pasta|makaroni|macaroni|fettuccine", "🍝"],
  ["*soto|sop|sup|rawon|bakso|gulai|kari|opor|tongseng|konro|pindang|lodeh|semur|tekwan|coto|brongkos|asem asem", "🍲"],
  ["*sate|satay|tusuk|cilok|seblak", "🍢"],
  ["*siomay|dimsum|pangsit|gyoza|momo|pastel|batagor", "🥟"],
  ["*bakwan|gorengan|tempura|perkedel|risol|risoles|combro|misro|cireng|bala bala|kroket|lumpia", "🍤"],
  ["*pempek|empek|otak otak|kerupuk|krupuk|keripik|kripik|emping|rempeyek|peyek", "🍥"],
  ["*gado gado|gado|salad|urap|karedok|ketoprak|asinan|pecel sayur", "🥗"],
  ["*kentang goreng|french fries", "🍟"],
  ["*pisang goreng", "🍌"],
  ["*roti|toast|bagel|sandwich|sandwic|bun", "🍞"],
  ["*croissant", "🥐"], ["*burger|hamburger", "🍔"], ["*pizza", "🍕"], ["*hotdog|sosis", "🌭"], ["*pancake|panekuk|waffle|wafel|crepe", "🥞"],
  ["*es krim|ice cream|gelato", "🍨"],
  ["*es serut|es campur|es buah|es cendol|es teler|es doger|cendol|dawet", "🍧"],
  ["*puding|pudding|flan|agar|jelly|jeli|vla", "🍮"],
  ["*donat|donut", "🍩"],
  ["*cookies|biskuit|kukis|nastar|kue kering|wafer", "🍪"],
  ["*bolu|cake|kue|tart|brownies|muffin|cupcake|lapis|klepon|onde|nagasari|bika ambon|serabi|apem", "🍰"],
  ["*kopi|coffee|cappuccino|latte|espresso", "☕"],
  ["*teh|tea|wedang|jahe|sereh", "🍵"],
  ["*susu|yogurt|yoghurt|milk|kefir", "🥛"],
  ["*jus|juice|smoothie", "🧃"],
  ["*boba|bubble tea|thai tea", "🧋"],
  ["*es teh|es jeruk|es|soda|minuman|squash|limun", "🥤"],
  ["*air mineral|air putih|air", "💧"],
  ["*coklat|cokelat|chocolate", "🍫"],
  ["rendang|empal|dendeng|daging|sapi|steak|iga|babat|paru|usus|bistik|rolade|abon", "🥩"],
  ["kambing|bbq|barbeque|barbecue|panggang", "🍖"],
  ["ayam|bebek|burung|nugget|geprek|kremes", "🍗"],
  ["tahu|keju|cheese", "🧀"],
  ["tempe|oncom|kacang hijau|kacang merah|kedelai|kacang kedelai", "🫘"],
  ["kacang", "🥜"],
  ["salmon|sushi|sashimi|tuna", "🍣"],
  ["ikan|lele|nila|gurame|gurami|patin|bandeng|tongkol|cakalang|kakap|bawal|mujair|teri|pepes|dabu", "🐟"],
  ["udang|rebon", "🦐"], ["cumi|sotong", "🦑"], ["kepiting|rajungan", "🦀"], ["kerang|tiram", "🦪"],
  ["telur rebus|telur puyuh|telur asin", "🥚"],
  ["telur|omelet|dadar|ceplok|orak arik|scramble", "🍳"],
  ["sambal|cabai|cabe|lombok|rica|pedas", "🌶️"],
  ["sayur|sayuran|bayam|kangkung|sawi|caisim|pakcoy|selada|lalap|lalapan|capcay|cap cay|tumis|kol|kubis|daun|genjer|kemangi", "🥬"],
  ["brokoli", "🥦"], ["wortel", "🥕"], ["jagung", "🌽"], ["tomat", "🍅"], ["timun|mentimun|ketimun", "🥒"], ["terong", "🍆"],
  ["kentang", "🥔"], ["singkong|ubi|talas|gembili|tape|getuk|timus", "🍠"], ["labu|waluh", "🎃"],
  ["tauge|kecambah|toge", "🌱"], ["bawang", "🧅"], ["jamur", "🍄"],
  ["gula", "🍬"], ["selai|madu", "🍯"], ["mentega|margarin|butter", "🧈"],
  ["jeruk nipis|lemon", "🍋"], ["jeruk", "🍊"], ["pisang", "🍌"], ["apel", "🍎"], ["semangka", "🍉"], ["pepaya|melon|blewah|honeydew", "🍈"],
  ["anggur", "🍇"], ["mangga", "🥭"], ["nanas", "🍍"], ["stroberi|strawberry", "🍓"], ["alpukat|avokad|avocado", "🥑"],
  ["kelapa|degan", "🥥"], ["pir", "🍐"], ["kiwi", "🥝"], ["persik", "🍑"], ["ceri|cherry", "🍒"], ["buah|rujak|fruit", "🍎"],
];
const ICON_KEYS: [string[], string, number][] = GROUPS.flatMap(([ks, e]) => {
  const tier = ks.startsWith("*") ? 1 : 2;
  return ks.replace("*", "").split("|").map((k) => [k.split(" "), e, tier] as [string[], string, number]);
}).sort((a, b) => a[2] - b[2] || b[0].join(" ").length - a[0].join(" ").length);
export function icon(name: string) {
  const t = name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!t.length) return "";
  const joined = " " + t.join(" ") + " ";
  for (const [k, e] of ICON_KEYS) {
    if (k.length > 1) { if (joined.includes(" " + k.join(" ") + " ")) return e; continue; }
    const w = k[0];
    if (t.some((x) => x === w || (w.length >= 4 && x.startsWith(w)))) return e;
  }
  return "🍽️";
}
export const ICON_CHOICES = "🍚🍛🍜🍝🍲🥘🍳🥚🍗🍖🥩🥓🍤🦐🦑🐟🍣🍢🥟🍡🍙🍘🍥🥗🥬🥦🥕🌽🍅🥒🍆🥔🍠🧅🍄🌶️🫘🥜🍞🥖🥐🥞🧇🧀🧈🍯🍕🍔🌭🌮🌯🥪🍟🥛☕🍵🧃🥤🧋💧🍎🍌🍉🍊🍋🍇🍓🍍🥭🍈🥥🥑🍰🍮🍩🍪🍫🍨🍧🍬🍽️".match(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu) || [];

// Waktu makan menurut jam: Breakfast 03-08, Lunch 09-13, Dinner 14-17, Supper 18-23 (00-02 dianggap Supper).
export function mealByHour(h: number) {
  if (h >= 3 && h <= 8) return "Breakfast";
  if (h >= 9 && h <= 13) return "Lunch";
  if (h >= 14 && h <= 17) return "Dinner";
  return "Supper";
}
export const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum’at", "Sabtu"];
export const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const pad = (n: number) => String(n).padStart(2, "0");
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function dateParts(v: string) {
  const [y, m, d] = (v || todayStr()).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return { hari: HARI[dt.getDay()], d, m: BULAN[m - 1], y };
}
