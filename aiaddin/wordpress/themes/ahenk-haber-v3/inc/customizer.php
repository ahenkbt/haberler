<?php
if ( ! defined('ABSPATH') ) exit;

function ahenk_customizer_kaydet( $wp_customize ) {
    $wp_customize->add_panel('ahenk_panel', array('title'=>'🗞 Ahenk Haber','priority'=>1));

    // RENKLER — Birportal uyumlu gradient sistemi
    $wp_customize->add_section('ahenk_renkler',array('title'=>'🎨 Renkler & Gradientler','panel'=>'ahenk_panel','description'=>'Header, navbar ve bölüm başları için sol→sağ gradient renk çiftleri belirleyin.'));
    $renkler=array(
        /* Temel */
        'ahenk_renk_ana'           => array('Ana Renk (link/hover)',       '#CC0000'),
        'ahenk_renk_ikincil'       => array('İkincil Renk',                '#1A4A8A'),
        /* Header Gradient */
        'ahenk_renk_header_sol'    => array('Header Gradient — Sol',       '#CC0000'),
        'ahenk_renk_header_sag'    => array('Header Gradient — Sağ',       '#8B0000'),
        /* Bileşen Bar */
        'ahenk_renk_bilesen_sol'   => array('Bileşen Bar Gradient — Sol',  '#1A4A8A'),
        'ahenk_renk_bilesen_sag'   => array('Bileşen Bar Gradient — Sağ',  '#0d2d5a'),
        /* Tab Menu 3 */
        'ahenk_renk_tab3_sol'      => array('Tab Grup 3 Gradient — Sol',   '#7B1FA2'),
        'ahenk_renk_tab3_sag'      => array('Tab Grup 3 Gradient — Sağ',   '#4A148C'),
        /* Navbar */
        'ahenk_renk_navbar'        => array('Navbar Arkaplan',             '#1a1a1a'),
        'ahenk_renk_navbar_yazi'   => array('Navbar Yazı',                 '#ffffff'),
        /* Bandlar */
        'ahenk_renk_sd'            => array('Son Dakika Bandı',            '#CC0000'),
        'ahenk_renk_finans'        => array('Finans Bandı',                '#1a1a1a'),
        /* Footer */
        'ahenk_renk_footer_bg'     => array('Footer Arkaplan',             '#1a1a1a'),
        'ahenk_renk_footer_hover'  => array('Footer Hover Rengi',          '#CC0000'),
        /* Genel */
        'ahenk_renk_genel_link'    => array('Genel Link Hover Rengi',      '#CC0000'),
    );
    foreach($renkler as $id=>$d){
        $wp_customize->add_setting($id,array('default'=>$d[1],'sanitize_callback'=>'sanitize_hex_color','transport'=>'postMessage'));
        $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize,$id,array('label'=>$d[0],'section'=>'ahenk_renkler')));
    }

    // GENEL
    $wp_customize->add_section('ahenk_genel',array('title'=>'⚙ Genel','panel'=>'ahenk_panel'));
    $genel=array(
        'ahenk_logo_metin_1'=>array('Logo Metin 1','AHENK'),
        'ahenk_logo_metin_2'=>array('Logo Metin 2','HABER'),
        'ahenk_whatsapp'=>array('WhatsApp (905...)',''),
        'ahenk_telefon'=>array('Telefon',''),
        'ahenk_email'=>array('E-posta',''),
        'ahenk_adres'=>array('Adres',''),
        'ahenk_footer_metin'=>array('Footer Alt Metin','Tüm hakları saklıdır.'),
        'ahenk_footer_aciklama'=>array('Footer Açıklama',''),
    );
    foreach($genel as $id=>$d){
        $wp_customize->add_setting($id,array('default'=>$d[1],'sanitize_callback'=>'sanitize_text_field'));
        $wp_customize->add_control($id,array('label'=>$d[0],'section'=>'ahenk_genel','type'=>'text'));
    }

    // SOSYAL
    $wp_customize->add_section('ahenk_sosyal',array('title'=>'📱 Sosyal Medya','panel'=>'ahenk_panel'));
    foreach(array('ahenk_facebook'=>'Facebook','ahenk_twitter'=>'Twitter/X','ahenk_instagram'=>'Instagram','ahenk_youtube'=>'YouTube','ahenk_telegram'=>'Telegram') as $id=>$l){
        $wp_customize->add_setting($id,array('default'=>'','sanitize_callback'=>'esc_url_raw'));
        $wp_customize->add_control($id,array('label'=>$l.' URL','section'=>'ahenk_sosyal','type'=>'url'));
    }

    // NAVBAR
    $wp_customize->add_section('ahenk_navbar',array('title'=>'🧭 Navbar','panel'=>'ahenk_panel'));
    $wp_customize->add_setting('ahenk_navbar_sluglar',array('default'=>'gundem,ankara,dunya,spor','sanitize_callback'=>'sanitize_text_field'));
    $wp_customize->add_control('ahenk_navbar_sluglar',array('label'=>'Navbar Kategori Slugları (virgülle)','section'=>'ahenk_navbar','type'=>'text','description'=>'gundem,ankara,dunya,spor'));

    // ANASAYFA KATEGORİLER
    $wp_customize->add_section('ahenk_ana_kat',array('title'=>'📂 Anasayfa Kategoriler','panel'=>'ahenk_panel'));
    for($i=1;$i<=4;$i++){
        $defaults=array(1=>'gundem',2=>'yerel',3=>'dunya',4=>'spor');
        $wp_customize->add_setting("ahenk_anasayfa_kat_{$i}",array('default'=>$defaults[$i]??'','sanitize_callback'=>'sanitize_text_field'));
        $wp_customize->add_control("ahenk_anasayfa_kat_{$i}",array('label'=>"$i. Kategori Slug",'section'=>'ahenk_ana_kat','type'=>'text'));
    }

    // ANASAYFA LAYOUT
    $wp_customize->add_section('ahenk_layout',array('title'=>'📐 Anasayfa Düzeni','panel'=>'ahenk_panel'));
    $wp_customize->add_setting('ahenk_layout_kolon',array('default'=>'center','sanitize_callback'=>'sanitize_text_field'));
    $wp_customize->add_control('ahenk_layout_kolon',array('label'=>'Kolon Düzeni','section'=>'ahenk_layout','type'=>'select','choices'=>array('center'=>'Sol Sidebar + İçerik + Sağ Sidebar','left'=>'İçerik + İki Sidebar (sol)','right'=>'İki Sidebar + İçerik (sağ)','full'=>'Tam Genişlik (Sidebar Yok)')));
    $wp_customize->add_setting('ahenk_anasayfa_h1',array('default'=>'','sanitize_callback'=>'sanitize_text_field'));
    $wp_customize->add_control('ahenk_anasayfa_h1',array('label'=>'Anasayfa H1 Başlık (SEO)','section'=>'ahenk_layout','type'=>'text'));

    // MODÜLLER
    $wp_customize->add_section('ahenk_moduller',array('title'=>'📋 Anasayfa Modülleri','panel'=>'ahenk_panel'));
    $moduller=array(
        'ahenk_mod_ikonbant'     => 'İkon Bant Göster',
        'ahenk_mod_yazarlar'     => 'Yazarlar Bölümü Göster',
        'ahenk_mod_son_haberler' => 'Son Haberler Bandı Göster',
        'ahenk_mod_trend'        => 'Trend Haberler Bölümü Göster',
        'ahenk_mod_video'        => 'Video Galerisi Bölümü Göster',
        'ahenk_mod_hikaye'       => 'Hikaye / Story Sistemi Göster',
        'ahenk_mod_ozel_tab'     => 'Özel Tab Menü Göster',
        'ahenk_mod_mega_menu'    => 'Mega Menü Aktif',
        'ahenk_mod_fixednav'     => 'Sabit (Sticky) Navbar',
        'ahenk_mod_sayac'        => 'İstatistik Sayacı Göster',
        'ahenk_mod_admin_bar'    => 'Admin Bar Göster (Giriş Yapınca)',
    );
    foreach($moduller as $id=>$l){
        $def = in_array($id,array('ahenk_mod_ikonbant','ahenk_mod_trend','ahenk_mod_video','ahenk_mod_hikaye','ahenk_mod_ozel_tab','ahenk_mod_mega_menu','ahenk_mod_fixednav')) ? 1 : 0;
        $wp_customize->add_setting($id,array('default'=>$def,'sanitize_callback'=>'absint'));
        $wp_customize->add_control($id,array('label'=>$l,'section'=>'ahenk_moduller','type'=>'checkbox'));
    }

    // TAB MENÜ
    $wp_customize->add_section('ahenk_tab',array('title'=>'📑 Tab Menü','panel'=>'ahenk_panel','description'=>'Anasayfada kategori tab sistemi. Her tab farklı kategori haberleri gösterir.'));
    $wp_customize->add_setting('ahenk_tab_slug_1',array('default'=>'gundem','sanitize_callback'=>'sanitize_text_field'));
    $wp_customize->add_control('ahenk_tab_slug_1',array('label'=>'Tab 1 Kategori Slug','section'=>'ahenk_tab','type'=>'text'));
    $wp_customize->add_setting('ahenk_tab_slug_2',array('default'=>'spor','sanitize_callback'=>'sanitize_text_field'));
    $wp_customize->add_control('ahenk_tab_slug_2',array('label'=>'Tab 2 Kategori Slug','section'=>'ahenk_tab','type'=>'text'));
    $wp_customize->add_setting('ahenk_tab_slug_3',array('default'=>'ekonomi','sanitize_callback'=>'sanitize_text_field'));
    $wp_customize->add_control('ahenk_tab_slug_3',array('label'=>'Tab 3 Kategori Slug','section'=>'ahenk_tab','type'=>'text'));
    $wp_customize->add_setting('ahenk_tab_slug_4',array('default'=>'teknoloji','sanitize_callback'=>'sanitize_text_field'));
    $wp_customize->add_control('ahenk_tab_slug_4',array('label'=>'Tab 4 Kategori Slug','section'=>'ahenk_tab','type'=>'text'));

    // HİKAYE / STORY
    $wp_customize->add_section('ahenk_hikaye',array('title'=>'📷 Hikaye / Story','panel'=>'ahenk_panel','description'=>'Birportal hikaye sistemi. Kategorilere bağlı hikaye daireleri oluşturur.'));
    $wp_customize->add_setting('ahenk_hikaye_kat_sluglar',array('default'=>'gundem,spor,dunya,teknoloji','sanitize_callback'=>'sanitize_text_field'));
    $wp_customize->add_control('ahenk_hikaye_kat_sluglar',array('label'=>'Hikaye Kategorileri (slug, virgülle)','section'=>'ahenk_hikaye','type'=>'text'));

    // TREND HABERLER
    $wp_customize->add_section('ahenk_trend',array('title'=>'🔥 Trend Haberler','panel'=>'ahenk_panel'));
    $wp_customize->add_setting('ahenk_trend_sayi',array('default'=>5,'sanitize_callback'=>'absint'));
    $wp_customize->add_control('ahenk_trend_sayi',array('label'=>'Kaç Trend Haber Gösterilsin','section'=>'ahenk_trend','type'=>'number'));
    $wp_customize->add_setting('ahenk_trend_baslik',array('default'=>'Gündem','sanitize_callback'=>'sanitize_text_field'));
    $wp_customize->add_control('ahenk_trend_baslik',array('label'=>'Trend Bölümü Başlığı','section'=>'ahenk_trend','type'=>'text'));

    // VIDEO BÖLÜMÜ
    $wp_customize->add_section('ahenk_video',array('title'=>'🎬 Video Galerisi','panel'=>'ahenk_panel'));
    $wp_customize->add_setting('ahenk_video_kat',array('default'=>'video','sanitize_callback'=>'sanitize_text_field'));
    $wp_customize->add_control('ahenk_video_kat',array('label'=>'Video Kategorisi Slug','section'=>'ahenk_video','type'=>'text'));
    $wp_customize->add_setting('ahenk_video_sayi',array('default'=>4,'sanitize_callback'=>'absint'));
    $wp_customize->add_control('ahenk_video_sayi',array('label'=>'Video Sayısı','section'=>'ahenk_video','type'=>'number'));

    // SAYAÇ / İSTATİSTİKLER
    $wp_customize->add_section('ahenk_sayac',array('title'=>'📊 İstatistik Sayacı','panel'=>'ahenk_panel'));
    for($i=1;$i<=4;$i++){
        $defs=array(1=>array('10.000+','Haber'),2=>array('500+','Yazar'),3=>array('1M+','Okuyucu'),4=>array('2015','Kuruluş'));
        $wp_customize->add_setting("ahenk_sayac_{$i}_sayi",array('default'=>$defs[$i][0],'sanitize_callback'=>'sanitize_text_field'));
        $wp_customize->add_setting("ahenk_sayac_{$i}_etiket",array('default'=>$defs[$i][1],'sanitize_callback'=>'sanitize_text_field'));
        $wp_customize->add_control("ahenk_sayac_{$i}_sayi",  array('label'=>"$i. Sayaç Değer",'section'=>'ahenk_sayac','type'=>'text'));
        $wp_customize->add_control("ahenk_sayac_{$i}_etiket",array('label'=>"$i. Sayaç Etiket",'section'=>'ahenk_sayac','type'=>'text'));
    }

    // FOOTER SOSYAL (Birportal sosyal bar)
    $wp_customize->add_section('ahenk_footer_sosyal',array('title'=>'🌐 Footer Sosyal Bar','panel'=>'ahenk_panel'));
    $wp_customize->add_setting('ahenk_footer_sosyal_baslik',array('default'=>'Bizi Takip Edin','sanitize_callback'=>'sanitize_text_field'));
    $wp_customize->add_control('ahenk_footer_sosyal_baslik',array('label'=>'Sosyal Bar Başlık','section'=>'ahenk_footer_sosyal','type'=>'text'));
    $wp_customize->add_setting('ahenk_footer_sosyal_hedef',array('default'=>'1','sanitize_callback'=>'absint'));
    $wp_customize->add_control('ahenk_footer_sosyal_hedef',array('label'=>'Linkleri Yeni Sekmede Aç','section'=>'ahenk_footer_sosyal','type'=>'checkbox'));

    // İKON BANT
    $wp_customize->add_section('ahenk_ikonbant',array('title'=>'🏷 İkon Bant','panel'=>'ahenk_panel'));
    $ikon_defaults=array(
        1=>array('fa-map-marker-alt','Gezilecek Yerler','Müze & tarihi yapılar',''),
        2=>array('fa-camera','Foto Galeri','Fotoğraf & hikaye',''),
        3=>array('fa-utensils','Yerel Haberler','Bölgesel gelişmeler',''),
        4=>array('fa-bullhorn','Resmi İlanlar','Tüm resmi ilanlar',''),
        5=>array('fa-tag','Seri İlanlar','Bölgesel ilanlar',''),
        6=>array('fa-newspaper','Spor','Güncel maçlar',''),
    );
    for($i=1;$i<=6;$i++){
        $def=$ikon_defaults[$i];
        $wp_customize->add_setting("ahenk_ikon_{$i}_icon", array('default'=>$def[0],'sanitize_callback'=>'sanitize_text_field'));
        $wp_customize->add_setting("ahenk_ikon_{$i}_baslik",array('default'=>$def[1],'sanitize_callback'=>'sanitize_text_field'));
        $wp_customize->add_setting("ahenk_ikon_{$i}_acik",  array('default'=>$def[2],'sanitize_callback'=>'sanitize_text_field'));
        $wp_customize->add_setting("ahenk_ikon_{$i}_link",  array('default'=>$def[3],'sanitize_callback'=>'esc_url_raw'));
        $wp_customize->add_control("ahenk_ikon_{$i}_icon",  array('label'=>"$i. İkon (fa-...)",'section'=>'ahenk_ikonbant','type'=>'text'));
        $wp_customize->add_control("ahenk_ikon_{$i}_baslik",array('label'=>"$i. Başlık",'section'=>'ahenk_ikonbant','type'=>'text'));
        $wp_customize->add_control("ahenk_ikon_{$i}_acik",  array('label'=>"$i. Açıklama",'section'=>'ahenk_ikonbant','type'=>'text'));
        $wp_customize->add_control("ahenk_ikon_{$i}_link",  array('label'=>"$i. Link",'section'=>'ahenk_ikonbant','type'=>'url'));
    }
}
add_action('customize_register','ahenk_customizer_kaydet');

/* Dinamik CSS artık inc/color.php üzerinden header.php'de işleniyor */
