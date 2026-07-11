<?php
if ( ! defined('ABSPATH') ) exit;

function ahenk_customizer_kaydet( $wp_customize ) {
    $wp_customize->add_panel('ahenk_panel', array('title'=>'🗞 Ahenk Haber','priority'=>1));

    // RENKLER
    $wp_customize->add_section('ahenk_renkler',array('title'=>'🎨 Renkler','panel'=>'ahenk_panel','description'=>'Rengi değiştirip "Yayımla" butonuna tıklamanız yeterli.'));
    $renkler=array(
        'ahenk_renk_ana'=>array('Ana Renk (Gold)','#D4AF37'),
        'ahenk_renk_ikincil'=>array('İkincil Renk (Mavi)','#1A4A8A'),
        'ahenk_renk_navbar'=>array('Navbar Arkaplan','#1a1a1a'),
        'ahenk_renk_navbar_yazi'=>array('Navbar Yazı Rengi','#ffffff'),
        'ahenk_renk_ustbar'=>array('Üst Bar Rengi','#D4AF37'),
        'ahenk_renk_sd'=>array('Son Dakika Bandı Rengi','#D4AF37'),
        'ahenk_renk_finans'=>array('Finans Bandı Rengi','#1a1a1a'),
    );
    foreach($renkler as $id=>$d){
        $wp_customize->add_setting($id,array('default'=>$d[1],'sanitize_callback'=>'sanitize_hex_color','transport'=>'refresh'));
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
    $wp_customize->add_control('ahenk_navbar_sluglar',array('label'=>'Navbar Kategori Slugları (virgülle)','section'=>'ahenk_navbar','type'=>'text','description'=>'Örnek: gundem,ankara,dunya,spor'));

    // NAVBAR ÖZEL LİNKLER (4 adet)
    $wp_customize->add_section('ahenk_navbar_ozel',array('title'=>'🔗 Navbar Özel Linkler','panel'=>'ahenk_panel','description'=>'Kategoriler dışında özel sayfa veya URL linkleri ekleyin.'));
    $ozel_defaults = array(
        1 => array('Şehir TV',    'https://ankarasehirgazetesi.com/sehir-tv/'),
        2 => array('Ansiklopedi', 'https://ankarasehirgazetesi.com/ansiklopedi/'),
        3 => array('', ''),
        4 => array('', ''),
    );
    for ($i = 1; $i <= 4; $i++) {
        $wp_customize->add_setting("ahenk_ozel_link_{$i}_baslik", array('default'=>$ozel_defaults[$i][0],'sanitize_callback'=>'sanitize_text_field'));
        $wp_customize->add_setting("ahenk_ozel_link_{$i}_url",    array('default'=>$ozel_defaults[$i][1],'sanitize_callback'=>'esc_url_raw'));
        $wp_customize->add_control("ahenk_ozel_link_{$i}_baslik", array('label'=>"$i. Link Başlığı",'section'=>'ahenk_navbar_ozel','type'=>'text'));
        $wp_customize->add_control("ahenk_ozel_link_{$i}_url",    array('label'=>"$i. Link URL",'section'=>'ahenk_navbar_ozel','type'=>'url'));
    }

    // ANASAYFA KATEGORİLER
    $wp_customize->add_section('ahenk_ana_kat',array('title'=>'📂 Anasayfa Kategoriler','panel'=>'ahenk_panel','description'=>'Anasayfada gösterilecek kategori bloklarını girin. Boş bırakılanlar gösterilmez. Slug = kategori URL adı (örn: gundem, yerel, spor).'));
    $defaults=array(1=>'gundem',2=>'yerel',3=>'dunya',4=>'spor',5=>'',6=>'',7=>'',8=>'');
    for($i=1;$i<=8;$i++){
        $wp_customize->add_setting("ahenk_anasayfa_kat_{$i}",array('default'=>$defaults[$i]??'','sanitize_callback'=>'sanitize_text_field'));
        $wp_customize->add_control("ahenk_anasayfa_kat_{$i}",array('label'=>"$i. Kategori Slug",'section'=>'ahenk_ana_kat','type'=>'text'));
    }

    // MODÜLLER
    $wp_customize->add_section('ahenk_moduller',array('title'=>'📋 Anasayfa Modülleri','panel'=>'ahenk_panel'));
    $moduller=array(
        'ahenk_mod_ikonbant'=>'İkon Bant Göster',
        'ahenk_mod_yazarlar'=>'Yazarlar Bölümü Göster',
        'ahenk_mod_son_haberler'=>'Son Haberler Bandı Göster',
    );
    foreach($moduller as $id=>$l){
        $wp_customize->add_setting($id,array('default'=>1,'sanitize_callback'=>'absint'));
        $wp_customize->add_control($id,array('label'=>$l,'section'=>'ahenk_moduller','type'=>'checkbox'));
    }

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

function ahenk_renk_koyulastir($hex,$pct=20){
    $hex=ltrim($hex,'#');
    if(strlen($hex)===3) $hex=$hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
    if(strlen($hex)!==6) return '#'.$hex;
    $r=max(0,hexdec(substr($hex,0,2))-round(255*$pct/100));
    $g=max(0,hexdec(substr($hex,2,2))-round(255*$pct/100));
    $b=max(0,hexdec(substr($hex,4,2))-round(255*$pct/100));
    return sprintf('#%02x%02x%02x',$r,$g,$b);
}
function ahenk_renk_acilastir($hex,$pct=20){
    $hex=ltrim($hex,'#');
    if(strlen($hex)===3) $hex=$hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
    if(strlen($hex)!==6) return '#'.$hex;
    $r=min(255,hexdec(substr($hex,0,2))+round(255*$pct/100));
    $g=min(255,hexdec(substr($hex,2,2))+round(255*$pct/100));
    $b=min(255,hexdec(substr($hex,4,2))+round(255*$pct/100));
    return sprintf('#%02x%02x%02x',$r,$g,$b);
}
function ahenk_hex_to_rgb($hex){
    $hex=ltrim($hex,'#');
    if(strlen($hex)===3) $hex=$hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
    if(strlen($hex)!==6) return '0,0,0';
    return hexdec(substr($hex,0,2)).','.hexdec(substr($hex,2,2)).','.hexdec(substr($hex,4,2));
}

function ahenk_dinamik_css(){
    $ana       = get_theme_mod('ahenk_renk_ana','#D4AF37');
    $ana_koyu  = ahenk_renk_koyulastir($ana,15);
    $ana_acik  = ahenk_renk_acilastir($ana,15);
    $ana_rgb   = ahenk_hex_to_rgb($ana);
    $css_vars=array(
        '--renk-ana'          =>$ana,
        '--renk-ana-koyu'     =>$ana_koyu,
        '--renk-ana-acik'     =>$ana_acik,
        '--renk-ana-rgb'      =>$ana_rgb,
        '--renk-ikincil'      =>get_theme_mod('ahenk_renk_ikincil','#1A4A8A'),
        '--renk-navbar'       =>get_theme_mod('ahenk_renk_navbar','#1a1a1a'),
        '--renk-navbar-yazi'  =>get_theme_mod('ahenk_renk_navbar_yazi','#f6efd6'),
        '--renk-ustbar'       =>get_theme_mod('ahenk_renk_ustbar','#1a1a1a'),
        '--renk-sd'           =>$ana,
        '--renk-finans'       =>get_theme_mod('ahenk_renk_finans','#0f0f10'),
    );
    echo "<style id='ahenk-vars'>:root{";
    foreach($css_vars as $k=>$v) echo esc_attr($k).':'.esc_attr($v).';';
    echo "}</style>\n";
}
add_action('wp_head','ahenk_dinamik_css',999);
