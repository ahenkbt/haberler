"""ekonomi 2026-10-10: catfill hedefleri (importer-v5) — ekonomi.gundemi.org. Sıra önemli: bir haber bir kategoriye girer, ÖZEL olan önce, geniş olan sonda.
Yalnızca gerçek RSS kaynakları (HTTP 200 doğrulandı 2026-10-10). Yeniden yazım/atıf/imza/tekilleştirme: rssrewrite cron'u portal_rss_items'ın tamamına uygulanır."""
def wb(x): return r"(?<!\w)(?:%s)" % x
CRIME = (r"öldür|cinayet|silahl[ıi] sald[ıi]r|vuruldu|vurularak|b[ıi]çak|ceset|cesed|cansız beden|tutukland|gözalt|kazada|kazas[ıi]|trafik kazas|yaraland|intihar|taciz|istismar|"
         r"tecavüz|uyuşturucu|fuhuş|firari|hapis cezas|darp|kavga|hayat[ıi]n[ıi] kaybet|cenaze|vefat|toprağa veril")
SPORT = r"Süper L[iİ]g|futbol|\bmaç|teknik direktör|Galatasaray|Fenerbahçe|Beşiktaş|Trabzonspor|milli tak[ıi]m|basketbol|voleybol|\bgol\b|UEFA|FIFA"
MAG = r"dizi(?:si|nin)?\b|fragman|şark[ıi]c[ıi]|oyuncu|ünlü|burç|loto|piyango|kaç yaş|evli mi|kimdir|sevgili|magazin|bikini|nikah|boşan|MasterChef|Survivor|hutbe|namaz vakti|hava durumu|nöbetçi eczane"
POL = r"Özgür Özel|Özdağ|Bahçeli|İmamoğlu|Netanyahu|Arakçi|Gazze|İsrail|soykırım|Zafer Partisi|belediye başkan[^ ]* .{0,40}(?:tutuklan|görevden)|Switchblade|CHP'?li|AK Parti'?li|MHP'?li|İYİ Parti'?li|DEM Parti'?li|kurultay|seçim anket|iftira|veryansın|istifa çağr"
EX = "|".join([CRIME, SPORT, MAG, POL])

def L(*xs): return list(dict.fromkeys(xs))
GEN = L("https://www.bloomberght.com/rss", "https://www.dunya.com/rss?dunya", "https://www.ekonomim.com/rss", "https://www.aa.com.tr/tr/rss/default?cat=ekonomi",
        "https://www.trthaber.com/ekonomi_articles.rss", "https://www.haberturk.com/rss/ekonomi.xml", "https://www.hurriyet.com.tr/rss/ekonomi",
        "https://www.sabah.com.tr/rss/ekonomi.xml", "https://www.ntv.com.tr/ekonomi.rss", "https://www.ntv.com.tr/ntvpara.rss", "https://www.yenisafak.com/rss?xml=ekonomi",
        "https://rss.haberler.com/RssNew.aspx?kategori=ekonomi", "https://www.cnnturk.com/feed/rss/ekonomi/news", "https://www.milliyet.com.tr/rss/rssnew/ekonomi.xml",
        "https://www.sozcu.com.tr/feeds-rss-category-ekonomi", "https://www.cumhuriyet.com.tr/rss/ekonomi.xml", "https://www.ekonomidunya.com/rss", "https://www.ticarihayat.com/rss",
        "https://tr.investing.com/rss/news.rss", "https://tr.investing.com/rss/news_25.rss", "https://tr.investing.com/rss/news_95.rss", "https://www.borsagundem.com/rss")
CRYPTO = L("https://coinkolik.com/feed", "https://kriptoparahaber.com/feed", "https://www.bitcoinsistemi.com/feed", "https://www.kriptokoin.com/feed")
GENEL = L("https://www.trthaber.com/gundem_articles.rss", "https://www.ntv.com.tr/gundem.rss", "https://www.ntv.com.tr/turkiye.rss", "https://www.sabah.com.tr/rss/anasayfa.xml")

# (kategori, feeds, match, min, per_run, max_age, fill_cap)
SPEC = [
 ("eko-kripto", CRYPTO + GEN, r"bitcoin|kripto|ethereum|altcoin|blockchain|\bBTC\b|\bETH\b|\bcoin\b|binance|stablecoin|dogecoin|solana|ripple|\bXRP\b|NFT|dijital varl[ıi]k|token", 14, 3, 30, 15),
 ("eko-altin", GEN, r"alt[ıi]n(?:[ıi]n|[ıi]nda)?(?![a-zçğıöşü])|gümüş|\bons\b|değerli (?:maden|metal)|kuyumcu|platin|paladyum|emtia|bak[ıi]r fiyat|çeyrek|cumhuriyet alt[ıi]n|külçe", 14, 3, 30, 15),
 ("eko-doviz", GEN, r"dolar|euro\b|sterlin|döviz|\bkur\b|kurlar|parite|Türk lirası|\bUSD\b|\bEUR\b|rezerv|swap|TL'?nin", 14, 3, 30, 15),
 ("eko-borsa", GEN, r"borsa|\bBIST\b|hisse|endeks|halka arz|temettü|bilanço|yatırımc[ıi]|Borsa İstanbul|\bSPK\b|yatırım fon|Wall Street|Nasdaq", 14, 3, 30, 15),
 ("eko-banka-finans", GEN, r"banka|kredi|faiz|\bTCMB\b|Merkez Bankas|\bPPK\b|\bBDDK\b|mevduat|sigorta|kredi kart|finans|katılım|tahvil|bono|sukuk|fintech", 14, 3, 30, 15),
 ("eko-makro", GEN, r"enflasyon|\bTÜİK\b|büyüme|işsizlik|cari (?:aç[ıi]k|denge)|bütçe|Hazine ve Maliye|Şimşek|\bOVP\b|\bGSYH\b|asgari ücret|emekli|maaş|zam\b|vergi|\bSGK\b|memur|kamu (?:ala|har)", 14, 3, 30, 15),
 ("eko-enerji", GEN, r"enerji|petrol|brent|doğalgaz|doğal gaz|elektrik|BOTAŞ|EPDK|akaryak[ıi]t|benzin|motorin|nükleer|güneş enerji|rüzgar|OPEC|LNG|rafineri", 14, 3, 30, 15),
 ("eko-emlak", GEN, r"konut|emlak|gayrimenkul|kira\b|kiralar|TOKİ|arsa|tapu|inşaat|müteahhit|kentsel dönüşüm|mortgage", 14, 3, 45, 15),
 ("eko-tarim", GEN, r"tar[ıi]m|çiftçi|hububat|buğday|\bTMO\b|gıda|süt |fındık|zeytin|hayvanc[ıi]l|tohum|gübre|hasat|üretici fiyat", 14, 3, 45, 15),
 ("eko-sanayi-ihracat", GEN, r"ihracat|ithalat|sanayi|üretim|\bOSB\b|\bTİM\b|dış ticaret|\bPMI\b|kapasite kullan|otomotiv|organize sanayi|lojistik|gümrük", 14, 3, 30, 15),
 ("eko-dunya", GEN, r"\bFed\b|\bECB\b|Avrupa Merkez|ABD ekonomi|Çin ekonomi|\bIMF\b|Dünya Bankas|G20|küresel|Almanya ekonomi|Japonya|gümrük tarife|ticaret savaş|OECD", 14, 3, 30, 15),
 ("eko-teknoloji", GEN, r"girişim|startup|yapay zek|teknoloji|fintech|e-ticaret|dijital|yazılım|siber|bulut|çip|yar[ıi] iletken", 12, 3, 45, 12),
 ("eko-is-dunyasi", GEN, r"\bTOBB\b|\bTİM\b|MÜSİAD|TÜSİAD|ticaret odas|sanayi odas|esnaf|\bKOBİ\b|KOSGEB|atama|teşvik|istihdam|iş insan|iş dünyas|girişimci", 12, 3, 45, 12),
 ("eko-sirketler", GEN, r"şirket|holding|\bA\.Ş\.|genel müdür|\bCEO\b|satın alma|birleşme|ortakl[ıi]k|tesis|fabrika|yat[ıi]r[ıi]m|ürün|marka|pazar pay", 15, 3, 21, 15),
 ("eko-genel-gundem", GENEL, None, 10, 2, 14, 10),
 ("eko-gundem", GEN, None, 20, 4, 14, 20),
]

def build(site):
    out = []
    for cat, feeds, match, mn, per, age, cap in SPEC:
        m = None if match is None else wb(match)
        if cat == "eko-genel-gundem":  # genel gündem: ekonomi/iş/finans bağlantısı olanlar
            m = wb(r"ekonomi|ekonomik|piyasa|borsa|dolar|enflasyon|faiz|vergi|maaş|zam\b|bütçe|yatırım|ihracat|üretim|istihdam|Hazine|Merkez Bankas|asgari ücret|emekli|akaryak[ıi]t|elektrik|doğalgaz|konut|kira\b")
        d = dict(site=site, cat=cat, feeds=feeds, match=m, exclude=EX, min=mn, per_run=per, max_age=age, fill_cap=cap)
        if m is not None:
            d['title_only'] = True  # konu eşleşmesi yalnız BAŞLIKTA (gövdedeki tesadüfi kelimelerle yanlış kategori olmasın)
        out.append(d)
    return out
