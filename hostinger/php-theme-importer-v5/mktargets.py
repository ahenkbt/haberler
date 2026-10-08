import urllib.parse
import json
HT=lambda tag,match=None:{"url":"https://rss.haberler.com/RssNew.aspx?kategori="+urllib.parse.quote(tag),"match":match}
HP="https://rss.haberler.com/RssNew.aspx?kategori=politika"
TRG="https://www.trthaber.com/gundem_articles.rss"; TRT="https://www.trthaber.com/turkiye_articles.rss"; TRD="https://www.trthaber.com/dunya_articles.rss"
TRE="https://www.trthaber.com/ekonomi_articles.rss"; HUR="https://www.hurriyet.com.tr/rss/gundem"; NTVT="https://www.ntv.com.tr/turkiye.rss"; NTVD="https://www.ntv.com.tr/dunya.rss"
YSG="https://www.yenisafak.com/rss?xml=gundem"; YSD="https://www.yenisafak.com/rss?xml=dunya"; LGS="https://www.lidergundem.com.tr/rss/siyaset.xml"
C=lambda c:"https://cumha.com.tr/rss/category/"+c
L=lambda c:"https://cumha.com.tr/rss/lokasyon/"+c
HG="https://rss.haberler.com/RssNew.aspx?kategori=guncel"; HD="https://rss.haberler.com/RssNew.aspx?kategori=dunya"; HY="https://rss.haberler.com/RssNew.aspx?kategori=yerel"
HURD="https://www.hurriyet.com.tr/rss/dunya"
WORLD=[HD,HURD,TRD,NTVD,YSD,L("dunya"),"https://www.cnnturk.com/feed/rss/dunya/news"]
CITIES=[L(c) for c in ("istanbul","ankara","izmir","bursa","antalya","konya","kocaeli","gaziantep","samsun","kayseri","eskisehir","trabzon","adana","mersin","denizli","sakarya")]
NAT=[TRG,TRT,HUR,NTVT,YSG,HP]
T=[]
def add(site,cat,feeds,match=None,mn=12,per=4,age=21,exclude=None,title_only=False):
    T.append(dict(site=site,cat=cat,feeds=feeds,match=match,exclude=exclude,min=mn,per_run=per,max_age=age,title_only=title_only))
POL=r"(parti|milletvekili|TBMM|meclis|genel başkan|il başkan|ilçe başkan|AK Parti|CHP|MHP|İYİ Parti|DEM Parti|Yeni Parti|DEVA|Saadet|Yeniden Refah|BBP|muhalefet|iktidar|kanun teklifi|seçim)"
# ---- site 230 = turkatahaber; its rows are the shared pool (also yerel.net.tr; stk also vatanhaber) ----
for s in (230,):
    add(s,"siyaset",[HP,LGS,{"url":TRG,"match":POL},{"url":HUR,"match":POL},{"url":YSG,"match":POL}],None,15,5)
    add(s,"kamu",[{"url":C("kamu-kurumlari-ve-ust-kurullar"),"match":None},{"url":C("bakanliklar"),"match":None},
                  {"url":"https://rss.haberler.com/RssNew.aspx?kategori=memur","match":None},{"url":"https://rss.haberler.com/RssNew.aspx?kategori=sgk","match":None},
                  TRG,HUR,YSG,NTVT],
        r"(memur|kamu |kamuda|kamu personel|SGK|emekli|bakanlığı|bakanlık|Resmi Gazete|TÜİK|ÖSYM|KPSS|atama|personel alım|e-Devlet|Diyanet|AFAD|TOKİ|İŞKUR|asgari ücret|vergi|maaş|zam|genelge|yönetmelik)",15,5)
    add(s,"stk",[{"url":C("sivil-toplum-kuruluslari"),"match":None},{"url":"https://rss.haberler.com/RssNew.aspx?kategori=dernek","match":r"(dernek|vakf|vakıf|sivil toplum|STK|federasyon|konfederasyon|oda başkan|odası|birliği|gönüllü|yardım kampanya|Kızılay|Yeşilay|TEMA|LÖSEV|İHH|TOBB|TESK)"},
                 {"url":TRG,"match":r"(dernek|vakf|vakıf|sivil toplum|STK|Kızılay|Yeşilay|gönüllü)"},{"url":HUR,"match":r"(dernek|vakf|vakıf|sivil toplum|STK|Kızılay|Yeşilay|gönüllü)"}],None,15,5)
    add(s,"belediye",[*CITIES,HY,HG,{"url":"https://rss.haberler.com/RssNew.aspx?kategori=belediye","match":None},C("yerel-yonetimler"),C("buyuksehir-ve-iller"),C("ilceler"),TRT,HUR,YSG,NTVT],r"belediye",15,5)
    add(s,"uluslararasi-kuruluslar",WORLD+[TRG,HUR],r"(\bBM\b|Birleşmiş Milletler|NATO|\bAB\b|Avrupa Birliği|AGİT|İslam İşbirliği|\bİİT\b|Türk Devletleri Teşkilatı|\bTDT\b|DSÖ|Dünya Sağlık Örgütü|UNESCO|UNICEF|UNHCR|\bIMF\b|Dünya Bankası|\bG20\b|\bG7\b|OECD|Avrupa Konseyi|Uluslararası Ceza|Uluslararası Adalet|Arap Birliği|ASEAN|Şanghay)",12,4,30)
    add(s,"birlesmis-milletler",WORLD+["https://www.aa.com.tr/tr/rss/default?cat=dunya","https://www.aa.com.tr/tr/rss/default?cat=guncel","https://www.aa.com.tr/tr/rss/default?cat=politika",HG,TRG,HUR,{"url":"https://rss.haberler.com/RssNew.aspx?kategori=bm","match":None}],r"(\bBM\b|BM'|Birleşmiş Milletler|UNICEF|UNESCO|UNHCR|UNRWA|DSÖ|Dünya Sağlık Örgütü|Guterres|Güvenlik Konseyi|Dünya Gıda Programı)",12,4,60)
    add(s,"avrupa-birligi",WORLD+[TRG,HUR,TRE,{"url":"https://rss.haberler.com/RssNew.aspx?kategori=avrupa%20birli%C4%9Fi","match":None}],r"(\bAB\b|AB'|Avrupa Birliği|Avrupa Komisyonu|Avrupa Parlamentosu|Brüksel|von der Leyen|Kallas|Avrupa Konseyi Başkanı|Schengen|Gümrük Birliği)",12,4,30)
    add(s,"nato",WORLD+["https://www.aa.com.tr/tr/rss/default?cat=dunya","https://www.aa.com.tr/tr/rss/default?cat=guncel","https://www.aa.com.tr/tr/rss/default?cat=politika",HG,TRG,HUR,{"url":C("nato"),"match":None},{"url":"https://rss.haberler.com/RssNew.aspx?kategori=nato","match":r"NATO|Rutte|ittifak"}],r"(NATO|Rutte)",12,4,60)
    add(s,"roportajlar",[HG,C("latest-posts"),C("toplum-ve-yasam"),C("sivil-toplum-kuruluslari"),TRG,HUR,YSG,NTVT,"https://www.trthaber.com/manset_articles.rss"],
        r"(röportaj|söyleşi|AA muhabirine|muhabirimize|ile konuştu|sorularını yanıtladı|özel açıklama|^[^:]{12,110}: [“\"])",12,4,30)
    add(s,"cumhurbaskanligi",[{"url":C("cumhurbaskanligi"),"match":None},TRG,HUR,YSG,NTVT],r"(Cumhurbaşkanı|Erdoğan|Cumhurbaşkanlığı|Külliye|İletişim Başkan|Cevdet Yılmaz)",12,4,30)
    add(s,"genel-merkez",["https://www.aa.com.tr/tr/rss/default?cat=dunya","https://www.aa.com.tr/tr/rss/default?cat=guncel","https://www.aa.com.tr/tr/rss/default?cat=politika",HG,{"url":C("genel-merkez"),"match":None},HP],r"(Genel Başkan|genel merkez|Genel Sekreter|parti sözcüsü|Parti Sözcüsü|MYK|MKYK)",12,4,30)
    add(s,"il-ilce-baskanliklari",[{"url":C("il-ilce-baskanliklari"),"match":None},HP],r"(il başkan|ilçe başkan|İl Başkan|İlçe Başkan)",12,4,30)
    add(s,"siyasi-partiler",[{"url":C("siyasi-partiler"),"match":None},HP,LGS],POL,12,4,30)
    add(s,"mulki-idare",[{"url":C("mulki-idare"),"match":None},{"url":C("valilikler"),"match":None},{"url":C("kaymakamliklar"),"match":None},TRT,HUR],r"(vali|kaymakam|valilik|valiliği)",12,4,30)
    add(s,"valilikler",[HY,HG,{"url":C("valilikler"),"match":None},TRT,HUR,NTVT],r"(Vali |Valisi|Valiliği|valilik)",12,3,30)
    add(s,"kaymakamliklar",[HT("kaymakam"),HY,HG,{"url":C("kaymakamliklar"),"match":None},TRT,HUR],r"(Kaymakam)",12,3,45)
    add(s,"muhtar",["https://www.aa.com.tr/tr/rss/default?cat=dunya","https://www.aa.com.tr/tr/rss/default?cat=guncel","https://www.aa.com.tr/tr/rss/default?cat=politika",*CITIES,{"url":"https://rss.haberler.com/RssNew.aspx?kategori=muhtar","match":None},HY,HG,TRT,HUR,NTVT,YSG,C("yerel-yonetimler"),C("ilceler"),"https://rss.haberler.com/RssNew.aspx?kategori=belediye"],r"muhtar",12,3,45)
    add(s,"buyuksehir-ve-iller",[*CITIES,{"url":C("buyuksehir-ve-iller"),"match":None},HY,HG],r"Büyükşehir",12,3,30)
    add(s,"ilceler",[*CITIES,{"url":C("ilceler"),"match":None},HY],r"(ilçe|ilçesinde|ilçesi|ilçemiz)",12,3,30)
    add(s,"kamu-kurumlari",[{"url":C("kamu-kurumlari-ve-ust-kurullar"),"match":None}],None,12,3,30)
    add(s,"bakanliklar",[{"url":C("bakanliklar"),"match":None},TRG,HUR],r"(Bakanı|Bakanlığı)",12,3,30)
    add(s,"tbmm",[{"url":C("tbmm"),"match":None},HP,TRG],r"(TBMM|Meclis|milletvekili|Genel Kurul|kanun teklifi)",12,3,30)
    add(s,"sivil-toplum-kuruluslari",[{"url":C("sivil-toplum-kuruluslari"),"match":None},"https://rss.haberler.com/RssNew.aspx?kategori=dernek",HG],r"(dernek|vakf|vakıf|sivil toplum|STK|federasyon|konfederasyon|Kızılay|Yeşilay|gönüllü)",12,3,30)
# ---- gundemi.org family (site-exclusive categories) ----
NATL=[TRT,HUR,NTVT,YSG,TRG]
def city(site,cat,lok,rx,tag=None):
    r=r"(?-i:\b%s)" % rx
    add(site,cat,[{"url":L(lok),"match":None}]+([HT(tag,r)] if tag else [])+NATL,r,12,3,30)
city(1133,"gundemi-ege-izmir","izmir",r"İzmir","izmir"); city(1133,"gundemi-ege-manisa","manisa",r"Manisa","manisa"); city(1133,"gundemi-ege-mugla","mugla",r"(Muğla|Bodrum|Marmaris|Fethiye|Datça|Milas)","muğla")
city(1133,"gundemi-ege-aydin","aydin",r"(Aydın|Kuşadası|Didim|Nazilli|Söke)\b","aydın")
city(1138,"gundemi-guneydogu-diyarbakir","diyarbakir",r"Diyarbakır","diyarbakır"); add(1138,"gundemi-guneydogu-mardin",[{"url":L("mardin"),"match":None},{"url":"https://rss.haberler.com/RssNew.aspx?kategori=mardin","match":None},HY,HG]+NATL,r"Mardin",12,3,45)
city(1139,"gundemi-akdeniz-adana","adana",r"Adana","adana"); city(1139,"gundemi-akdeniz-mersin","mersin",r"Mersin","mersin"); city(1139,"gundemi-akdeniz-hatay","hatay",r"(Hatay|Antakya|İskenderun)","hatay")
KK=["https://www.detaykibris.com/rss","https://www.kibrisgercek.com/rss","https://rss.haberler.com/RssNew.aspx?kategori=k%C4%B1br%C4%B1s","https://www.yeniduzen.com/rss","https://www.kibrisgazetesi.com/rss","https://www.gundemkibris.com/rss","https://www.kibrisgenctv.com/rss",YSD,YSG,HUR,TRD]
add(1140,"gundemi-kibris-lefkosa",KK,r"Lefkoşa",12,3,45)
add(1140,"gundemi-kibris-girne",KK,r"Girne",12,3,45)
add(1140,"gundemi-kibris-gazimagusa",[HT("gazimağusa"),HT("mağusa")]+KK,r"Gazimağusa|Gazi Mağusa",12,3,45)
add(1140,"gundemi-kibris-magosa",[HT("iskele"),HT("mağusa")]+KK,r"Mağusa|Magosa|İskele|Karpaz",12,3,45)
add(1141,"gundemi-apex-gundem",[TRG,HUR,"https://www.trthaber.com/manset_articles.rss"],None,12,3,7)
add(1141,"gundemi-apex-turkiye",[TRT,NTVT,YSG],None,12,3,7)
add(1141,"gundemi-apex-dunya",[TRD,NTVD,YSD],None,12,3,7)
add(1141,"gundemi-apex-ekonomi",[TRE,"https://www.ntv.com.tr/ekonomi.rss"],None,12,3,7)
# ---- fix.tc (tech) ----
SDM="https://shiftdelete.net/mobil/feed"; SDD="https://shiftdelete.net/donanim/feed"; SDO="https://shiftdelete.net/oyun/feed"; SDY="https://shiftdelete.net/yazilim/feed"
WT="https://www.webtekno.com/rss.xml"; DH="https://www.donanimhaber.com/rss/tum/"; TP="https://www.technopat.net/feed/"; CH="https://www.chip.com.tr/rss"
LOG="https://www.log.com.tr/feed/"; DG="https://www.donanimgunlugu.com/feed/"; MK="https://www.merlininkazani.com/rss"; TB="https://www.teknoblog.com/feed/"
TECH=[WT,DH,TP,CH,LOG,DG,TB]
add(1142,"fixhaber-haberler",[WT,DH,TP,CH,"https://shiftdelete.net/feed"],None,18,4,10)
add(1142,"fixhaber-mobil",[{"url":SDM,"match":None}]+TECH,r"(telefon|iPhone|Android|Galaxy|Xiaomi|Huawei|Pixel|OnePlus|Oppo|Vivo|Realme|Honor|tablet|iPad|akıllı saat|Watch|iOS|mobil)",18,4,14,title_only=True)
add(1142,"fixhaber-donanim",[{"url":SDD,"match":None}]+TECH,r"(işlemci|ekran kartı|\bGPU|\bCPU|\bRTX|Radeon|NVIDIA|\bAMD\b|Intel|Ryzen|Snapdragon|\bRAM\b|\bSSD|anakart|laptop|dizüstü|notebook|monitör|MacBook|Mac mini|masaüstü|donanım|klavye|kulaklık|router|modem)",18,4,14,title_only=True)
add(1142,"fixhaber-incelemeler",[{"url":"https://shiftdelete.net/inceleme/feed","match":None}]+TECH+[SDM,SDD],r"(inceleme|incelemesi|kutu açılış|test ettik|ilk bakış|deneyimledik|karşılaştırma|hangisi daha|kullanıcı deneyimi|performans testi)",18,4,30,title_only=True)
add(1142,"fixhaber-yazilim",[{"url":SDY,"match":None}]+TECH,r"(yazılım|uygulama|güncelleme|Windows|macOS|Linux|Android \d|iOS \d|WhatsApp|Instagram|Chrome|Google|yapay zeka|ChatGPT|Gemini|Copilot|Microsoft|uygulaması)",18,4,14,title_only=True)
add(1142,"fixhaber-oyun",[{"url":"https://www.atarita.com/feed/","match":None},HT("playstation",r"(oyun|PlayStation|PS5|Xbox|Nintendo|Switch|Steam|Epic Games|GTA|FIFA|EA Sports|Valorant|League of Legends)"),HT("xbox",r"(oyun|PlayStation|PS5|Xbox|Nintendo|Switch|Steam|Epic Games|GTA|FIFA|EA Sports|Valorant|League of Legends)"),HT("steam",r"(oyun|PlayStation|PS5|Xbox|Nintendo|Switch|Steam|Epic Games|GTA|FIFA|EA Sports|Valorant|League of Legends)"),HT("oyun",r"(oyun|PlayStation|PS5|Xbox|Nintendo|Switch|Steam|Epic Games|GTA|FIFA|EA Sports|Valorant|League of Legends)"),{"url":SDO,"match":None}]+TECH,r"(oyun|PlayStation|PS5|Xbox|Nintendo|Switch|Steam|Epic Games|GTA|FIFA|EA Sports|Valorant|League of Legends)",18,4,14,title_only=True)

# ---- 20:00-20:20 user rules: subcategory tree, provinces/regions, cross-distribution (classifier-based strict rules) ----
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import classifier as CL
AA=["https://www.aa.com.tr/tr/rss/default?cat=guncel","https://www.aa.com.tr/tr/rss/default?cat=politika","https://www.aa.com.tr/tr/rss/default?cat=ekonomi"]
GEN=[TRG,TRT,HUR,NTVT,YSG,HG,HP,C("bakanliklar"),C("latest-posts")]+AA
def addr(site,cat,feeds,rule,mn=10,per=3,age=30,title_only=False,**kw):
    T.append(dict(site=site,cat=cat,feeds=feeds,match=None,exclude=None,min=mn,per_run=per,max_age=age,title_only=title_only,cat_rule=rule,**kw))
MIN_TAGS={"bakanlik-aile":["aile","sosyal hizmetler"],"bakanlik-saglik":["sağlık bakanlığı","sağlık"],"bakanlik-milli-egitim":["milli eğitim","meb"],
  "bakanlik-icisleri":["içişleri","yerlikaya"],"bakanlik-adalet":["adalet bakanlığı","yargı"],"bakanlik-disisleri":["dışişleri","hakan fidan"],
  "bakanlik-hazine":["mehmet şimşek","hazine"],"bakanlik-calisma":["çalışma bakanlığı","sgk"],"bakanlik-tarim":["tarım","yumaklı"],
  "bakanlik-ulastirma":["ulaştırma","uraloğlu"],"bakanlik-enerji":["enerji","alparslan bayraktar"],"bakanlik-sanayi":["sanayi","kacır"],
  "bakanlik-cevre":["murat kurum","çevre"],"bakanlik-ticaret":["ticaret bakanlığı","ömer bolat"],"bakanlik-kultur-turizm":["turizm","kültür"],
  "bakanlik-genclik-spor":["gençlik ve spor","osman aşkın bak"],"bakanlik-msb":["msb","milli savunma"]}
for cat,tags in MIN_TAGS.items():
    addr(230,cat,GEN+[HT(t) for t in tags],cat,10,3,30)
SEC=[HT("jandarma"),HT("emniyet"),HT("polis"),HT("tsk"),HT("msb"),HT("savunma sanayii"),HT("aselsan"),"https://www.trthaber.com/savunma_articles.rss" if False else TRG,
     "https://www.savunmasanayist.com/feed/","https://www.defenceturk.net/feed","db:233","db:232"]
addr(230,"guvenlik",SEC+GEN,"guvenlik",10,3,21,title_only=True)
addr(230,"tsk",SEC+GEN,"tsk",10,3,21,title_only=True)
addr(230,"emniyet",SEC+GEN,"emniyet",10,3,21,title_only=True)
addr(230,"jandarma",SEC+GEN,"jandarma",10,3,30,title_only=True)
addr(230,"savunma-sanayi",SEC+GEN,"savunma-sanayi",10,3,30)
addr(230,"toplum-ve-yasam",[C("toplum-ve-yasam"),HG,TRG,HUR,YSG],None,10,3,21,topic="kultur")
# cross-distribution from topic sites into the shared pool (one story -> one category; dedupe per site)
addr(230,"saglik",["db:237","https://www.trthaber.com/saglik_articles.rss"],None,10,3,7)
addr(230,"teknoloji",["db:1142"],None,10,3,7)
addr(230,"gundem",["db:236"],None,0,2,5,topic="cevre")
addr(230,"bakanlik-tarim",["db:236"],"bakanlik-tarim",0,2,7)
# Yerel: provinces (category = province slug, region_key tr-<slug>) and regions (bolge-*) on the shared pool and on yerel.net.tr
RG={"marmara":"bolge-marmara","ege":"bolge-ege","akdeniz":"bolge-akdeniz","icanadolu":"bolge-ic-anadolu","karadeniz":"bolge-karadeniz","doguanadolu":"bolge-dogu-anadolu","guneydogu":"bolge-guneydogu-anadolu"}
for reg,bslug in RG.items():
    provs=CL.REGIONS[reg].split()
    pf=[]
    for p in provs:
        slug=CL._slugify(p)
        feeds=[L(slug),HT(CL.tr_lower(p)),"db:231"]
        for site in (230,231):
            T.append(dict(site=site,cat=slug,feeds=feeds+([HY] if site==230 else []),match=None,exclude=None,min=10,per_run=3,max_age=30,title_only=False,city=p,fill_cap=10))
        pf.append(L(slug))
    for site in (230,231):
        T.append(dict(site=site,cat=bslug,feeds=pf+[HY,"db:231"],match=None,exclude=None,min=10,per_run=3,max_age=21,title_only=False,region=reg,fill_cap=10))
# turkatahaber yerel-yonetimler: ONLY belediye/muhtar (Cumha + haberler.com listing pages), source credited via source_name
addr(230,"yerel-yonetimler",["scrape:https://www.haberler.com/belediye/","scrape:https://www.haberler.com/muhtar/",C("yerel-yonetimler"),C("belediye"),C("muhtar"),HT("belediye"),HT("muhtar")],"yerel-yonetimler",20,4,21)

# regional gundemi.org sites without own menus: province slugs of their region only (home = own pool, hmNewsRssSources=[])
for sid,reg in ((1134,"marmara"),(1135,"karadeniz"),(1136,"icanadolu"),(1137,"doguanadolu")):
    for p in CL.REGIONS[reg].split():
        slug=CL._slugify(p)
        T.append(dict(site=sid,cat=slug,feeds=[L(slug),HT(CL.tr_lower(p)),HY,"db:231"],match=None,exclude=None,min=6,per_run=2,max_age=21,title_only=False,city=p,fill_cap=6))

json.dump(T,open("targets.json","w"),ensure_ascii=False,indent=1)
print(len(T))
