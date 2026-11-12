// Ikon makanan otomatis dari nama, dan daftar ikon untuk dipilih sendiri.
//
// Cara memilih (lihat icon() di bawah):
// 1. DISH  = jenis hidangan (nasi, mie, soto, sate, kue, jus, soup, cake ...). Menang di posisi mana pun,
//            karena "Chicken Soup" tetap sup dan "Mie Ayam" tetap mie. Kalau ada beberapa, yang paling depan dipakai.
// 2. BAHAN = bahan utama (ayam, ikan, telur, sayur, buah tertentu ...). Yang paling depan di nama yang dipakai,
//            karena nama makanan Indonesia menaruh bahan utama di depan: "Ayam Bakar Sambal Matah" = ayam, bukan sambal.
// 3. LEMAH = bumbu, cara masak, dan kata umum (sambal, balado, tumis, buah). Hanya dipakai kalau tidak ada yang lain,
//            jadi "Terong Balado" = terong dan "Buah Semangka" = semangka.
// Di tingkat dan posisi yang sama, kata kunci yang lebih panjang (lebih spesifik) menang: "telur asin" mengalahkan "telur".

type Entry = [string, string];

const DISH: Entry[] = [
  ["nasi goreng|nasi uduk|nasi kuning|nasi liwet|nasi campur|nasi padang|nasi kebuli|nasi biryani|nasi briyani|nasi pecel|nasi rames|nasi rawon|nasi gandul|nasi bakar|nasi mandhi|nasi minyak|nasi lemak|fried rice|kari|kare|curry|biryani|briyani", "🍛"],
  ["nasi kotak|nasi box|bento|rice box", "🍱"],
  ["nasi|rice bowl|nasi tim", "🍚"],
  ["lontong|ketupat|lemper|onigiri|arem arem|buras|burasa|lepet|ketan", "🍙"],
  ["bubur|oatmeal|porridge|havermut|sereal|cereal|kolak|sumsum|candil|biji salak|granola", "🥣"],
  ["mie|mi|bihun|kwetiau|kwetiaw|soun|ramen|udon|laksa|bakmi|noodle|noodles|misoa|lomie|ifumie|pangsit kuah", "🍜"],
  ["spaghetti|spageti|pasta|makaroni|macaroni|fettuccine|penne|lasagna|carbonara|bolognese|aglio olio", "🍝"],
  ["soto|sop|sup|soup|rawon|bakso|baso|gulai|opor|tongseng|konro|pindang|lodeh|semur|tekwan|coto|brongkos|asem asem|garang asem|sayur sop|sayur asem|sayur asam|sayur lodeh|sayur bening|sayur bayam|sayur nangka|gudeg|tom yum|sukiyaki|shabu|steamboat|kuah", "🍲"],
  ["sate|satay|sempol|cilok|seblak|yakitori|oden", "🍢"],
  ["siomay|siomai|dimsum|dim sum|pangsit|gyoza|momo|pastel|batagor|bakpao|bakpau|dumpling|dumplings|hakau", "🥟"],
  ["klepon|onde onde|onde|mochi|moci|dango|cenil|kue ku|bola ubi", "🍡"],
  ["bakwan|gorengan|tempura|combro|misro|cireng|bala bala|kroket|ote ote|pia pia|udang goreng tepung|ebi furai", "🍤"],
  ["perkedel jagung|bakwan jagung|dadar jagung|jagung rebus|jagung bakar|jagung manis", "🌽"],
  ["perkedel|kentang rebus|mashed potato|kentang tumbuk", "🥔"],
  ["lumpia|risol|risoles|kebab|burrito|wrap|shawarma", "🌯"],
  ["taco", "🌮"],
  ["pempek|empek|otak otak|narutomaki|fish cake", "🍥"],
  ["kerupuk|krupuk|keripik|kripik|emping|rempeyek|peyek|rengginang|opak|amplang|chips|crackers|kemplang", "🍘"],
  ["gado gado|gado|salad|urap|karedok|ketoprak|asinan|pecel|lotek|rujak|trancam|coleslaw", "🥗"],
  ["kentang goreng|french fries|fries|wedges", "🍟"],
  ["pisang goreng|pisang molen|pisang bakar|pisang rebus|pisang kukus|pisang coklat|nagasari|sale pisang", "🍌"],
  ["sandwich|sandwic|roti lapis|roti isi", "🥪"],
  ["roti canai|roti maryam|roti cane|martabak telur|naan|tortilla|chapati", "🫓"],
  ["roti|toast|bun|bread|roti tawar|roti bakar", "🍞"],
  ["croissant", "🥐"], ["baguette|cakwe|cakue|roti panjang", "🥖"], ["bagel", "🥯"], ["pretzel", "🥨"],
  ["burger|hamburger", "🍔"], ["pizza", "🍕"], ["hotdog|hot dog", "🌭"],
  ["pancake|panekuk|crepe|serabi|surabi|martabak manis|terang bulan|dadar gulung|apem|kue apem|pukis|kue cubit", "🥞"],
  ["waffle|wafel", "🧇"],
  ["es krim|ice cream|gelato|sundae", "🍨"],
  ["es serut|es campur|es buah|es cendol|es teler|es doger|es kacang|cendol|dawet|sop buah|es pisang ijo", "🍧"],
  ["puding|pudding|flan|agar|agar agar|jelly|jeli|vla|panna cotta|custard|silky", "🍮"],
  ["donat|donut|doughnut", "🍩"],
  ["cookies|cookie|biskuit|biscuit|kukis|nastar|kue kering|wafer|kastengel", "🍪"],
  ["cupcake|muffin|bolu kukus|kue mangkok|kue lumpur", "🧁"],
  ["pie|pai|tart|tartlet|quiche", "🥧"],
  ["bakpia|kue bulan|mooncake|kue pia|pia", "🥮"],
  ["bolu|cake|kue|brownies|brownie|lapis|lapis legit|bika ambon|cheesecake|tiramisu|chiffon|roll cake|bolen|snack", "🍰"],
  ["permen|lolipop|lollipop|candy", "🍭"],
  ["popcorn|berondong", "🍿"],
  ["gula kopi teh|kopi teh|kopi|coffee|cappuccino|latte|espresso|americano|mocha", "☕"],
  ["teh|tea|wedang|jamu|bandrek|bajigur|sekoteng|ronde|matcha", "🍵"],
  ["susu|yogurt|yoghurt|milk|kefir|susu kedelai", "🥛"],
  ["jus|juice|smoothie|sari buah", "🧃"],
  ["boba|bubble tea|thai tea|milk tea|es kopi susu", "🧋"],
  ["mocktail|sirup|syrup|squash|punch|lemonade|limun|es kuwut|es timun", "🍹"],
  ["es teh|es jeruk|es|soda|minuman|ice|iced|soft drink|cola", "🥤"],
  ["es batu", "🧊"],
  ["air mineral|air putih|air|infused water", "💧"],
  ["coklat|cokelat|chocolate|choco", "🍫"],
  ["sushi|sashimi|nigiri|maki", "🍣"],
  ["steak|bistik|sirloin|tenderloin", "🥩"],
  ["omelet|omelette|telur dadar|telur ceplok|telur mata sapi|orak arik|scramble|scrambled|fuyunghai|fu yung hai|telur orak arik", "🍳"],
  ["fried chicken|ayam goreng tepung|ayam krispi|ayam crispy|chicken wings|sayap ayam|paha ayam", "🍗"],
  ["capcay|cap cay|cah|tumis sayur|sayur tumis|oseng sayur|plecing", "🥬"],
  ["sarden|kornet|corned|makanan kaleng", "🥫"],
];

const BAHAN: Entry[] = [
  ["rendang|empal|dendeng|daging|sapi|beef|babat|paru|usus|rolade|abon|bulgogi|yakiniku|teriyaki|hati|ati|limpa|lidah", "🥩"],
  ["kambing|domba|lamb|mutton|iga|ribs|bbq|barbeque|barbecue|panggang|tulang|buntut|kikil", "🍖"],
  ["ayam|chicken|bebek|duck|burung|puyuh|nugget|nuggets|nuget|geprek|kremes|karaage|katsu|entok|kalkun", "🍗"],
  ["bacon|ham|smoked beef", "🥓"],
  ["sosis|sausage", "🌭"],
  ["tahu|tofu|mentega|margarin|butter", "🧈"],
  ["keju|cheese", "🧀"],
  ["tempe|tempeh|oncom|kacang hijau|kacang merah|kedelai|kacang kedelai|kacang tolo|edamame", "🫘"],
  ["kacang panjang|buncis|kacang polong|sayur|sayuran|bayam|kangkung|sawi|caisim|pakcoy|pokcoy|selada|lalap|lalapan|kol|kubis|daun|genjer|kemangi|daun singkong|daun pepaya|pakis|kelor|vegetable|vegetables|veggie|labu siam|jipang", "🥬"],
  ["kacang|peanut|almond|mete|mede", "🥜"],
  ["salmon|tuna", "🍣"],
  ["ikan|fish|lele|nila|gurame|gurami|patin|bandeng|tongkol|cakalang|kakap|bawal|mujair|teri|pepes|dabu|tenggiri|kembung|dori|dory|kerapu|baronang|layang|selar|haruan|gabus|papuyu|saluang|peda|pari|tilapia|sepat|biawan|lais|asin", "🐟"],
  ["udang|rebon|shrimp|prawn|ebi|seafood", "🦐"], ["cumi|sotong|squid|calamari|gurita", "🦑"], ["kepiting|rajungan|crab", "🦀"], ["kerang|tiram|oyster|clam|remis", "🦪"], ["lobster", "🦞"],
  ["telur rebus|telur puyuh|telur asin|telur pindang|telur bacem", "🥚"],
  ["telur|telor|egg|eggs|dadar|ceplok", "🍳"],
  ["brokoli|broccoli|kembang kol|bunga kol", "🥦"], ["wortel|carrot", "🥕"], ["jagung|corn", "🌽"], ["tomat|tomato", "🍅"],
  ["timun|mentimun|ketimun|acar|oyong|gambas|pare|paria|zucchini", "🥒"], ["terong|terung|eggplant", "🍆"],
  ["paprika", "🫑"], ["kentang|potato|potatoes", "🥔"], ["singkong|ubi|talas|gembili|tape|getuk|timus|ketela", "🍠"], ["labu|waluh|pumpkin", "🎃"],
  ["tauge|kecambah|toge|taoge", "🌱"], ["bawang putih|garlic", "🧄"], ["bawang|onion", "🧅"], ["jamur|mushroom", "🍄"],
  ["jeruk nipis|lemon", "🍋"], ["jeruk|orange", "🍊"], ["pisang|banana", "🍌"], ["apel|apple", "🍎"], ["semangka|watermelon", "🍉"],
  ["pepaya|melon|blewah|honeydew|timun suri", "🍈"], ["anggur|grape|grapes", "🍇"], ["mangga|mango", "🥭"], ["nanas|nenas|pineapple", "🍍"],
  ["stroberi|strawberry", "🍓"], ["blueberry|bluberi", "🫐"], ["alpukat|avokad|avocado", "🥑"], ["kelapa|degan|coconut", "🥥"],
  ["pir|pear|jambu", "🍐"], ["kiwi", "🥝"], ["persik|peach", "🍑"], ["ceri|cherry|rambutan|kelengkeng|leci|lychee", "🍒"], ["zaitun|olive", "🫒"],
  ["selai|madu|honey|jam", "🍯"], ["gula|sugar", "🍬"], ["garam|salt", "🧂"], ["kecap|saus|saos|sauce|mayones|mayonnaise|mayo|ketchup", "🥫"],
];

const LEMAH: Entry[] = [
  ["sambal|sambel|cabai|cabe|lombok|rica|pedas|balado|spicy|chili|chilli|dabu dabu|matah", "🌶️"],
  ["tumis|oseng|orek|lalapan", "🥬"],
  ["buah potong|buah iris|buah segar", "🍉"],
  ["buah|fruit|fruits", "🍎"],
  ["goreng|fried|bakar|grilled|kukus|rebus", "🍽️"],
];

type Key = { words: string[]; emoji: string; tier: number };
const KEYS: Key[] = [DISH, BAHAN, LEMAH].flatMap((list, t) =>
  list.flatMap(([ks, emoji]) => ks.split("|").map((k) => ({ words: k.split(" "), emoji, tier: t + 1 }))),
);

// Kata cocok kalau sama persis, atau kata kunci (minimal 4 huruf) + akhiran umum: "sayuran", "telurnya", "nuggets".
// Awalan bebas tidak dipakai lagi: dulu "teri" ikut cocok dengan "teriyaki" dan "tahu" dengan "tahun".
const SUFFIX = ["an", "nya", "s"];
const wordHit = (token: string, w: string) => token === w || (w.length >= 4 && SUFFIX.some((x) => token === w + x));
function posOf(tokens: string[], words: string[]) {
  for (let i = 0; i + words.length <= tokens.length; i++) {
    if (words.every((w, j) => wordHit(tokens[i + j], w))) return i;
  }
  return -1;
}

export function icon(name: string) {
  const t = name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!t.length) return "";
  let best: { k: Key; pos: number } | null = null;
  for (const k of KEYS) {
    const pos = posOf(t, k.words);
    if (pos < 0) continue;
    if (!best) { best = { k, pos }; continue; }
    const b = best.k;
    const better =
      k.tier !== b.tier ? k.tier < b.tier
      : pos !== best.pos ? pos < best.pos
      : k.words.length !== b.words.length ? k.words.length > b.words.length
      : k.words.join(" ").length > b.words.join(" ").length;
    if (better) best = { k, pos };
  }
  return best ? best.k.emoji : "🍽️";
}

const split = (s: string) => s.match(/\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*/gu) || [];
// Ikon untuk dipilih sendiri, dikelompokkan supaya cepat dicari di HP.
export const ICON_GROUPS: [string, string[]][] = [
  ["Nasi, mie, roti", split("🍚🍛🍱🍙🍘🍜🍝🥣🍲🥘🍞🥖🥐🥯🥨🫓🥪🍔🍕🌭🌮🌯🍟")],
  ["Lauk", split("🍗🍖🥩🥓🍳🥚🐟🍣🍤🦐🦑🦀🦞🦪🍢🥟🍥🧈🧀🫘🥜🥫")],
  ["Sayur", split("🥗🥬🥦🥕🌽🍅🥒🍆🫑🥔🍠🧅🧄🍄🌱🎃🌶️")],
  ["Buah", split("🍎🍏🍌🍉🍊🍋🍇🍓🫐🍍🥭🍈🍐🍑🍒🥝🥥🥑")],
  ["Kue dan snack", split("🍰🧁🥧🥮🍮🍩🍪🍫🍬🍭🍡🥞🧇🍿🍨🍧🍯")],
  ["Minuman", split("☕🍵🥛🧃🥤🧋🍹🧊💧")],
  ["Lainnya", split("🍽️🥢🥄🧂⭐")],
];
export const ICON_CHOICES = ICON_GROUPS.flatMap(([, l]) => l);
