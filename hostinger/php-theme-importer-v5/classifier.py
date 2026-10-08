"""Strict news category classifier (importer-v5, shared with recat.py and the AI Haber Editörü).

Order: 1) keyword + source rules (title weight 3, spot/lead weight 1); 2) city/region rule (city categories only keep
items whose TITLE or SPOT names the city or one of its districts); 3) AI chain (evren -> nvidia -> gemini -> openai,
cheapest classify models) only for ambiguous items, when keys are present in env.

Public API:
  tr_lower(s)                      -> Turkish-aware lowercase
  topic_scores(title, spot, lead)  -> {topic: score}
  best_topic(title, spot, lead)    -> (topic|None, score, confident: bool)
  city_of_slug(slug)               -> province key ('ankara', 'izmir', ...) or None
  mentions_city(key, title, spot)  -> bool (case-sensitive word match on city + districts)
  topic_slug_for(topic, site_cats) -> best slug present in site_cats for a canonical topic, or None
  site_topic_ok(site_id, title, spot, lead) -> (bool, rule) for topic-restricted sites (see SITE_RULES)
  decide(cat, site_cats, title, spot, lead, site_id=None, ai=True) -> dict(action=keep|move|hide|ambiguous, to=..., reason=...)
  ai_choose(title, spot, choices)  -> slug or None (LLM chain)
"""
import json, os, re, time, urllib.request

def tr_lower(s):
    return (s or "").replace("İ", "i").replace("I", "ı").lower()

B = r"(?<![a-zçğıöşü0-9])"  # left word boundary for Turkish stems (suffixes allowed)

def _rx(*stems):
    return re.compile(B + "(?:" + "|".join(stems) + ")")

TOPICS = {
    "spor": _rx(r"maç(?!ka)", r"gol(?:ü|le|ler|cü|ünü|unu)?\b", r"süper lig", r"\w*lig(?:i|in|de|inde|e)?\b", r"transfer", r"teknik direktör", r"futbol",
                r"basketbol", r"voleybol", r"hentbol", r"tenis", r"güreş", r"boks", r"atletizm", r"milli takım", r"a milli",
                r"şampiyonlar ligi", r"uefa", r"fifa", r"tff\b", r"galatasaray", r"fenerbahçe", r"beşiktaş", r"trabzonspor",
                r"başakşehir", r"[a-zçğıöşü]+spor\b", r"ankaragücü", r"gençlerbirliği", r"antrenman", r"derbi", r"hakem",
                r"olimpiyat", r"sporcu", r"formula 1", r"motogp", r"ralli", r"maraton", r"nba\b", r"euroleague", r"kupası",
                r"puan durumu", r"deplasman", r"şampiyon(?:a|luk|u)?\b", r"madalya", r"turnuva", r"forvet", r"kaleci", r"stadyum", r"taraftar"),
    "dunya": _rx(r"abd\b", r"amerika", r"rusya", r"ukrayna", r"israil", r"gazze", r"filistin", r"hamas", r"iran\b", r"iran'", r"çin\b", r"çin'",
                 r"almanya", r"fransa", r"ingiltere", r"italya", r"ispanya", r"yunanistan", r"suriye", r"irak\b", r"irak'", r"lübnan", r"mısır",
                 r"suudi", r"katar", r"azerbaycan", r"ermenistan", r"gürcistan", r"japonya", r"hindistan", r"pakistan", r"afganistan",
                 r"venezuela", r"brezilya", r"meksika", r"kanada", r"avustralya", r"trump", r"putin", r"zelenski", r"netanyahu", r"biden",
                 r"macron", r"merz\b", r"starmer", r"beyaz saray", r"kremlin", r"pentagon", r"washington", r"moskova", r"kiev", r"kyiv",
                 r"brüksel", r"avrupa birliği", r"birleşmiş milletler", r"nato\b", r"avrupa komisyonu", r"bm\b", r"bm'", r"ab\b", r"ab'",
                 r"yemen", r"libya", r"sudan", r"tahran", r"pekin", r"londra", r"paris\b", r"berlin", r"tel aviv", r"kuzey kore", r"tayvan"),
    "ekonomi": _rx(r"ekonomi", r"borsa", r"bist", r"dolar", r"euro\b", r"enflasyon", r"faiz", r"merkez bankası", r"tcmb", r"kredi",
                   r"mevduat", r"bddk", r"ihracat", r"ithalat", r"sukuk", r"hisse", r"yatırım", r"piyasa", r"gram altın", r"çeyrek altın",
                   r"ons altın", r"altın fiyat", r"akaryakıt", r"benzin", r"motorin", r"asgari ücret", r"vergi", r"bütçe", r"tüik",
                   r"büyüme", r"ciro", r"halka arz", r"kap\b", r"banka", r"tahvil", r"bono", r"cari açık", r"emekli maaş", r"zam\b",
                   r"zam oranı", r"konut satış", r"kira artış", r"milyar (?:tl|lira|dolar|euro)", r"şirket", r"holding", r"ihale"),
    "teknoloji": _rx(r"yapay zek", r"teknoloji", r"akıllı telefon", r"iphone", r"android", r"samsung", r"apple", r"google", r"microsoft",
                     r"openai", r"chatgpt", r"yazılım", r"siber", r"internet", r"5g\b", r"uydu", r"robot", r"çip\b", r"işlemci",
                     r"bilgisayar", r"sosyal medya", r"instagram", r"whatsapp", r"tiktok", r"bilim insan", r"nasa\b", r"uzay",
                     r"araştırmacılar", r"elektrikli araç", r"tesla", r"atom", r"mikroskop", r"türbin", r"fizik", r"kuantum", r"veri merkezi"),
    "saglik": _rx(r"sağlık", r"hastane", r"doktor", r"hekim", r"hasta", r"mhrs", r"inme\b", r"kene", r"takviye", r"yürüyüş", r"yürüyün", r"tedavi", r"kanser", r"aşı\b", r"aşı(?:la|sı)", r"virüs",
                  r"grip", r"ameliyat", r"diyabet", r"kalp kriz", r"beslenme", r"vitamin", r"obezite", r"ilaç", r"pandemi",
                  r"enfeksiyon", r"organ nakli", r"kolesterol", r"tansiyon", r"uzman uyard", r"diyet", r"melatonin", r"uyku",
                  r"muayene", r"tıp\b", r"tıbbi", r"ebola", r"salgın", r"alzheimer", r"hastası", r"hastalığ", r"beyin", r"antioksidan",
                  r"bağışıklık", r"egzersiz", r"sendrom", r"böbrek", r"karaciğer", r"akciğer", r"gebelik", r"hamile", r"eczane", r"kalp\b",
                  r"kalbi", r"sağlıklı", r"kilo ver", r"protein", r"kahve", r"çay tüketimi", r"lif\b", r"bakteri", r"dsö\b", r"psikoloj", r"depresyon"),
    "egitim": _rx(r"okul", r"öğrenci", r"öğretmen", r"meb\b", r"milli eğitim", r"üniversite", r"yks\b", r"lgs\b", r"sınav", r"ders zili",
                  r"eğitim-öğretim", r"eğitim öğretim", r"karne", r"burs", r"yök\b", r"rektör", r"akademisyen", r"ilk ders", r"anaokul", r"kütüphane"),
    "asayis": _rx(r"gözaltı", r"tutuklan", r"cinayet", r"öldürül", r"kaza", r"yaralandı", r"hayatını kaybett", r"silahlı", r"bıçak",
                  r"yangın", r"şüpheli", r"uyuşturucu", r"kaçakçı", r"dolandırıcı", r"firari", r"hırsız", r"gasp", r"cezaevi",
                  r"yakalandı", r"aranan", r"kavga", r"devrildi", r"çarpıştı", r"ölü\b", r"cansız beden", r"suç örgütü", r"rüşvet"),
    "siyaset": _rx(r"ak parti", r"chp", r"mhp", r"iyi parti", r"dem parti", r"yeniden refah", r"saadet partisi", r"zafer partisi",
                   r"deva partisi", r"gelecek partisi", r"erdoğan", r"özgür özel", r"bahçeli", r"dervişoğlu", r"imamoğlu", r"milletvekili",
                   r"tbmm", r"meclis", r"seçim", r"muhalefet", r"iktidar", r"genel başkan", r"il başkan", r"cumhurbaşkan", r"kabine",
                   r"kanun teklifi", r"anayasa", r"parti\b", r"partisi"),
    "kultur": _rx(r"konser", r"sergi", r"festival", r"tiyatro", r"sinema", r"film\b", r"kitap", r"müze", r"sanat", r"opera", r"bale",
                  r"şiir", r"roman\b", r"türkü", r"halk müziği", r"kültür", r"minyatür", r"arkeolo", r"kazı çalışma", r"tarihi eser"),
    "magazin": _rx(r"dizi", r"\d+\. bölüm", r"fragman", r"oyuncu", r"şarkıcı", r"ünlü", r"sevgili", r"boşan", r"evlen", r"survivor",
                   r"masterchef", r"kimdir", r"izle\b", r"full hd", r"reyting"),
    "cevre": _rx(r"çevre", r"iklim", r"orman", r"ağaç", r"(?<!hakan )fidan", r"doğa\b", r"doğa(?:l|yı|da|nın|ya|sever)", r"ekoloj", r"tarım", r"çiftçi",
                 r"hasat", r"sulama", r"tohum", r"hayvancılık", r"yenilenebilir", r"güneş enerji", r"rüzgar enerji", r"biyoçeşitlilik",
                 r"yaban hayat", r"milli park", r"sulak alan", r"kuraklık", r"baraj", r"geri dönüşüm", r"sıfır atık", r"karbon",
                 r"emisyon", r"sera gaz", r"ağaçlandırma", r"tema vakf", r"arıcı", r"zeytin", r"hububat", r"buğday", r"meyve", r"sebze", r"cop\d",
                 r"güneş santral", r"enerji santral", r"ges\b", r"res\b", r"yaban", r"hayvan", r"kuş\b", r"kuşlar", r"balık", r"nesli",
                 r"endemik", r"göl\b", r"gölü", r"müsilaj", r"kirlilik", r"kirliliği", r"gübre", r"toprak", r"erozyon", r"tarımsal", r"tarla",
                 r"bitki", r"çiçek", r"mantar", r"su samuru", r"ova\b", r"ovası", r"bağ bozumu", r"üzüm", r"fındık", r"pamuk", r"mısır hasad"),
    "savunma": _rx(r"savunma", r"ssb\b", r"aselsan", r"roketsan", r"tusaş", r"baykar", r"havelsan", r"mke\b", r"mke'", r"stm\b", r"fnss",
                   r"otokar", r"füze", r"iha\b", r"siha", r"tiha", r"insansız hava", r"tank\b", r"zırhlı", r"fırkateyn", r"korvet",
                   r"denizaltı", r"hücumbot", r"kaan\b", r"hürjet", r"anka\b", r"akıncı", r"bayraktar", r"kızılelma", r"msb\b", r"msb'",
                   r"milli savunma", r"genelkurmay", r"tsk\b", r"tsk'", r"silahlı kuvvetler", r"kara kuvvetleri", r"deniz kuvvetleri",
                   r"hava kuvvetleri", r"mühimmat", r"radar", r"hava savunma", r"siper\b", r"hisar\b", r"tatbikat", r"idef", r"saha expo",
                   r"askeri", r"deniz topu", r"harp", r"jandarma genel komutan", r"donanma", r"insansız", r"savaş uçağı", r"savaş gemi",
                   r"savunma bakanı", r"adex", r"silah", r"ordusu", r"ordular", r"f-16", r"f-35", r"eurofighter", r"patriot", r"s-400"),
    "guvenlik": _rx(r"şehit", r"gazi(?!antep|mağusa|osmanpaşa| üniversite| mahalle)", r"asker", r"mehmetçik", r"tsk\b", r"tsk'", r"msb\b", r"msb'",
                    r"milli savunma", r"jandarma", r"emniyet", r"polis", r"güvenlik güç", r"özel harekat", r"komando", r"terör", r"pkk",
                    r"deaş", r"fetö", r"harekat", r"bedelli", r"askerlik", r"sahil güvenlik", r"güvenlik korucu", r"vatan nöbet", r"ordu\b", r"genelkurmay"),
    "yerel": _rx(r"belediye", r"muhtar", r"büyükşehir", r"meclis üyesi", r"belediye meclis"),
    "kamu": _rx(r"bakanlığı", r"bakanı", r"sgk", r"memur", r"kamu", r"valilik", r"valisi", r"kaymakam", r"genel müdürlüğü", r"başkanlığı",
                r"diyanet", r"afad", r"toki", r"işkur", r"emekli", r"resmi gazete", r"kpss"),
}

# canonical topic -> preferred slugs (first present in the site's menu wins)
TOPIC_SLUGS = {
    "spor": ["spor", "fixhaber-spor"], "dunya": ["dunya", "gundemi-apex-dunya", "fixhaber-dunya", "global", "uluslararasi-kuruluslar"],
    "ekonomi": ["ekonomi", "gundemi-apex-ekonomi", "fixhaber-ekonomi"], "teknoloji": ["teknoloji", "fixhaber-teknoloji", "fixhaber-haberler"],
    "saglik": ["saglik", "saglik-gundem"], "egitim": ["egitim"], "asayis": ["asayis"], "siyaset": ["siyaset", "politika"],
    "kultur": ["kultur-sanat", "kultur"], "magazin": ["yasam", "toplum-ve-yasam"], "cevre": ["cevre", "ekoloji", "doga"],
    "savunma": ["savunma-sanayi"], "guvenlik": ["tsk", "sehit-gazi"], "yerel": ["belediye", "yerel-yonetimler", "yerel"], "kamu": ["kamu", "kamu-kurumlari"],
}
SLUG_TOPIC = {}
for _t, _ss in TOPIC_SLUGS.items():
    for _s in _ss:
        SLUG_TOPIC.setdefault(_s, _t)
SLUG_TOPIC.update({"politika": "siyaset", "siyaset": "siyaset", "global": "dunya", "avrupa": "dunya", "fixhaber-gundem": None, "gundem": None,
                   "hastaliklar": "saglik", "saglik-gundem": "saglik", "ormancilik": "cevre", "doga": "cevre", "tarim": "cevre", "iklim": "cevre",
                   "ekoloji": "cevre", "cevre": "cevre", "yasam": None, "toplum-ve-yasam": None, "ozel-haber": None})
GENERAL = ("gundem", "gundemi-apex-gundem", "gundemi-apex-turkiye", "fixhaber-gundem", "toplum-ve-yasam", "yasam")

REGIONS = {
    "marmara": "Balıkesir Bilecik Bursa Çanakkale Edirne İstanbul Kırklareli Kocaeli Sakarya Tekirdağ Yalova",
    "ege": "Afyonkarahisar Aydın Denizli İzmir Kütahya Manisa Muğla Uşak",
    "akdeniz": "Adana Antalya Burdur Hatay Isparta Kahramanmaraş Mersin Osmaniye",
    "icanadolu": "Aksaray Ankara Çankırı Eskişehir Karaman Kayseri Kırıkkale Kırşehir Konya Nevşehir Niğde Sivas Yozgat",
    "karadeniz": "Amasya Artvin Bartın Bayburt Bolu Çorum Düzce Giresun Gümüşhane Karabük Kastamonu Ordu Rize Samsun Sinop Tokat Trabzon Zonguldak",
    "doguanadolu": "Ağrı Ardahan Bingöl Bitlis Elazığ Erzincan Erzurum Hakkari Iğdır Kars Malatya Muş Tunceli Van",
    "guneydogu": "Adıyaman Batman Diyarbakır Gaziantep Kilis Mardin Siirt Şanlıurfa Şırnak",
    "kibris": "Lefkoşa Girne Gazimağusa Mağusa Güzelyurt İskele Lefke KKTC Kıbrıs",
}
DISTRICTS = {
    "Ankara": "Çankaya Keçiören Yenimahalle Mamak Etimesgut Sincan Altındağ Pursaklar Gölbaşı Polatlı Beypazarı Elmadağ Kahramankazan Çubuk Ayaş Kızılcahamam Nallıhan Haymana Şereflikoçhisar Kalecik Akyurt Güdül Çamlıdere ASKİ EGO ABB Başkentte Başkent'te Başkentli",
    "İstanbul": "Kadıköy Üsküdar Beşiktaş Şişli Fatih Beyoğlu Bakırköy Pendik Kartal Maltepe Ataşehir Ümraniye Esenyurt Beylikdüzü Avcılar Küçükçekmece Bağcılar Bahçelievler Sarıyer Beykoz Silivri Çatalca Sultangazi Gaziosmanpaşa Eyüpsultan Zeytinburnu Tuzla Sancaktepe Sultanbeyli Çekmeköy Başakşehir Arnavutköy Esenler Güngören Bayrampaşa Kağıthane Adalar Şile İBB",
    "İzmir": "Karşıyaka Bornova Buca Konak Çiğli Bayraklı Gaziemir Karabağlar Narlıdere Balçova Menemen Torbalı Ödemiş Tire Bergama Aliağa Foça Dikili Çeşme Urla Seferihisar Menderes Kemalpaşa Kınık Kiraz Bayındır Beydağ Selçuk Karaburun",
    "Gazimağusa": "Mağusa", "Mağusa": "Gazimağusa",
}
_DFILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "districts.json")
_DSTOP = {"İnönü", "Bahçe", "Çınar", "Kemalpaşa"}
try:
    for _p, _ds in json.load(open(_DFILE, encoding="utf-8")).items():
        DISTRICTS[_p] = " ".join(dict.fromkeys(DISTRICTS.get(_p, "").split() + [d for d in _ds if d not in _DSTOP and " " not in d]))
except Exception:
    pass
CITY_SLUG = {}
def _slugify(n):
    return tr_lower(n).translate(str.maketrans("çğıöşü", "cgiosu")).replace(" ", "-")
for _r, _cs in REGIONS.items():
    for _c in _cs.split():
        CITY_SLUG[_slugify(_c)] = _c
CITY_SLUG.update({"magosa": "Mağusa", "afyon": "Afyonkarahisar", "maras": "Kahramanmaraş", "urfa": "Şanlıurfa", "antep": "Gaziantep"})

def _names_rx(names):
    alts = []
    for n in names:
        up = n.replace("i", "İ").upper() if n != n.upper() else n
        alts += [re.escape(n), re.escape(up)]
    return re.compile(r"(?<![\wçğıöşüÇĞİÖŞÜ])(?:" + "|".join(alts) + r")(?:l[ıiuü](?:lar|ler)?)?(?![a-zçğıöşü])")

_CITY_RX = {}
def city_rx(name):
    if name not in _CITY_RX:
        _CITY_RX[name] = _names_rx([name] + DISTRICTS.get(name, "").split())
    return _CITY_RX[name]

def city_of_slug(slug):
    s = slug or ""
    if s.startswith("gundemi-"):
        s = s.rsplit("-", 1)[-1]
    return CITY_SLUG.get(s)

def mentions_city(city, title, spot=""):
    return bool(city_rx(city).search((title or "") + "\n" + (spot or "")))

def region_rx(region):
    key = "region:" + region
    if key not in _CITY_RX:
        names = []
        for c in REGIONS[region].split():
            names += [c] + DISTRICTS.get(c, "").split()
        _CITY_RX[key] = _names_rx(names)
    return _CITY_RX[key]

ALL_CITIES_RX = None
def any_city(title, spot=""):
    global ALL_CITIES_RX
    if ALL_CITIES_RX is None:
        names = []
        for cs in REGIONS.values():
            for c in cs.split():
                names += [c] + DISTRICTS.get(c, "").split()
        ALL_CITIES_RX = _names_rx(names)
    return bool(ALL_CITIES_RX.search((title or "") + "\n" + (spot or "")))

def topic_scores(title, spot="", lead=""):
    t, s = tr_lower(title), tr_lower((spot or "") + " " + (lead or "")[:400])
    out = {}
    for k, rx in TOPICS.items():
        sc = 3 * len(rx.findall(t)) + len(rx.findall(s))
        if sc:
            out[k] = sc
    return out

SPECIFIC = ("spor", "dunya", "ekonomi", "teknoloji", "saglik", "egitim", "asayis", "siyaset", "kultur", "magazin", "cevre", "savunma")

def best_topic(title, spot="", lead="", allowed=SPECIFIC):
    sc = {k: v for k, v in topic_scores(title, spot, lead).items() if k in allowed}
    if not sc:
        return None, 0, False
    ranked = sorted(sc.items(), key=lambda kv: -kv[1])
    top, v = ranked[0]
    second = ranked[1][1] if len(ranked) > 1 else 0
    return top, v, (v >= 3 and v - second >= 2)

def topic_slug_for(topic, site_cats):
    for s in TOPIC_SLUGS.get(topic, []):
        if s in site_cats:
            return s
    return None

# topic-restricted sites (user rules 19:57); regexes run on tr_lower(title + spot)
SITE_RULES = {
    232: ("sehitgazi", ["guvenlik", "savunma"]),
    233: ("turksav", ["savunma"]),
    236: ("yesilvatan", ["cevre"]),
    237: ("dunyasaglik", ["saglik"]),
}
REGION_SITES = {1133: "ege", 1134: "marmara", 1143: "marmara", 1144: "marmara", 1135: "karadeniz", 1136: "icanadolu",
                1137: "doguanadolu", 1138: "guneydogu", 1139: "akdeniz", 1140: "kibris"}
LOCAL_SITES = {231}
LOCAL_WORDS = _rx(r"ilçe", r"köy", r"mahalle", r"kaymakam", r"vali\b", r"valisi", r"valiliği", r"belediye", r"muhtar", r"il genel meclis", r"esnaf", r"il müdür", r"ilimiz", r"kent\b", r"kentte", r"kentin")  # yerel.net.tr: local news only (any province/district or belediye/muhtar/vali/kaymakam)

def site_topic_ok(site_id, title, spot="", lead=""):
    if site_id in SITE_RULES:
        name, topics = SITE_RULES[site_id]
        tl, sl = tr_lower(title), tr_lower(spot or "")
        if TOPICS["magazin"].search(tl):
            return False, name
        for t in topics:
            if TOPICS[t].search(tl) or len(TOPICS[t].findall(sl)) >= (1 if t in ("savunma", "guvenlik") else 2):
                return True, name
        return False, name
    if site_id in REGION_SITES:
        return bool(region_rx(REGION_SITES[site_id]).search((title or "") + "\n" + (spot or ""))), "region:" + REGION_SITES[site_id]
    if site_id in LOCAL_SITES:
        sc = topic_scores(title, spot, "")
        loc = LOCAL_WORDS.search(tr_lower((title or "") + "\n" + (spot or "")))
        return (any_city(title, spot) or sc.get("yerel", 0) >= 1 or bool(loc)), "local"
    return True, ""


# strict per-category rules (title + spot, tr_lower). An item in one of these categories stays only if its rule matches.
_P = r"ak parti|chp|mhp|iyi parti|dem parti|yeniden refah|saadet partisi|zafer partisi|deva partisi|gelecek partisi|partisi|parti\b"
CAT_RULES = {k: _rx(*v.split("|")) for k, v in {
    "yerel-yonetimler": r"belediye|büyükşehir|muhtar",
    "belediye": r"belediye|büyükşehir",
    "muhtar": r"muhtar",
    "bakanliklar": r"bakanlığı|bakanı|bakan\b|bakan yardımcısı|bakanlık",
    "tbmm": r"tbmm|meclis|milletvekili|genel kurul|kanun teklifi|komisyon",
    "siyasi-partiler": _P,
    "kamu-kurumlari": r"genel müdürlüğü|başkanlığı|kurumu|sgk|tüik|ösym|meb\b|diyanet|afad|toki|işkur|bddk|spk\b|rtük|müdürlüğü|kurulu",
    "mulki-idare": r"vali\b|valisi|valiliği|valilik|kaymakam",
    "valilikler": r"vali\b|valisi|valiliği|valilik",
    "kaymakamliklar": r"kaymakam",
    "stk": r"derneği|dernek|vakfı|vakıf|federasyon|konfederasyon|sendika|stk\b|sivil toplum|odası|borsası|kızılay|yeşilay|birliği",
    "sivil-toplum-kuruluslari": r"derneği|dernek|vakfı|vakıf|federasyon|konfederasyon|sendika|stk\b|sivil toplum|odası|borsası|kızılay|yeşilay|birliği",
    "buyuksehir-ve-iller": r"büyükşehir|valisi|valiliği|il genel|il müdür",
    "ilceler": r"ilçe|kaymakam",
    "kamu": r"bakanlığı|bakanı|sgk|memur|kamu|valilik|valisi|kaymakam|genel müdürlüğü|başkanlığı|diyanet|afad|toki|işkur|emekli|resmi gazete|kpss",
    "cumhurbaskanligi": r"cumhurbaşkan|erdoğan|külliye|iletişim başkan",
    "genel-merkez": r"genel başkan|genel merkez|genel sekreter|sözcü|myk|mkyk|parti meclis",
    "il-ilce-baskanliklari": r"il başkan|ilçe başkan",
    "nato": r"nato",
    "birlesmis-milletler": r"bm\b|bm'|birleşmiş milletler|unesco|unicef|dsö\b|unhcr|guterres",
    "avrupa-birligi": r"avrupa birliği|ab\b|ab'|avrupa komisyonu|avrupa parlamentosu|brüksel|von der leyen",
    "uluslararasi-kuruluslar": r"nato|bm\b|bm'|birleşmiş milletler|avrupa birliği|ab\b|ab'|imf|dünya bankası|g20|g7|aget|unesco|unicef|dsö\b|türk devletleri|ihh|uluslararası",
    "roportajlar": r"röportaj|söyleşi|anlattı|konuştu|açıklamalarda bulun|değerlendirdi|sorularını yanıtladı",
    "sehit-gazi": r"şehit|gazi(?!antep|mağusa|osmanpaşa| üniversite| mahalle)",
    "tsk": r"tsk\b|tsk'|asker|msb\b|msb'|milli savunma|mehmetçik|komando|harekat|kuvvetleri|genelkurmay|jandarma|tatbikat|ordu\b",
}.items()}
CAT_ORDER = ["muhtar", "belediye", "yerel-yonetimler", "kaymakamliklar", "valilikler", "mulki-idare", "il-ilce-baskanliklari", "genel-merkez",
             "siyasi-partiler", "tbmm", "cumhurbaskanligi", "bakanliklar", "kamu-kurumlari", "nato", "birlesmis-milletler", "avrupa-birligi",
             "uluslararasi-kuruluslar", "sehit-gazi", "tsk", "stk", "sivil-toplum-kuruluslari", "ilceler", "buyuksehir-ve-iller", "kamu"]

# Kamu > Güvenlik (tabs TSK / Emniyet / Jandarma; defense industry -> savunma-sanayi) and Bakanlıklar per-ministry tabs
MINISTRIES = {
    "bakanlik-aile": r"aile ve sosyal hizmetler|aile bakan|bakan göktaş|göktaş",
    "bakanlik-saglik": r"sağlık bakan|bakan memişoğlu|memişoğlu",
    "bakanlik-milli-egitim": r"milli eğitim bakan|meb\b|meb'|bakan tekin|yusuf tekin",
    "bakanlik-icisleri": r"içişleri bakan|bakan yerlikaya|yerlikaya",
    "bakanlik-adalet": r"adalet bakan|bakan tunç|yılmaz tunç",
    "bakanlik-disisleri": r"dışişleri bakan|bakan fidan|hakan fidan",
    "bakanlik-hazine": r"hazine ve maliye|maliye bakan|bakan şimşek|mehmet şimşek",
    "bakanlik-calisma": r"çalışma ve sosyal güvenlik|çalışma bakan|bakan ışıkhan|ışıkhan",
    "bakanlik-tarim": r"tarım ve orman bakan|tarım bakan|bakan yumaklı|yumaklı",
    "bakanlik-ulastirma": r"ulaştırma ve altyapı|ulaştırma bakan|bakan uraloğlu|uraloğlu",
    "bakanlik-enerji": r"enerji ve tabii kaynaklar|enerji bakan|bakan bayraktar|alparslan bayraktar",
    "bakanlik-sanayi": r"sanayi ve teknoloji bakan|sanayi bakan|bakan kacır|kacır",
    "bakanlik-cevre": r"çevre, şehircilik|çevre şehircilik|çevre bakan|bakan kurum|murat kurum",
    "bakanlik-ticaret": r"ticaret bakan|bakan bolat|ömer bolat",
    "bakanlik-kultur-turizm": r"kültür ve turizm bakan|turizm bakan|bakan ersoy|nuri ersoy",
    "bakanlik-genclik-spor": r"gençlik ve spor bakan|spor bakan|bakan bak\b|osman aşkın bak",
    "bakanlik-msb": r"milli savunma bakan|msb\b|msb'|bakan güler|yaşar güler",
}
GUVENLIK = {
    "tsk": r"tsk\b|tsk'|türk silahlı kuvvetleri|kara kuvvetleri|hava kuvvetleri|deniz kuvvetleri|sahil güvenlik|mehmetçik|asker|askeri|komando|genelkurmay|tatbikat|harekat|kuvvet komutan|piyade|fırkateyn|korvet|denizaltı|savaş uçağı",
    "emniyet": r"emniyet|polis|egm\b|narkotik|asayiş şube|terörle mücadele şube|çevik kuvvet|trafik denetim",
    "jandarma": r"jandarma",
    "savunma-sanayi": r"savunma sanayi|ssb\b|ssb'|aselsan|roketsan|tusaş|baykar|havelsan|mke\b|mke'|stm\b|fnss|otokar|kaan\b|hürjet|bayraktar tb|akıncı|kızılelma|siha|füze|mühimmat|idef|saha expo",
}
GUVENLIK["guvenlik"] = "|".join(GUVENLIK.values())
for _k, _v in list(MINISTRIES.items()) + list(GUVENLIK.items()):
    CAT_RULES[_k] = _rx(*_v.split("|"))
CAT_RULES["savunma-sanayi"] = TOPICS["savunma"]   # broad defense (turksav rule: defense industry, MSB, Genelkurmay, defense news)
CAT_RULES["guvenlik"] = re.compile(CAT_RULES["guvenlik"].pattern + "|" + TOPICS["savunma"].pattern)
CAT_ORDER[:0] = list(MINISTRIES) + ["jandarma", "emniyet", "tsk", "savunma-sanayi", "guvenlik"]
LOCAL_CATS = ("yerel",)

_DISTRICT_RX = None
def any_district(title, spot=""):
    global _DISTRICT_RX
    if _DISTRICT_RX is None:
        _DISTRICT_RX = _names_rx([d for v in DISTRICTS.values() for d in v.split() if d[:1].isupper() and not d.isupper()])
    return bool(_DISTRICT_RX.search((title or "") + "\n" + (spot or "")))

def cat_rule_ok(cat, title, spot=""):
    rx = CAT_RULES.get(cat)
    if rx is None:
        return True
    low = tr_lower((title or "") + "\n" + (spot or ""))
    if rx.search(low):
        return True
    if cat == "buyuksehir-ve-iller":   # il belediyesi / il geneli: province name + belediye/vali
        return bool(re.search(r"belediye|vali", low)) and any_city(title, spot) and not any_district(title, spot)
    if cat == "ilceler":
        return any_district(title, spot)
    return False

AI_MAX = int(os.environ.get("CLASSIFIER_AI_MAX", "400"))

# ---------------------------------------------------------------- AI chain (only for ambiguous items)
PROVIDERS = [
    ("evren", "https://evren-llmapi.ssyz.org.tr/v1", "EVREN_API_KEY", ["deepseek-v4-flash", "gemma-4-31b"], "x-api-key"),
    ("nvidia", "https://integrate.api.nvidia.com/v1", "NVIDIA_API_KEY", ["nvidia/nemotron-3.5-lightning-30b-a3b"], "bearer"),
    ("gemini", "https://generativelanguage.googleapis.com/v1beta/openai", "GEMINI_API_KEY", ["gemini-3.1-flash-lite"], "bearer"),
    ("openai", "https://api.openai.com/v1", "OPENAI_API_KEY", ["gpt-4.1-nano", "gpt-5-nano"], "bearer"),
]
_DEAD = {}
AI_STATS = {"calls": 0, "ok": 0, "fail": 0, "by": {}}

def ai_choose(title, spot, choices, timeout=25):
    if not choices:
        return None
    prompt = ("Türkçe bir haberi en doğru kategoriye yerleştir. Sadece şu listeden birini ya da 'none' yaz, başka hiçbir şey yazma.\n"
              "Kategoriler: " + ", ".join(choices) + "\nŞehir kategorileri (ör. ankara) yalnızca haber o şehirle ilgiliyse seçilir.\n"
              f"Başlık: {title}\nÖzet: {(spot or '')[:400]}\nCevap:")
    if AI_STATS["calls"] >= AI_MAX:
        return None
    for name, base, env, models, auth in PROVIDERS:
        key = os.environ.get(env)
        if not key or _DEAD.get(name, 0) > time.time():
            continue
        for model in models:
            body = {"model": model, "messages": [{"role": "user", "content": prompt}]}
            if model.startswith("gpt-5"):
                body.update(max_completion_tokens=200, reasoning_effort="minimal")
            else:
                body.update(max_tokens=200, temperature=0)
            if name == "evren":
                body["reasoning_effort"] = "none" if model == "deepseek-v4-flash" else "low"
            elif name == "nvidia":
                body["chat_template_kwargs"] = {"enable_thinking": False}
            elif name == "gemini":
                body["reasoning_effort"] = "minimal"
            hdr = {"Content-Type": "application/json"}
            hdr.update({"x-api-key": key} if auth == "x-api-key" else {"Authorization": "Bearer " + key})
            AI_STATS["calls"] += 1
            try:
                req = urllib.request.Request(base + "/chat/completions", data=json.dumps(body).encode(), headers=hdr)
                j = json.loads(urllib.request.urlopen(req, timeout=timeout).read())
                ans = tr_lower(((j.get("choices") or [{}])[0].get("message") or {}).get("content") or "")
                ans = re.sub(r"<think>.*?</think>", "", ans, flags=re.S).strip().strip(".'\"` \n")
                AI_STATS["ok"] += 1
                AI_STATS["by"][name] = AI_STATS["by"].get(name, 0) + 1
                for c in choices:
                    if ans == c:
                        return c
                for c in choices:
                    if re.search(r"(?<![a-z-])" + re.escape(c) + r"(?![a-z-])", ans):
                        return c
                return None
            except Exception:
                AI_STATS["fail"] += 1
                continue
        _DEAD[name] = time.time() + 300
    return None

def decide(cat, site_cats, title, spot="", lead="", site_id=None, ai=True):
    """Return dict(action, to, reason). action: keep | move | hide."""
    if site_id is not None:
        ok, rule = site_topic_ok(site_id, title, spot, lead)
        if not ok:
            return dict(action="hide", to=None, reason="off_topic:" + rule)
    city = city_of_slug(cat)
    sc = topic_scores(title, spot, lead)
    top, v, conf = best_topic(title, spot, lead)
    def target(default_general=True):
        if top and conf:
            s = topic_slug_for(top, site_cats)
            if s and s != cat:
                return s, "rule:" + top
        if ai:
            local_ok = any_city(title, spot)
            choices = [c for c in site_cats if c != "ozel-haber" and (not city_of_slug(c) or mentions_city(city_of_slug(c), title, spot))
                       and cat_rule_ok(c, title, spot) and (c not in LOCAL_CATS or local_ok) and not c.startswith("bolge-")]
            s = ai_choose(title, spot, choices)
            if s and s != cat:
                return s, "ai"
        if default_general:
            for g in GENERAL:
                if g in site_cats and g != cat:
                    return g, "general"
        return None, ""
    if city:
        if mentions_city(city, title, spot):
            return dict(action="keep", to=None, reason="city_ok")
        # local sites: try another city category that the item does name
        for c in site_cats:
            cc = city_of_slug(c)
            if cc and c != cat and mentions_city(cc, title, spot):
                return dict(action="move", to=c, reason="city:" + cc)
        to, why = target()
        return dict(action="move", to=to, reason="not_city:" + why) if to else dict(action="hide", to=None, reason="not_city:no_fit")
    if cat == "global":
        return dict(action="keep", to=None, reason="global_feed")
    if cat in LOCAL_CATS:
        if any_city(title, spot) or sc.get("yerel", 0) >= 3:
            return dict(action="keep", to=None, reason="local_ok")
        to, why = target()
        return dict(action="move", to=to, reason="not_local:" + why) if to else dict(action="hide", to=None, reason="not_local:no_fit")
    if cat in CAT_RULES:
        if cat_rule_ok(cat, title, spot):
            return dict(action="keep", to=None, reason="cat_rule_ok")
        for c in CAT_ORDER:
            if c != cat and c in site_cats and cat_rule_ok(c, title, spot):
                return dict(action="move", to=c, reason="cat_rule:" + c)
        to, why = target()
        return dict(action="move", to=to, reason="cat_rule_fail:" + why) if to else dict(action="hide", to=None, reason="cat_rule_fail:no_fit")
    ctopic = SLUG_TOPIC.get(cat)
    if cat in GENERAL or ctopic is None:
        # catch-all: move out only on a strong, unambiguous rule match
        if top and conf and v >= 6 and top in ("spor", "dunya", "ekonomi", "teknoloji", "saglik", "magazin", "kultur"):
            s = topic_slug_for(top, site_cats)
            if s and s != cat:
                return dict(action="move", to=s, reason="general->rule:" + top)
        return dict(action="keep", to=None, reason="general")
    own = sc.get(ctopic, 0)
    if own >= 3 or (top == ctopic):
        return dict(action="keep", to=None, reason="topic_ok")
    if own >= 1 and not conf:
        return dict(action="keep", to=None, reason="topic_weak_ok")
    to, why = target()
    return dict(action="move", to=to, reason="wrong_topic:" + why) if to else dict(action="keep", to=None, reason="no_target")
