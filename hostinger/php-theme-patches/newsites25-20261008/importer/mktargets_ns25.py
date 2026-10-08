"""newsites25 2026-10-08: targets for memur (1147), turkdunyasi (1148), world.fix.tc (1149). Run: python3 mktargets_ns25.py"""
import json
M, T, WD = 1147, 1148, 1149
S = lambda p: "scrape:https://www.haberler.com/%s/" % p
HT = lambda k: "https://rss.haberler.com/RssNew.aspx?kategori=" + k
def wb(x): return r"(?<!\w)(?:%s)" % x
def both(a, b): return r"(?s)^(?=.*%s)(?=.*%s)" % (wb(a), wb(b))
I = "[iİ]"; i_ = "[ıI]"

# ---------------- MEMUR
M_FEEDS_CORE = ["https://www.kamudanhaber.net/rss", "https://www.memurhaberi.com/rss", "https://www.kesk.org.tr/feed/",
    HT("kpss"), HT("emekli"), HT("memur"), HT("sendika"),
    S("memur"), S("kpss"), S("memur-maaslari"), S("toplu-sozlesme"), S("emekli"), S("sendika"), S("atama"), S("ozluk-haklari"), S("kamu-personeli")]
M_FEEDS_GEN = ["https://rss.haberler.com/rss.asp?kategori=ekonomi", "https://rss.haberler.com/rss.asp?kategori=egitim", "https://rss.haberler.com/rss.asp?kategori=guncel",
    "https://www.hurriyet.com.tr/rss/ekonomi", "https://www.hurriyet.com.tr/rss/gundem", "https://www.ahaber.com.tr/rss/ekonomi.xml",
    "https://www.milliyet.com.tr/rss/rssnew/ekonomi.xml", "https://www.sozcu.com.tr/feeds-rss-category-ekonomi", "https://www.sozcu.com.tr/feeds-rss-category-gundem",
    "https://www.haberturk.com/rss/ekonomi.xml", "https://www.haberturk.com/rss/kategori/gundem.xml", "https://www.yenisafak.com/rss?xml=ekonomi",
    "https://www.yenisafak.com/rss?xml=gundem", "https://www.trthaber.com/ekonomi_articles.rss", "https://www.trthaber.com/gundem_articles.rss",
    "https://www.trthaber.com/egitim_articles.rss", "https://www.ntv.com.tr/turkiye.rss", "https://www.ntv.com.tr/egitim.rss",
    "https://www.aa.com.tr/tr/rss/default?cat=guncel", "https://www.aa.com.tr/tr/rss/default?cat=ekonomi", "https://www.sabah.com.tr/rss/ekonomi.xml",
    "https://www.sabah.com.tr/rss/gundem.xml", "https://www.star.com.tr/rss/ekonomi.xml", "https://www.dirilispostasi.com/rss/ekonomi"]
M_FEEDS = M_FEEDS_CORE + [S("memur-zammi"), S("hakem-kurulu"), S("memur-sen")] + M_FEEDS_GEN  # thin-fill 2026-10-08
MEMUR = (r"memur|kamu (?:personel|çal[ıi]şan|görevli|işçi)|devlet memur|4/[ABCD]\b|4-[ABCD]\b|sözleşmeli personel|toplu sözleşme|KPSS|ÖSYM|"
         r"657 say[ıi]l[ıi]|aday memur|DPB\b|Devlet Personel|öğretmen|polis memur|hemşire|ebe\b|imam|kamu kurum|bakanl[ıi]k personel|"
         r"Memur-?Sen|Kamu-?Sen|KESK|Eğitim-?B[iİ]r-?Sen|Eğitim-?Sen|Eğitim-?İş|Sağl[ıi]k-?Sen|Diyanet-?Sen|Hizmet-?Sen|Ali Yalç[ıi]n|Önder Kahveci|"
         r"Hakem Kurulu|SGK|emekli|refah pay[ıi]|enflasyon fark[ıi]|ek gösterge|özlük|kadro|atama|tayin|personel al[ıi]m")
MONEY = r"maaş|zam\b|zamm[ıi]|zaml[ıi]|ikramiye|refah pay[ıi]|enflasyon fark[ıi]|ek ödeme|ek gösterge|promosyon|bayram ikramiye|aylık|katsay[ıi]|taban ayl[ıi]k|memur maaş"
CRIME = (r"öldür|cinayet|silahl[ıi] sald[ıi]r|vuruldu|vurulmuş|bıçak|ceset|cesed|tutukland|gözalt|kaza(?:da|s[ıi])|yaral[ıi]|intihar|taciz|istismar|tecavüz|uyuşturucu|"
         r"rüşvet|dolandır|operasyon|firari|hapis cezas|kaptırd|vurgun|yang[ıi]n|alev ald|patlama|çöktü|hayat[ıi]n[ıi] kaybet")
SPORT = r"Süper L[iİ]g|futbol|\bmaç|transfer|teknik direktör|Galatasaray|Fenerbahçe|Beşiktaş|Trabzonspor|milli tak[ıi]m|Ronaldo|hakem(?!\s*kurul)|basketbol|voleybol"
MAG = r"dizi(?:si|nin)?\b|fragman|\bbölüm\b|şark[ıi]c[ıi]|oyuncu|burç|loto|piyango|çekiliş|kaç yaş|evli mi|nereli|kimdir"
FOREIGN = r"(Fransa|Almanya|İngiltere|ABD|Amerika|Yunanistan|İtalya|İspanya|Rusya|Çin|Japonya|Belçika|Hollanda|Arjantin|Brezilya)'(?:da|de|ta|te|n[ıi]n)"
M_EX = "|".join([CRIME, SPORT, MAG, FOREIGN])
def mt(cat, match, mn=14, cap=14, per=3, age=21, feeds=M_FEEDS, ex=""):
    return dict(site=M, cat=cat, feeds=feeds, match=match if match.startswith("(?s)") else wb(match), exclude=M_EX + ex, min=mn, per_run=per, max_age=age, fill_cap=cap)
memur = [
    mt("toplu-sozlesme", r"toplu sözleşme|toplu görüşme|Kamu Görevlileri Hakem|Hakem Kurulu karar|çerçeve protokol|8\. Dönem Toplu|9\. Dönem Toplu|toplu iş sözleşmesi.*kamu|kamu işçi", age=60),
    mt("memur-maas-zam", both(r"memur|kamu (?:personel|çal[ıi]şan|görevli|işçi)|4/[ABC]|4-[ABC]|sözleşmeli personel|öğretmen|polis|hemşire|imam|emekli memur|asgari ücret.*kamu", MONEY)),
    mt("sendikalar", r"Memur-?Sen|Kamu-?Sen|KESK|Eğitim-?B[iİ]r-?Sen|Eğitim-?Sen|Eğitim-?İş|Türk Eğitim-?Sen|Sağl[ıi]k-?Sen|Diyanet-?Sen|Büro Memur-?Sen|Hizmet-?Sen|"
         r"Enerji B[iİ]r-?Sen|Bem-?B[iİ]r-?Sen|Tüm Bel-?Sen|Birleşik Kamu-?İş|Ali Yalç[ıi]n|Önder Kahveci|memur sendika|kamu sendika|sendika.{0,60}(?:memur|kamu|öğretmen|sağl[ıi]k çal[ıi]şan)"),
    mt("kpss", r"KPSS|EKPSS|ÖSYM|ALES\b|YDS\b|DGS\b|sınav takvimi|tercih k[ıi]lavuzu|sınav sonuç|sınav ücret|MEB.{0,30}sınav|Akademi Giriş Sınav|AGS\b"),
    mt("personel-alimi", r"personel al[ıi]m|memur al[ıi]m|al[ıi]m ilan|kadrolu al[ıi]m|sözleşmeli personel al|işçi al[ıi]m|polis al[ıi]m|uzman erbaş al|subay al[ıi]m|"
         r"astsubay al|öğretmen al[ıi]m|sağl[ıi]k personeli al|bekçi al[ıi]m|kamuya .{0,30}al[ıi]m|al[ıi]m yap[ıi]lacak|başvuru(?:lar)? (?:başlad|sürüyor).{0,60}(?:personel|kadro|memur)", age=45),
    mt("atama-kadro", both(r"memur|öğretmen|kamu|personel|polis|hemşire|imam|uzman|hakim|hâkim|savcı|akademisyen|doktor|hekim|kaymakam|müdür",
                           r"atama|atand[ıi]|tayin|kadro|norm kadro|yer değiştirme|görevlendirme|il dış[ıi]|il içi|rotasyon|kadroya geçiş|görevde yükselme|unvan değişikliği|nakil")),
    mt("memur-emeklilik", r"emekli (?:maaş|ikramiye|memur|ayl[ıi]|bayram|promosyon|zamm|zam\b|öğretmen|polis)|emeklilik|EYT\b|SGK\b|emekliler(?:in)? (?:maaş|ayl|zam|ikramiye|seyyanen|intibak|bayram)|erken emeklilik|intibak|yaş s[ıi]n[ıi]r[ıi].{0,40}emekli|hizmet borçlanma|askerlik borçlanma|doğum borçlanma|Bağ-?Kur|SSK"),
    mt("ozluk-haklari", r"özlük hak|yan ödeme|fazla mesai|nöbet ücret|ek ders|y[ıi]ll[ıi]k izin|mazeret izn|doğum izn|babal[ıi]k izn|süt izn|disiplin (?:ceza|yönetmeli|kurulu)|"
         r"görevde yükselme|unvan değişikliği|kademe ilerle|derece ilerlem|lojman|kreş|esnek mesai|esnek çal[ıi]şma|uzaktan çal[ıi]şma|yar[ıi] zamanl[ıi] çal[ıi]şma|giyim yard[ıi]m|aile yard[ıi]m|"
         r"ölüm yard[ıi]m|harc[ıi]rah|seyyanen|iş güvencesi|mobbing|kamu görevlileri etik", mn=12, cap=12),
    mt("personel-mevzuati", both(r"memur|kamu görevli|kamu personel|kamu çal[ıi]şan|öğretmen|sözleşmeli personel|personel|657 say|DPB\b|Devlet Personel|kamu kurum|polis|hemşire|sağl[ıi]k çal[ıi]şan|akademisyen",
                                 r"Resmi Gazete|Resmî Gazete|yönetmelik|genelge|Cumhurbaşkanl[ıi]ğ[ıi] Karar|kanun teklif|torba yasa|kanun değişik|düzenleme yap[ıi]ld|mevzuat|tebliğ"), mn=12, cap=12, age=30, ex=r"|ATAMA KARARLARI|Bugünün kararları", feeds=M_FEEDS + [S("resmi-gazete"), S("genelge"), S("yonetmelik")]),
]

# ---------------- TÜRK DÜNYASI
T_FEEDS_CORE = [S("azerbaycan"), S("kazakistan"), S("ozbekistan"), S("kirgizistan"), S("turkmenistan"), S("turk-dunyasi"), S("balkanlar"), S("bosna-hersek"),
    S("kosova"), S("kirim"), S("gagavuz"), S("dogu-turkistan"), S("bati-trakya"), S("gurbetci"), S("osmanli"), S("tarih"), S("arkeoloji"), S("kktc"),
    HT("azerbaycan"), HT("t%C3%BCrk%20d%C3%BCnyas%C4%B1"), HT("bulgaristan"), HT("kosova"), HT("osmanl%C4%B1"), HT("kazakistan"), HT("almanya"),
    HT("k%C4%B1rg%C4%B1zistan"), HT("%C3%B6zbekistan"), HT("do%C4%9Fu%20t%C3%BCrkistan")]
T_FEEDS_GEN = ["https://www.trthaber.com/dunya_articles.rss", "https://www.aa.com.tr/tr/rss/default?cat=dunya", "https://www.aa.com.tr/tr/rss/default?cat=guncel",
    "https://www.aa.com.tr/tr/rss/default?cat=kultur", "https://www.trthaber.com/kultur_sanat_articles.rss", "https://www.trthaber.com/gundem_articles.rss",
    "https://www.ntv.com.tr/dunya.rss", "https://www.hurriyet.com.tr/rss/dunya", "https://www.sabah.com.tr/rss/dunya.xml", "https://www.yenisafak.com/rss?xml=dunya",
    "https://rss.haberler.com/rss.asp?kategori=dunya", "https://rss.haberler.com/rss.asp?kategori=guncel", "https://www.milliyet.com.tr/rss/rssnew/dunyarss.xml",
    "https://www.star.com.tr/rss/dunya.xml", "https://www.ahaber.com.tr/rss/dunya.xml", "https://www.tgrthaber.com/rss/dunya", "https://www.dirilispostasi.com/rss/dunya",
    "https://www.haberturk.com/rss/kategori/dunya.xml", "https://www.yenisafak.com/rss?xml=gundem", "https://rss.dw.com/rdf/rss-tur-all",
    "https://feeds.bbci.co.uk/turkce/rss.xml", "https://www.indyturk.com/rss.xml", "https://tr.euronews.com/rss?format=mrss&level=theme&name=news"]
T_FEEDS = T_FEEDS_CORE + [S("uygur")] + T_FEEDS_GEN  # thin-fill 2026-10-08
T_EX = "|".join([r"Süper L[iİ]g|\bmaç(?:ta|ı|ın|a)?\b|teknik direktör|transfer|\bgol\b|Qarabağ|UEFA|halı saha|dizi(?:si|nin)?\b|fragman|\bbölüm\b|burç|loto|kaç yaş|evli mi|nereli",
                  r"öldür|cinayet|bıçak|tutuklan|gözalt|uyuşturucu|uyruklu|kaçak göçmen|düzensiz göçmen|fuhuş|dolandır|hırsız|naaş|cansız beden|cesed|ceset|kazas[ıi]|kazada|kaza\b|çarpışt|çarpt[ıi]|yaraland|yaral[ıi]\b|alev ald|yang[ıi]n ç[ıi]k|son yolculu|toprağa ver|cenaze|vefat|hayat[ıi]n[ıi] kaybet|filmi\b", r"\bmaç"])
def tt(cat, match, mn=14, cap=14, per=3, age=30, feeds=T_FEEDS):
    return dict(site=T, cat=cat, feeds=feeds, match=wb(match), exclude=T_EX, min=mn, per_run=per, max_age=age, fill_cap=cap)
turk = [
    tt("tdt", r"Türk Devletleri Teşkilat|\bTDT\b|Türk Konseyi|TÜRKSOY|TÜRKPA|Türk Akademisi|Türk Kültür ve Miras Vakf|Türk Devletleri İşbirliği|Türk Yatırım Fonu|Türk dünyası zirve|Türk Devletleri Zirve", mn=12, cap=12, age=45),
    tt("azerbaycan", r"Azerbaycan|Bakü|Aliyev|Karabağ|Nahçıvan|Hankendi|Şuşa|Ağdam|Gence\b|Zengezur"),
    tt("orta-asya", r"Kazakistan|Astana|Almat[ıi]|Tokayev|Özbekistan|Taşkent|Semerkant|Buhara|Mirziyoyev|K[ıi]rg[ıi]zistan|Bişkek|Caparov|Japarov|Türkmenistan|Aşkabat|Berdimuhamedov|Orta Asya|Türkistan\b"),
    tt("dogu-turkistan", r"Doğu Türkistan|Uygur Türk|Uygurlar|Uygur bölge|Uygur|Sincan Uygur|Urumçi|Kaşgar", mn=10, cap=10, age=120),
    tt("kirim-kafkasya", r"K[ıi]r[ıi]m Tatar|K[ıi]r[ıi]m'|K[ıi]r[ıi]m Yar[ıi]mada|Gagavuz|Komrat|Tataristan|Başkurdistan|Başkurt|Çuvaş|Yakutistan|Saha Cumhuriyeti|Ah[ıi]ska|Karaçay|Balkar|Kumuk|Nogay|Kuzey Kafkasya|Dağ[ıi]stan|Kafkasya|Çerkes", mn=10, cap=10, age=60),
    tt("balkanlar", r"Balkan|Bosna|Saraybosna|Kosova|Priştine|Prizren|Arnavutluk|Kuzey Makedonya|Üsküp|Sancak|Novi Pazar|Karadağ|Bat[ıi] Trakya|Gümülcine|İskeçe|"
       r"Bulgaristan Türk|K[ıi]rcaali|Deliorman|Dobruca|Boşnak|Srebrenitsa|Vucic|Sırbistan"),
    tt("avrupa-turkleri", r"Avrupa(?:'daki)? Türk|Almanya(?:'daki)? Türk|Türk as[ıi]ll[ıi]|Türk kökenli|gurbetçi|Türk toplumu|Türk diaspora|Hollanda(?:'daki)? Türk|Fransa(?:'daki)? Türk|"
       r"Avusturya(?:'daki)? Türk|Belçika(?:'daki)? Türk|İsviçre(?:'daki)? Türk|DİTİB|\bUID\b|Yurtd[ıi]ş[ıi] Türkler|\bYTB\b|çifte vatandaş.{0,60}(?:Türk|Bulgaristan)|mavi kart|Türk işçi|Türk göç", mn=10, cap=10, age=45),
    tt("turk-devletleri", r"Türk devletleri|Türk dünyas[ıi]|Türk cumhuriyetleri|KKTC|Kuzey K[ıi]br[ıi]s|Lefkoşa|Erhürman|Türk soylu|soydaş|Türkmeneli|Irak Türkmen|Kerkük", mn=12, cap=12),
    tt("turk-tarihi", r"Osmanl[ıi] (?:dönem|İmparatorluğ|Devlet|padişah|sultan|ar[sş]iv|eser|miras|tarih|mimari|Türkçe|köprü|cami|kal[ıi]nt|hanedan|belge|döneminden|eseri|yap[ıi]s)|Osmanl[ıi]'(?:dan|nın|n[ıi]n|da)|Selçuklu (?:Devlet|İmparatorluğ|dönem|eser|mimari|sultan|cami|medrese|kümbet|hanedan|miras)|Selçuklular|Büyük Selçuklu|Göktürk|Orhun|Kül Tigin|Bilge Kağan|Hunlar|Hun İmparatorluğu|Türk tarih|Türk Tarih Kurumu|Malazgirt|Çanakkale Zafer|Kurtuluş Savaş|"
       r"Anadolu Selçuklu|Beylikler dönem|Timurlu|Babür İmparator|Alt[ıi]n Orda|Karahanl[ıi]|Gazneli|Harezm|Akkoyunlu|Karakoyunlu|Memlük|Ertuğrul Gazi|Fatih Sultan Mehmet(?! Köprü)|Kanuni Sultan Süleyman(?! Cad)|Yavuz Sultan Selim(?! Köprü)|Mimar Sinan(?! Güzel)|"
       r"tarihi (?:cami|han\b|hamam|köprü|kervansaray|kale|medrese)|kervansaray|padişah|arkeolojik kaz[ıi]|höyük|Türk arkeoloj", mn=12, cap=12),
    tt("turk-kulturu", r"Türk kültür|Türk müziğ|Türk mutfağ|Nevruz|halk oyun|Âş[ıi]k Veysel|aş[ıi]kl[ıi]k geleneğ|ozanlar|destan[ıi]?\b|Dede Korkut|Manas Destan|Köroğlu|Nasreddin Hoca|Yunus Emre|Hac[ıi] Bektaş|Mevlana|"
       r"ebru sanat|hat sanat|çini sanat|kilim|keçe sanat|geleneksel okçuluk|okçuluk|cirit|kökbörü|Etnospor|Yunus Emre Enstitüsü|\bTİKA\b|türkü|bağlama|el sanatlar|Türk dili|Türk Dil Kurumu|\bTDK\b|"
       r"ortak alfabe|Türk Dünyas[ıi] Kültür Başkent|somut olmayan kültürel miras|UNESCO.{0,40}(?:Türk|miras)|geleneksel (?:Türk|el sanat|spor oyun|okçuluk|halk)", mn=12, cap=12),
]

# ---------------- WORLD (continent via ns25_run.py e['_cat'])
W_FEEDS = ["https://www.trthaber.com/dunya_articles.rss", "https://www.aa.com.tr/tr/rss/default?cat=dunya", "https://www.ntv.com.tr/dunya.rss",
    "https://www.cnnturk.com/feed/rss/dunya/news", "https://www.haberturk.com/rss/kategori/dunya.xml", "https://www.hurriyet.com.tr/rss/dunya",
    "https://www.sabah.com.tr/rss/dunya.xml", "https://www.milliyet.com.tr/rss/rssnew/dunyarss.xml", "https://www.yenisafak.com/rss?xml=dunya",
    "https://www.star.com.tr/rss/dunya.xml", "https://www.sozcu.com.tr/feeds-rss-category-dunya", "https://rss.haberler.com/rss.asp?kategori=dunya",
    "https://www.dirilispostasi.com/rss/dunya", "https://www.cumhuriyet.com.tr/rss/dunya", "https://www.tgrthaber.com/rss/dunya",
    "https://www.ahaber.com.tr/rss/dunya.xml", "https://rss.dw.com/rdf/rss-tur-all", "https://feeds.bbci.co.uk/turkce/rss.xml",
    "https://www.indyturk.com/rss.xml", "https://tr.euronews.com/rss?format=mrss&level=theme&name=news"]
W_FEEDS = W_FEEDS + [S(x) for x in ("brezilya", "arjantin", "venezuela", "kolombiya", "sili", "peru", "kuba", "ekvador", "bolivya", "avustralya", "yeni-zelanda")]  # thin-fill 2026-10-08
W_ECON_FEEDS = ["https://www.bloomberght.com/rss", "https://www.ekonomim.com/rss", "https://www.trthaber.com/ekonomi_articles.rss", "https://www.aa.com.tr/tr/rss/default?cat=ekonomi",
    "https://www.haberturk.com/rss/ekonomi.xml", "https://www.hurriyet.com.tr/rss/ekonomi", "https://www.sozcu.com.tr/feeds-rss-category-ekonomi", "https://www.yenisafak.com/rss?xml=ekonomi",
    "https://www.milliyet.com.tr/rss/rssnew/ekonomi.xml", "https://www.ahaber.com.tr/rss/ekonomi.xml"] + W_FEEDS[:6]
W_EX = r"Süper L[iİ]g|\bmaç|teknik direktör|transfer|\bgol\b|UEFA|FIFA|dizi(?:si|nin)?\b|fragman|\bbölüm\b|burç|loto|kaç yaş|evli mi|nereli|kimdir|saat kaçta|hangi kanalda"
GLOBAL_ECON = (r"küresel (?:piyasa|ekonomi|büyüme|borsa|ticaret)|\bFed\b|ECB|Avrupa Merkez Bankas|BoJ|BoE|İngiltere Merkez Bankas|Japonya Merkez Bankas|Wall Street|Nasdaq|Dow Jones|S&P 500|"
               r"Nikkei|DAX|FTSE|Stoxx|Brent|OPEC|\bIMF\b|Dünya Bankas|resesyon|gümrük vergi|tarife|ticaret savaş|Çin ekonomi|ABD ekonomi|Euro Bölgesi|avro bölgesi|dolar endeks|ons alt[ıi]n|kripto|Bitcoin")
def wt(cat, mn=16, cap=16, per=4, age=7):
    return dict(site=WD, cat=cat, feeds=W_FEEDS, match=None, exclude=W_EX, src_cats=[cat], min=mn, per_run=per, max_age=age, fill_cap=cap)
world = [dict(site=WD, cat="dunya-ekonomisi", feeds=W_ECON_FEEDS, match=GLOBAL_ECON, exclude=W_EX + r"|asgari ücret|memur|emekli|SGK|Borsa İstanbul|BIST", min=14, per_run=3, max_age=7, fill_cap=14)] + \
    [wt(c) for c in ("orta-dogu", "avrupa", "asya", "kuzey-amerika")] + [wt("afrika", age=14), wt("guney-amerika", age=14), wt("okyanusya", mn=10, cap=10, per=2, age=21)]

ALL = memur + turk + world
import re
for t in ALL:
    for k in ("match", "exclude"):
        if t.get(k): re.compile(t[k], re.I)
json.dump(ALL, open("targets-ns25.json", "w"), ensure_ascii=False, indent=1)
print(len(ALL), "targets;", len({f for t in ALL for f in t["feeds"]}), "feeds")
