
# newsites25 2026-10-08: memur.gundemi.org 1147, turkdunyasi.gundemi.org 1148, world.fix.tc 1149 (personas: newsites25/yazar/personas25.py)
SITES.update({
    1147: dict(site="Memur Gündemi (kamu personeli, memurlar ve kamu çalışanları sitesi)",
               note="Yazı MUTLAKA kamu personeli ve memurların dünyasıyla ilgili olsun: memurluk statüsü ve özlük hakları, toplu sözleşme ve sendikal haklar "
                    "(kavramsal), KPSS ve kamuda kariyer, öğretmenler ve kamu çalışanlarının mesleki hayatı, emeklilik planlaması, kamu hizmeti etiği ve çalışma hayatı. "
                    "Bu alanın dışında konu SEÇME. Maaş tutarı, zam oranı, puan, kontenjan, madde numarası ya da tarih UYDURMA; güncel hükmü resmi kaynaktan kontrol etmeyi öner.",
               terms=re.compile(r"(?i)(memur|kamu|personel|devlet|kurum|toplu sözleşme|sendika|kpss|sınav|atama|kadro|tayin|özlük|izin|mesai|emekli|"
                                r"maaş|öğretmen|hizmet|görev|kariyer|mevzuat|hak|çalışan|sicil|ünvan|unvan|yükselme)"), min=5,
               core=re.compile(r"(?i)(memur|kamu|personel|toplu sözleşme|sendika|kpss|atama|kadro|özlük|emekli|öğretmen|kamu hizmet|devlet memur|sınav|ösym|kariyer|tercih)"), core_min=3,
               check="kamu personeli ve memurlar (memurluk ve özlük hakları, toplu sözleşme ve sendikal haklar, KPSS ve kamuda kariyer, öğretmenler, emeklilik, kamu hizmeti ve çalışma hayatı)",
               mod_note="Memurların özlük hakları, toplu sözleşme ve sendikacılığın KAVRAMSAL anlatımı SİYASİ SAYILMAZ (sitenin konusudur); belirli parti, sendika ya da hükümet övgüsü/eleştirisi siyasidir."),
    1148: dict(site="Türk Dünyası Gündemi (Türk devletleri, Orta Asya, Azerbaycan, Balkanlar, Avrupa Türkleri, Türk tarihi ve kültürü sitesi)",
               note="Yazı MUTLAKA Türk dünyasıyla ilgili olsun: Türk tarihi, Türk dili ve lehçeleri, Orta Asya ve Türk cumhuriyetlerinin kültürü, Azerbaycan, KKTC, "
                    "Balkanlar ve Rumeli mirası, Kırım, Kafkasya ve Avrupa Türkleri, destanlar, halk kültürü ve gelenekler. Bu alanın dışında konu SEÇME. "
                    "Güncel siyaset, devletler arası polemik ve yaşayan siyasetçi adı YOK.",
               terms=re.compile(r"(?i)(türk|türkistan|orta asya|azerbaycan|kazak|özbek|kırgız|türkmen|uygur|tatar|gagavuz|kırım|kafkas|balkan|rumeli|"
                                r"bosna|kosova|osmanlı|selçuklu|göktürk|orhun|hun|destan|nevruz|lehçe|dil|kültür|gelenek|miras|tarih|bozkır|ipek yolu|semerkant|buhara)"), min=5,
               core=re.compile(r"(?i)(türk dünya|türk tarih|türk dil|türk kültür|orta asya|türkistan|azerbaycan|kazak|özbek|kırgız|türkmen|uygur|tatar|gagavuz|kırım|"
                               r"balkan|rumeli|osmanlı|selçuklu|göktürk|orhun|dede korkut|manas|nevruz|kktc|kıbrıs türk|soydaş|lehçe)"), core_min=3,
               check="Türk dünyası (Türk tarihi, Türk dili ve lehçeleri, Orta Asya ve Türk cumhuriyetleri, Azerbaycan, Balkanlar, Kırım, Kafkasya ve Avrupa Türkleri, Türk halk kültürü ve gelenekleri)",
               mod_note="Türk dünyasının ortak tarihini, dilini ve kültürünü anlatmak, Türk birliği ve kardeşlik vurgusu KAVRAMSAL olarak SİYASİ SAYILMAZ (sitenin konusudur)."),
    1149: dict(site="Dünya Gündemi (world.fix.tc; kıtalara göre dünya haberleri sitesi)",
               note="Yazı MUTLAKA dünyayla ilgili olsun ve senin uzmanlık alanındaki kıta ya da konuda kalsın: dünya şehirleri, kültürleri, tarihi, coğrafyası, "
                    "medeniyetleri, seyahat kültürü ya da küresel ekonominin kavramları. Türkiye iç gündemi SEÇME. Güncel siyaset, savaş ve çatışma yorumu, "
                    "yaşayan siyasetçi adı, rakam, tahmin ve yatırım tavsiyesi YOK.",
               terms=re.compile(r"(?i)(dünya|küresel|kıta|avrupa|asya|afrika|amerika|latin|okyanus|akdeniz|orta doğu|uzak doğu|ülke|şehir|kültür|medeniyet|"
                                r"tarih|coğrafya|gelenek|seyahat|miras|ekonomi|ticaret|para|liman|dil|halk|müze|mimari)"), min=5,
               check="dünya (kıtaların kültürü, tarihi, şehirleri ve coğrafyası, medeniyetler, seyahat kültürü ya da küresel ekonominin kavramları)",
               mod_note=""),
})
