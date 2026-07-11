<?php
/**
 * Onceden tanimli Turkce YouTube kanallari - her kategoriden 10 kanal
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

class VTV_Channels_Preset {

    public static function get_all() {
        return array(

            'Haberler' => array(
                array('isim'=>'NTV',              'url'=>'@ntv',               'aciklama'=>'NTV - Turkiye nin haber kanali'),
                array('isim'=>'CNN Turk',         'url'=>'@cnnturk',           'aciklama'=>'CNN Turk haber ve yorum'),
                array('isim'=>'TRT Haber',        'url'=>'@TRTHaber',          'aciklama'=>'TRT Haber - Resmi haber kanali'),
                array('isim'=>'Sozcu TV',         'url'=>'@sozcu',             'aciklama'=>'Sozcu gazetesi video haberleri'),
                array('isim'=>'Haber Global',     'url'=>'@HaberGlobal',       'aciklama'=>'Haber Global - Guncel haberler'),
                array('isim'=>'A Haber',          'url'=>'@ahaber',            'aciklama'=>'A Haber - Gunun son dakika haberleri'),
                array('isim'=>'Haberturk',        'url'=>'@haberturktv',       'aciklama'=>'Haberturk TV - Guncel haberler ve analizler'),
                array('isim'=>'TRT World',        'url'=>'@TRTWorld',          'aciklama'=>'TRT World - Uluslararasi haberler'),
                array('isim'=>'Kanal D Haber',    'url'=>'@kanaldhabertv',     'aciklama'=>'Kanal D Haber - Son dakika haberleri'),
                array('isim'=>'Fox Haber',        'url'=>'@FOXTVHaber',        'aciklama'=>'FOX TV Haber - Guncel haber ve programlar'),
            ),

            'Tarih' => array(
                array('isim'=>'DFT Tarih',        'url'=>'@DFTTarih',          'aciklama'=>'Derin Tarih belgeselleri ve anlatimlari'),
                array('isim'=>'Evrim Agaci',      'url'=>'@evrimagaci',        'aciklama'=>'Bilim, tarih ve felsefe kanali'),
                array('isim'=>'Baris Doster',     'url'=>'@barisdoster',       'aciklama'=>'Tarih ve jeopolitik analizler'),
                array('isim'=>'History TR',       'url'=>'@historychanneltr',  'aciklama'=>'History Channel Turkiye'),
                array('isim'=>'Nexus Tarih',      'url'=>'@NexusTarih',        'aciklama'=>'Nexus Tarih - Osmanlı ve dunya tarihi'),
                array('isim'=>'DFT Mini',         'url'=>'@DFTMini',           'aciklama'=>'DFT Mini - Kisa tarih videolari'),
                array('isim'=>'Dirilis Tarihi',   'url'=>'@dirilispostasi',    'aciklama'=>'Dirilis Tarihi - Turk ve Islam tarihi'),
                array('isim'=>'Anatolia',         'url'=>'@AnatoliaChannel',   'aciklama'=>'Anatolia - Turk kulturu ve medeniyeti'),
                array('isim'=>'Kronikleri',       'url'=>'@KronikarTV',        'aciklama'=>'Kronikler - Tarih ve kültür belgeselleri'),
                array('isim'=>'Genel Kultur',     'url'=>'@GenelKulturSinavi', 'aciklama'=>'Genel Kultur - Tarih ve edebiyat'),
            ),

            'Bilim' => array(
                array('isim'=>'Evrim Agaci',      'url'=>'@evrimagaci',          'aciklama'=>'Bilim, evrim ve felsefe'),
                array('isim'=>'HT Bilim',         'url'=>'@HTBilimTarihFelsefe', 'aciklama'=>'HT Bilim Tarih Felsefe kanali'),
                array('isim'=>'TUBITAK',          'url'=>'@TUBITAK_Turkiye',     'aciklama'=>'TUBITAK resmi YouTube kanali'),
                array('isim'=>'Bilim Genc',       'url'=>'@BilimGenc',           'aciklama'=>'Bilim Genc - Genclere yonelik bilim'),
                array('isim'=>'Dusunce TV',       'url'=>'@DusunceTv',           'aciklama'=>'Dusunce TV - Bilim ve felsefe programlari'),
                array('isim'=>'SciShow TR',       'url'=>'@scishowturkce',       'aciklama'=>'SciShow Turkce - Bilim haberleri'),
                array('isim'=>'Dokunmatik Bilim', 'url'=>'@DokunmatikBilim',     'aciklama'=>'Dokunmatik Bilim - Gunluk bilim'),
                array('isim'=>'Kuantum',          'url'=>'@kuantumkanalı',       'aciklama'=>'Kuantum - Fizik ve uzay bilimleri'),
                array('isim'=>'Astronomi TR',     'url'=>'@astronomiturkiye',    'aciklama'=>'Astronomi Turkiye - Uzay ve gok bilimi'),
                array('isim'=>'Biyoloji TR',      'url'=>'@biyolojichannel',     'aciklama'=>'Biyoloji Channel - Yasam bilimleri'),
            ),

            'Saglik' => array(
                array('isim'=>'Doktor Takvimi',   'url'=>'@doktortakvimi',       'aciklama'=>'Uzman hekimlerden saglik tavsiyeleri'),
                array('isim'=>'NTV Saglik',       'url'=>'@ntvsaglik',           'aciklama'=>'NTV saglik haberleri ve programlari'),
                array('isim'=>'Op.Dr. Orhan Engin','url'=>'@orhanengin',         'aciklama'=>'Genel cerrahi ve saglik videolari'),
                array('isim'=>'Acibadem',         'url'=>'@AcibademHastanesi',   'aciklama'=>'Acibadem Hastaneleri saglik rehberi'),
                array('isim'=>'Medicana',         'url'=>'@medicanahastaneler',  'aciklama'=>'Medicana Hastaneleri YouTube kanali'),
                array('isim'=>'Dunya Saglik',     'url'=>'@dunyasaglikvakfi',    'aciklama'=>'Dunya Saglik Vakfi saglik icerikleri'),
                array('isim'=>'Memorial Saglik',  'url'=>'@MemorialSaglikGrubu', 'aciklama'=>'Memorial Hastaneleri saglik icerikleri'),
                array('isim'=>'Saglik TV',        'url'=>'@sagliktv',            'aciklama'=>'Saglik TV - Uzman saglik programlari'),
                array('isim'=>'Beslenme TV',      'url'=>'@beslenmetv',          'aciklama'=>'Beslenme TV - Diyet ve saglikli yasam'),
                array('isim'=>'Psikoloji TR',     'url'=>'@psikolojichannel',    'aciklama'=>'Psikoloji Channel - Ruh sagligi'),
            ),

            'Eglence' => array(
                array('isim'=>'Tiwi',             'url'=>'@tiwi',             'aciklama'=>'Eglence, kultur ve yasam videolari'),
                array('isim'=>'Kafalar',          'url'=>'@KafalarYT',        'aciklama'=>'Kafalar - Populer Turk icerik ureticisi'),
                array('isim'=>'Danla Bilic',      'url'=>'@DanlaBilic',       'aciklama'=>'Yasam, vlog ve eglence icerikleri'),
                array('isim'=>'Enes Batur',       'url'=>'@EnesBatur',        'aciklama'=>'Oyun, vlog ve challenge videolari'),
                array('isim'=>'Orkun Isitmak',    'url'=>'@OrkunIsitmak',     'aciklama'=>'Eglenceli ve kulturel icerikler'),
                array('isim'=>'Oha Diyorum',      'url'=>'@OhaDiyorum',       'aciklama'=>'Oha Diyorum - Eglenceli deneyler'),
                array('isim'=>'Reynmen',          'url'=>'@ReynmenYT',        'aciklama'=>'Reynmen - Muzik ve eglence'),
                array('isim'=>'Sera Hobil',       'url'=>'@serahobilofficial', 'aciklama'=>'Sera Hobil - Yasam ve eglence'),
                array('isim'=>'Kuzey Guney',      'url'=>'@KuzeyGuneyTV',     'aciklama'=>'Kuzey Guney - Dizi ve film icerikleri'),
                array('isim'=>'NTV Yasam',        'url'=>'@ntvasaglik',       'aciklama'=>'NTV Yasam - Eglence ve yasam'),
            ),

            'Spor' => array(
                array('isim'=>'beIN SPORTS TR',   'url'=>'@beINSPORTSTurkiye', 'aciklama'=>'beIN Sports Turkiye spor haberleri'),
                array('isim'=>'TFF',              'url'=>'@TFF_org',           'aciklama'=>'Turkiye Futbol Federasyonu kanali'),
                array('isim'=>'NTV Spor',         'url'=>'@ntvspor',           'aciklama'=>'NTV Spor - Guncel spor haberleri'),
                array('isim'=>'Fenerbahce SK',    'url'=>'@fenerbahceskTV',    'aciklama'=>'Fenerbahce Spor Kulubu resmi kanali'),
                array('isim'=>'Galatasaray SK',   'url'=>'@GalatasaraySK',     'aciklama'=>'Galatasaray Spor Kulubu resmi kanali'),
                array('isim'=>'Besiktas JK',      'url'=>'@bjktv',             'aciklama'=>'Besiktas JK resmi YouTube kanali'),
                array('isim'=>'Trabzonspor',      'url'=>'@trabzonspor',       'aciklama'=>'Trabzonspor resmi YouTube kanali'),
                array('isim'=>'A Spor',           'url'=>'@aspor',             'aciklama'=>'A Spor - Canli spor yayinlari'),
                array('isim'=>'S Sport',          'url'=>'@ssporttv',          'aciklama'=>'S Sport - Futbol ve spor programlari'),
                array('isim'=>'Spor Arena',       'url'=>'@sporarenatv',       'aciklama'=>'Spor Arena - Guncel spor haberleri'),
            ),
        );
    }
}
