"""newsites25 2026-10-08: 3 new news sites (TP rows + categories + editor accounts). Source of truth for SQL + edge seed."""
import json, copy
BASE = json.load(open('/workspace/concept/spor-layout.json'))
for k in ['hmNewsRssCategoryOnly', 'hmNavOnlyCategorySlugs', 'hmCategorySortSlugs', 'hmCorporateMenuItems',
          'hmNewsHomeModuleCategorySlugs', 'hmNewsTopicPriority', 'logoUrl', 'faviconUrl', 'hmYsSlogan',
          'hmPrimaryColor', 'hmSecondaryColor', 'hmYsMansetPreset', 'hmNewsYsMansetLayout', 'hmCatTree',
          'hmConceptTopic', 'hmYsKunye']:
    BASE.pop(k, None)
KUNYE = json.load(open('/workspace/concept/spor-layout.json'))['hmYsKunye']
CONTACT = {"phone": "0532 229 18 92", "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"}

SITES = [
 dict(slug='memur', domain='memur.gundemi.org', domain2='memur.fix.tc', name='Memur Gündemi', email='memur@gundemi.org',
      yayin='MEMUR GÜNDEMİ', topic='memur', logo='memur-gundemi',
      desc='Memur maaşı, zam, toplu sözleşme, atama, kadro, KPSS, emeklilik, özlük hakları, sendikalar ve kamu personel mevzuatı: kamu çalışanlarının gündemi.',
      slogan='Kamu personelinin gündemi burada.', primary='#1f3a68', secondary='#b91c1c', preset='nefes', stil='izgara',
      cats=[('memur-maas-zam', 'Maaş ve Zam'), ('toplu-sozlesme', 'Toplu Sözleşme'), ('atama-kadro', 'Atama ve Kadro'),
            ('kpss', 'KPSS ve Sınavlar'), ('personel-alimi', 'Personel Alımı'), ('memur-emeklilik', 'Emeklilik'),
            ('ozluk-haklari', 'Özlük Hakları'), ('sendikalar', 'Sendikalar'), ('personel-mevzuati', 'Mevzuat ve Resmî Gazete')],
      menu=[('Maaş ve Zam', 'memur-maas-zam'), ('Toplu Sözleşme', 'toplu-sozlesme'), ('Atama ve Kadro', 'atama-kadro'), ('KPSS', 'kpss'),
            ('Personel Alımı', 'personel-alimi'), ('Emeklilik', 'memur-emeklilik'), ('Özlük Hakları', 'ozluk-haklari'),
            ('Sendikalar', 'sendikalar'), ('Mevzuat', 'personel-mevzuati'), ('Özel Haber', 'ozel-haber')],
      keywords=['memur', 'kamu personel', 'kamu çalışan', 'toplu sözleşme', 'maaş', 'zam', 'kpss', 'atama', 'kadro', 'sendika', 'emekli', 'özlük'],
      most='memur-maas-zam', gallery='atama-kadro'),
 dict(slug='turkdunyasi', domain='turkdunyasi.gundemi.org', domain2='turkdunyasi.fix.tc', name='Türk Dünyası Gündemi', email='turkdunyasi@gundemi.org',
      yayin='TÜRK DÜNYASI GÜNDEMİ', topic='turk-dunyasi', logo='turkdunyasi-gundemi',
      desc='Türk devletleri, Orta Asya, Azerbaycan, KKTC, Türk Devletleri Teşkilatı, Balkanlar ve Avrupa Türkleri; Türk tarihi ve kültürü üzerine haberler.',
      slogan='Adriyatik’ten Çin Seddi’ne Türk dünyasının gündemi.', primary='#0a7ea4', secondary='#c99a2e', preset='mynet', stil='kapak',
      cats=[('turk-devletleri', 'Türk Devletleri'), ('orta-asya', 'Orta Asya'), ('azerbaycan', 'Azerbaycan'), ('tdt', 'TDT'),
            ('balkanlar', 'Balkanlar'), ('avrupa-turkleri', 'Avrupa Türkleri'), ('kirim-kafkasya', 'Kırım ve Kafkasya'),
            ('dogu-turkistan', 'Doğu Türkistan'), ('turk-tarihi', 'Tarih'), ('turk-kulturu', 'Kültür')],
      menu=[('Türk Devletleri', 'turk-devletleri'), ('Orta Asya', 'orta-asya'), ('Azerbaycan', 'azerbaycan'), ('Balkanlar', 'balkanlar'),
            ('Avrupa Türkleri', 'avrupa-turkleri'), ('Kırım ve Kafkasya', 'kirim-kafkasya'), ('Doğu Türkistan', 'dogu-turkistan'),
            ('Tarih', 'turk-tarihi'), ('Kültür', 'turk-kulturu'), ('TDT', 'tdt'), ('Özel Haber', 'ozel-haber')],
      keywords=['türk dünyası', 'türk devletleri', 'azerbaycan', 'kazakistan', 'özbekistan', 'kırgızistan', 'türkmenistan', 'kktc', 'balkan', 'kırım', 'gagavuz', 'türk tarihi'],
      most='turk-devletleri', gallery='turk-kulturu'),
 dict(slug='world', domain='world.fix.tc', domain2=None, name='Dünya Gündemi', email='world@fix.tc',
      yayin='DÜNYA GÜNDEMİ', topic='dunya', logo='world-fix', worldDateline=True,
      desc='Avrupa’dan Asya’ya, Orta Doğu’dan Amerika’ya kıta kıta dünya gündemi: TurkAta News dünya haberleri.',
      slogan='Kıta kıta dünyanın gündemi.', primary='#0f4c5c', secondary='#e36414', preset='sabah', stil='serit',
      cats=[('avrupa', 'Avrupa'), ('asya', 'Asya'), ('orta-dogu', 'Orta Doğu'), ('afrika', 'Afrika'), ('kuzey-amerika', 'Kuzey Amerika'),
            ('guney-amerika', 'Güney Amerika'), ('okyanusya', 'Okyanusya'), ('dunya-ekonomisi', 'Dünya Ekonomisi')],
      menu=[('Avrupa', 'avrupa'), ('Asya', 'asya'), ('Orta Doğu', 'orta-dogu'), ('Afrika', 'afrika'), ('Kuzey Amerika', 'kuzey-amerika'),
            ('Güney Amerika', 'guney-amerika'), ('Okyanusya', 'okyanusya'), ('Dünya Ekonomisi', 'dunya-ekonomisi'), ('Özel Haber', 'ozel-haber')],
      keywords=[], most='avrupa', gallery='asya'),
]

def layout(s, ver='1'):
    L = copy.deepcopy(BASE)
    own = [c for c, _ in s['cats']]
    marka = '/gundemi/marka/' + s['logo']
    L.update({
        'hmSiteKind': 'news', 'frontend': 'php', 'phpTheme': True, 'hybridRssEnabled': False, 'showPlatformNav': False,
        'logoUrl': f'{marka}.png?v={ver}', 'faviconUrl': f'{marka}-icon-512.png?v={ver}',
        'hmYsSlogan': s['slogan'], 'hmPrimaryColor': s['primary'], 'hmSecondaryColor': s['secondary'],
        'hmYsMansetPreset': s['preset'], 'hmNewsYsMansetLayout': s['preset'],
        'hmYsMansetStil': s['stil'], 'hmYsMansetStilBase': s['preset'],
        'hmCatTree': 'off', 'hmConceptSite': True, 'hmConceptTopic': s['topic'],
        'hmNewsYsStandingsEnabled': False, 'hmNewsYsSportsHoroscopeEnabled': False, 'hmNewsYsHoroscopeEnabled': False,
        'hmNewsYsAuthorsEnabled': True, 'hmNewsAuthorsEnabled': True,
        'hmNewsRssSources': [0],
        'hmNavOnlyCategorySlugs': own + ['ozel-haber'],
        'hmCategorySortSlugs': own,
        'hmCorporateMenuItems': [{'id': f'm{i+1}', 'label': lab, 'href': f'/kategori/{slug}', 'parentId': '', 'enabled': True}
                                 for i, (lab, slug) in enumerate(s['menu'])],
        'hmNewsHomeModuleCategorySlugs': {'ysMostRead': s['most'], 'ysGallery': s['gallery']},
        'hmNewsTopicPriority': {'days': 3, 'blocks': True, 'categories': own, 'keywords': s['keywords']},
        'hmYsKunye': dict(KUNYE, email=s['email'], yayin=s['yayin'], lead=s['slogan']),
        'hmNewsSites25': 'newsites25-20261008',
    })
    if s.get('worldDateline'):
        L['hmWorldDateline'] = True   # theme: "TurkAta News - <Country>" dateline on articles (this site only)
    return L

def contact(s):
    return dict(CONTACT, email=s['email'])
