// Normalisasi, kemiripan nama, ikon, format angka.
export const uid = () => Math.random().toString(36).slice(2, 10);
export const clean = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
// Kata bergaya merek: huruf pertama besar, ada huruf besar lain di tengah, dan ada huruf kecil (McFlurry, KitKat, PopMie).
const brandCase = (letters: string) => /^\p{Lu}/u.test(letters) && /\p{Lu}/u.test(letters.slice(1)) && /\p{Ll}/u.test(letters);
// Capitalize Each Word. Singkatan 1-3 huruf yang sudah huruf besar (BBQ, KFC) dan penulisan merek
// seperti McFlurry atau KitKat dipertahankan, kecuali seluruh teks diketik huruf besar semua (mis. "NASI PUTIH" -> "Nasi Putih").
export function toTitle(s: string) {
  const t = clean(s);
  const words = t.split(" ");
  const allUp = t === t.toUpperCase() && t !== t.toLowerCase() && words.length > 1;
  return words
    .map((w) => {
      const letters = w.replace(/[^\p{L}]/gu, "");
      if (!allUp && letters.length > 0 && letters.length <= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) return w;
      if (!allUp && brandCase(letters)) return w;
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

// Jarak edit dengan tukar dua huruf bersebelahan dihitung satu (typo "Ayma" -> "Ayam" = 1).
export function dist(a: string, b: string) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

// Kata yang sudah pasti benar ejaannya: istilah makanan asing yang umum, variasi ejaan Indonesia yang lazim,
// dan merek. Kata yang diketik persis seperti ini tidak pernah diubah oleh koreksi AI
// (mencegah "Tea" -> "Teh", "Soup" -> "Sup", "Special" -> "Spesial", "Spaghetti" -> "Spageti").
export const KNOWN_WORDS = new Set(`
chicken beef lamb mutton pork duck fish dory salmon tuna shrimp prawn squid calamari crab lobster egg eggs tofu tempeh
rice fried grilled roast roasted baked steamed boiled smoked crispy crunchy spicy sweet sour salty hot cold ice iced
special original classic premium signature deluxe mix mixed with and of the in on style
soup salad sauce dressing cheese cheesy milk tea coffee juice cream butter honey garlic onion pepper chili chilli
black white red green yellow brown golden lemon lime orange apple banana strawberry blueberry chocolate choco vanilla
caramel matcha mango coconut corn potato potatoes wedges fries french mashed sandwich burger pizza pasta spaghetti
fettuccine penne bolognese carbonara aglio olio lasagna macaroni noodle noodles ramen udon soba katsu teriyaki yakiniku
yakitori karaage tempura sushi gyoza dimsum dumpling dumplings bulgogi kimchi tteokbokki bibimbap japchae tom yum yam
pad thai curry masala tikka biryani kebab shawarma steak sirloin tenderloin wagyu bbq barbeque barbecue wings wing
nugget nuggets sausage hotdog bacon ham meatball meatballs fillet filet bowl platter set combo dessert pudding puding
cake brownies brownie cookies cookie muffin waffle pancake toast bread bun croissant donut doughnut float latte
cappuccino espresso americano mocha frappe smoothie milkshake shake yogurt yoghurt oat oatmeal cereal granola fruit
fruits vegetable vegetables veggie omelette omelet scrambled sunny side up mentai nori mayo mayonnaise ketchup
gravy cordon bleu schnitzel fish chips hash brown cocktail lemonade soda mojito
nasi ayam sapi ikan telur tahu tempe sayur sayuran goreng bakar rebus kukus tumis kuah pedas manis asam gurih
spesial balado rica rendang soto sop sup bakso mie mi bihun kwetiau sambal sambel cabe cabai kerupuk krupuk buah
kue roti selai susu teh kopi jus es putih merah hijau kuning hitam saus keju bumbu kecap madu bawang daging kambing
bebek udang cumi kepiting kerang jagung kentang wortel kol bayam kangkung gulai opor semur pepes lalapan geprek penyet
indomie sedaap sarimi supermi popmie aqua sosro pocari milo ovaltine oreo chitato qtela kitkat silverqueen nescafe
yakult cimory walls magnum mcflurry kfc mcd richeese fiesta sogood champ kanzler dancow indomilk ultramilk nutrisari
marimas energen sprite fanta pepsi cola coca nestle pucuk frestea mizone kopiko torabika luwak abc
spageti makaroni sosis nuget kroket risol risoles
`.trim().split(/\s+/));

// Ambil hanya perbaikan typo dari usulan nama AI. Aturan per kata:
// - kata yang sama (beda huruf besar kecil saja) memakai penulisan AI, kecuali kamu mengetik gaya merek (McFlurry);
// - kata yang dikenal (KNOWN_WORDS + kata yang sudah ada di Sheet) tidak diubah;
// - kata lain hanya boleh beda sedikit huruf (1 huruf untuk kata pendek, 2-3 untuk kata panjang);
// - jumlah dan urutan kata tidak boleh berubah, kecuali hanya memisah/menggabung spasi ("Ayamgoreng" -> "Ayam Goreng").
// Kata yang ditolak tetap ditulis seperti yang kamu ketik, jadi terjemahan ("Chicken" -> "Ayam") tidak pernah lolos.
export function typoOnly(typed: string, ai: string, known: Set<string> = new Set()) {
  const t = clean(typed), a = clean(ai);
  if (!a) return { nama: t, rejected: [] as string[] };
  const tw = t.split(" "), aw = a.split(" ");
  const isKnown = (w: string) => KNOWN_WORDS.has(w) || known.has(w);
  const limit = (len: number) => (len <= 6 ? 1 : len <= 9 ? 2 : 3);
  if (tw.length !== aw.length) {
    const x = norm(t).replace(/ /g, ""), y = norm(a).replace(/ /g, "");
    const ok = Math.abs(tw.length - aw.length) === 1 && dist(x, y) <= 1;
    return ok ? { nama: a, rejected: [] } : { nama: t, rejected: [a] };
  }
  const rejected: string[] = [];
  const out = tw.map((w, i) => {
    const v = aw[i], x = norm(w), y = norm(v);
    if (x === y) return brandCase(w.replace(/[^\p{L}]/gu, "")) ? w : v;
    if (!x || !y || isKnown(x) || /\d/.test(x + y) || dist(x, y) > limit(x.length)) { rejected.push(`${w} -> ${v}`); return w; }
    return v;
  });
  return { nama: out.join(" "), rejected };
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
