-- phpMyAdmin SQL Dump
-- version 4.9.0.1
-- https://www.phpmyadmin.net/
--
-- Anamakine: localhost:3306
-- Üretim Zamanı: 08 Şub 2020, 15:09:50
-- Sunucu sürümü: 5.7.29
-- PHP Sürümü: 7.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;


--
-- Veritabanı: `veritabani`
--

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `aidatlar`
--

CREATE TABLE `aidatlar` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tc` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `baba_adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `ucret` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `oucret` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `odeme` int(11) DEFAULT '0',
  `tariha` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` longtext COLLATE utf8_turkish_ci,
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `aidatlar`
--

INSERT INTO `aidatlar` (`id`, `sira`, `adi`, `tc`, `baba_adi`, `ucret`, `oucret`, `odeme`, `tariha`, `aciklama`, `tarih`) VALUES
(1, 1, 'Örnek Müşteri 1', '44444444444', 'Ali Veli', '100', '', 0, '01/02/2020', '<p>Site demosu i&ccedil;in hazırlanmıştır.</p>', '2020-02-08 13:13:56'),
(2, 0, 'Örnek Müşteri 2', '11111111111', 'Ahmet Mehmet', '120', '120', 1, '01/01/2020', '<p>test</p>', '2020-02-04 18:15:38'),
(3, 2, 'Örnek Müşteri 1', '44444444444', 'Ali Veli', '100', '', 0, '01/03/2020', '<p>Site demosu i&ccedil;in hazırlanmıştır.</p>', '2020-02-08 13:21:44'),
(4, 2, 'Örnek Müşteri 1', '44444444444', 'Ali Veli', '100', '', 0, '01/04/2020', '<p>Site demosu i&ccedil;in hazırlanmıştır.</p>', '2020-02-08 13:21:56');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `aidat_odemeler`
--

CREATE TABLE `aidat_odemeler` (
  `id` int(11) NOT NULL,
  `aid` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tc` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `ucret` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `spno` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `paytronay` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `ip` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `aidat_odemeler`
--

INSERT INTO `aidat_odemeler` (`id`, `aid`, `adi`, `tc`, `ucret`, `spno`, `aciklama`, `paytronay`, `tarih`, `ip`) VALUES
(1, 1, 'Örnek Müşteri 1', '44444444444', '80', '#1580897023', 'Örnek Müşteri 1-Şubat 2020 Aidat Ödemesi', 1, '2020-02-05 13:03:44', '176.88.92.147'),
(2, 3, 'Örnek Müşteri 1', '44444444444', '100', '#1580897049', 'Örnek Müşteri 1-Ocak 2020 Aidat Ödemesi', 1, '2020-02-05 13:04:09', '176.88.92.147'),
(3, 2, 'Örnek Müşteri 2', '11111111111', '70', '#1580897201', 'Örnek Müşteri 2-Ocak 2020 Aidat Ödemesi', 1, '2020-02-05 13:06:41', '176.88.92.147'),
(4, 1, 'Örnek Müşteri 1', '44444444444', '100', '#1581157350', 'Örnek Müşteri 1-Şubat 2020 Aidat Ödemesi', 0, '2020-02-08 13:22:31', '195.155.192.14');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `arka_plan`
--

CREATE TABLE `arka_plan` (
  `id` int(11) NOT NULL,
  `arkaplan1` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan2` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan3` varchar(350) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan4` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan5` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan6` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan7` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan8` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan9` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan10` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan11` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan12` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan13` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan14` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan15` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan16` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan17` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan18` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan19` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan20` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan21` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan22` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `arkaplan23` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `arka_plan`
--

INSERT INTO `arka_plan` (`id`, `arkaplan1`, `arkaplan2`, `arkaplan3`, `arkaplan4`, `arkaplan5`, `arkaplan6`, `arkaplan7`, `arkaplan8`, `arkaplan9`, `arkaplan10`, `arkaplan11`, `arkaplan12`, `arkaplan13`, `arkaplan14`, `arkaplan15`, `arkaplan16`, `arkaplan17`, `arkaplan18`, `arkaplan19`, `arkaplan20`, `arkaplan21`, `arkaplan22`, `arkaplan23`) VALUES
(1, 'cover-1.jpg', '1_1.jpg', 'bg-winter-wide.jpg', '1_1.jpg', 'section-cover.jpg', 'fotogaleri.jpg', 'haberler.jpg', 'proje.jpg', 'profil.jpg', 'haberler.jpg', 'ihaleler.jpg', 'ilanlar.jpg', 'etkinlikler.jpg', 'fotogaleri.jpg', 'fotogaleri.jpg', 'imar_degisiklik.jpg', 'birimler.jpg', 'proje.jpg', 'haberler.jpg', 'iletisim.jpg', '1_1.jpg', '7.jpg', 'NSLU-article-title-bg-proven-strategy-reduce-debt.jpg');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `ayarlar`
--

CREATE TABLE `ayarlar` (
  `id` int(11) NOT NULL,
  `site_url` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `havadurumu` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `site_baslik` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `site_desc` text COLLATE utf8_turkish_ci,
  `site_keyw` text COLLATE utf8_turkish_ci,
  `demo` int(11) DEFAULT '0',
  `site_tema` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `renk1` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `renk2` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `renk3` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `site_dil` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `firma_adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `firma_logo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `firma_footerlogo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `favicon` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `firma_telefon` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `firma_fax` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `firma_email` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `firma_adres` text COLLATE utf8_turkish_ci,
  `google_maps` text COLLATE utf8_turkish_ci,
  `google_analytics` text COLLATE utf8_turkish_ci,
  `dogrulama_kodu` longtext COLLATE utf8_turkish_ci,
  `canli_destek` longtext COLLATE utf8_turkish_ci,
  `whatsapp` longtext COLLATE utf8_turkish_ci,
  `facebook` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `twitter` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `instagram` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `linkedin` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `youtube` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `copyright` longtext COLLATE utf8_turkish_ci,
  `yonetim` varchar(350) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `ayarlar`
--

INSERT INTO `ayarlar` (`id`, `site_url`, `havadurumu`, `site_baslik`, `site_desc`, `site_keyw`, `demo`, `site_tema`, `renk1`, `renk2`, `renk3`, `site_dil`, `firma_adi`, `firma_logo`, `firma_footerlogo`, `favicon`, `firma_telefon`, `firma_fax`, `firma_email`, `firma_adres`, `google_maps`, `google_analytics`, `dogrulama_kodu`, `canli_destek`, `whatsapp`, `facebook`, `twitter`, `instagram`, `linkedin`, `youtube`, `copyright`, `yonetim`, `dil`) VALUES
(1, 'http://siteadi.com/', 'İstanbul', 'Dernek & Belediye V7', 'Dernek & Belediye V7', 'Dernek & Belediye V7', 0, 'genel', '#4389A2', '#417588', '#417588', 'tr', 'Dernek & Belediye V7', 'dernek_belediye_logo_1.png', 'logo-footer-sag.png', 'fav_2.png', '0 (000) 000 00 00', '0 (000) 000 00 00', 'demo@demo.com', 'Lorem ipsum dolor sit ametipsum dolor sit amet İstanbul/Türkiye', '<iframe width=\"100%\" height=\"430\"  frameborder=\"0\" scrolling=\"no\" marginheight=\"0\" marginwidth=\"0\" src=\"https://www.google.com/maps?f=q&source=s_q&hl=tr&geocode=&q=Samsun,+T%C3%BCrkiye&aq=0&oq=samsun&sll=37.0625,-95.677068&sspn=42.901912,86.572266&ie=UTF8&hq=&hnear=Samsun,+T%C3%BCrkiye&t=m&z=12&ll=41.292782,36.33128&output=embed\"></iframe>', '<script>\r\n	  (function(i,s,o,g,r,a,m){i[\'GoogleAnalyticsObject\']=r;i[r]=i[r]||function(){\r\n	  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),\r\n	  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)\r\n	  })(window,document,\'script\',\'//www.google-analytics.com/analytics.js\',\'ga\');\r\n\r\n	  ga(\'create\', \'UA-54503473-1\', \'auto\');\r\n	  ga(\'send\', \'pageview\');\r\n</script>', '<meta name=\"google-site-verification\" content=\"77AqeY3dAjxcbc8sDqaDE7lhn0D2e9Babqrzn6I6Bsk\" />', '', '<div class=\"telefon\">\r\n	<a href=\"tel:900000000000\" title=\"Telefon\" alt=\"Telefon\"><i class=\"fa fa-phone\"></i></a>\r\n	<span class=\"tooltiptext\">Telefon</span>\r\n</div>\r\n<div class=\"whatsapp\">\r\n	<a href=\"https://api.whatsapp.com/send?phone=900000000000\" target=\"_blank\" title=\"WhatsApp\" alt=\"WhatsApp\"><i class=\"fab fa-whatsapp\"></i></a>\r\n	<span class=\"tooltiptext\">WhatsApp</span>\r\n</div>', 'https://www.facebook.com/', 'https://twitter.com/?lang=tr', 'https://instagram.com/', 'https://tr.linkedin.com/', 'https://www.youtube.com/?hl=tr&gl=TR', 'Copyright © 2020. Her Hakkı Saklıdır. kopyalanması, çoğaltılması ve dağıtılması halinde yasal haklarımız işletilecektir.', 'yonetim', 0);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `bagislar`
--

CREATE TABLE `bagislar` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `kategori` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `miktar` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `kapak` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `bagislar`
--

INSERT INTO `bagislar` (`id`, `sira`, `kategori`, `adi`, `seo`, `miktar`, `kapak`, `durum`, `tarih`, `dil`) VALUES
(1, 1, '2', 'İdlib Acil Yardım', 'idlib-acil-yardim', '10', 'dernek-kapak.jpg', 1, '2020-02-03 13:26:46', 1),
(2, 0, '1', 'Sofrada Tuzun Olsun', 'sofrada-tuzun-olsun', '20', 'dernek-kapak_1.jpg', 1, '2020-02-03 13:26:57', 1),
(3, 2, '1', 'Zekat Bağışı', 'zekat-bagisi', '', 'dernek-kapak_2.jpg', 1, '2020-02-03 13:27:12', 1),
(4, 3, '2', 'İdlib Çadır Projesi', 'idlib-cadir-projesi', '100', 'dernek-kapak_3.jpg', 1, '2020-02-03 13:27:43', 1),
(5, 4, '2', 'Briket Ev Projesi', 'briket-ev-projesi', '35', 'dernek-kapak_4.jpg', 1, '2020-02-03 13:39:41', 1),
(6, 5, '1', 'Sadaka', 'sadaka', '', 'dernek-kapak_5.jpg', 1, '2020-02-03 13:42:22', 1),
(7, 6, '1', 'Bayramlık Hediyesi', 'bayramlik-hediyesi', '100', 'dernek-kapak_6.jpg', 1, '2020-02-03 13:42:50', 1),
(8, 2, '1', 'Genel Bağış', 'genel-bagis', '', 'dernek-kapak_7.jpg', 1, '2020-02-03 13:43:28', 1),
(9, 3, '1', 'Yetim', 'yetim', '20', 'dernek-kapak_8.jpg', 1, '2020-02-03 13:44:00', 1),
(10, 9, '4', 'Yemen Kurban - Küçükbaş', 'yemen-kurban-kucukbas', '750', 'dernek-kapak_9.jpg', 1, '2020-02-03 13:46:26', 1),
(11, 10, '4', 'Şükür Kurbanı - Küçükbaş', 'sukur-kurbani-kucukbas', '800', 'dernek-kapak_10.jpg', 1, '2020-02-03 13:47:00', 1),
(12, 11, '5', 'Yağmur Hasadı', 'yagmur-hasadi', '', 'dernek-kapak_11.jpg', 1, '2020-02-03 13:47:35', 1),
(13, 12, '3', 'Medrese İnşaa Fonu', 'medrese-insaa-fonu', '15', 'dernek-kapak_12.jpg', 1, '2020-02-03 13:48:03', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `bagis_kategori`
--

CREATE TABLE `bagis_kategori` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `keywords` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `description` text COLLATE utf8_turkish_ci,
  `ikon` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `bagis_kategori`
--

INSERT INTO `bagis_kategori` (`id`, `sira`, `adi`, `seo`, `keywords`, `description`, `ikon`, `durum`, `tarih`, `dil`) VALUES
(1, 0, 'Genel Bağış', 'genel-bagis', 'Genel Bağış', 'Genel Bağış', 'x-02-3-512.png', 1, '2020-02-01 14:36:55', 1),
(2, 1, 'Acil Yardım', 'acil-yardim', 'Acil Yardım', 'Acil Yardım', '__donation_charity_organisation_company-512.png', 1, '2020-02-01 15:22:23', 1),
(3, 2, 'Eğitim', 'egitim', 'Eğitim', 'Eğitim', '__hand_heart_chatiry_donation-512.png', 1, '2020-02-01 15:26:55', 1),
(4, 3, 'Kurban', 'kurban', 'Kurban', 'Kurban', 'Blood-Donation-512.png', 1, '2020-02-01 15:27:11', 1),
(5, 4, 'Projeler', 'projeler', 'Projeler', 'Projeler', 'charity-11-512.png', 1, '2020-02-01 15:28:02', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `bagis_odeme`
--

CREATE TABLE `bagis_odeme` (
  `id` int(11) NOT NULL,
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `cep` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tel` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `adres` text COLLATE utf8_turkish_ci,
  `aciklama` text COLLATE utf8_turkish_ci,
  `bagislar` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `paytronay` int(11) DEFAULT '0',
  `fiyat` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tc` varchar(11) COLLATE utf8_turkish_ci DEFAULT '0',
  `sepet` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `ip` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `odemetipi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `spno` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `ktarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `bagis_odeme`
--

INSERT INTO `bagis_odeme` (`id`, `adi`, `cep`, `tel`, `email`, `adres`, `aciklama`, `bagislar`, `paytronay`, `fiyat`, `tc`, `sepet`, `ip`, `odemetipi`, `spno`, `ktarih`, `tarih`) VALUES
(11, 'Örnek Müşteri 1', '0000 000 00 00', '00000000000', 'demo@demo.com', 'Lorem ipsum dolor sit ametipsum dolor sit amet İstanbul/Türkiye', 'Site demosu için eklenmiştir.', 'BURAYA BAĞIŞLAR ÇEKİLECEK', 1, '120', '00000000000', '[{\"id\":\"2\",\"adi\":\"Sofrada Tuzun Olsun\",\"tutar\":20,\"sesID\":\"5e3e9b85cf187\"},{\"id\":\"3\",\"adi\":\"Zekat Ba\\u011f\\u0131\\u015f\\u0131\",\"tutar\":100,\"sesID\":\"5e3e9d28242fe\"}]', '195.155.192.14', 'Kredi Kartı', '#1581161803', '2020-02-08', '08 Şubat 2020, 14:36');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `bakim_modu`
--

CREATE TABLE `bakim_modu` (
  `id` int(11) NOT NULL,
  `acilis_tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `acilis_zaman` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `baslik` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` text COLLATE utf8_turkish_ci
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `bakim_modu`
--

INSERT INTO `bakim_modu` (`id`, `acilis_tarih`, `acilis_zaman`, `baslik`, `aciklama`) VALUES
(1, '04-03-2020', '10:10', 'SİTEMİZ BAKIMDADIR', 'Şu anda bakımdayız.Kısa süre sonra geri döneceğiz.Daha sonra yeniden deneyiniz.');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `baskanmenu`
--

CREATE TABLE `baskanmenu` (
  `id` int(11) NOT NULL,
  `menu_ust` int(11) DEFAULT '0',
  `menu_isim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `menu_url` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `link` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `sekme` int(11) DEFAULT '0',
  `menu_sira` int(2) DEFAULT '0',
  `menu_durum` int(1) DEFAULT '0',
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `baskanmenu`
--

INSERT INTO `baskanmenu` (`id`, `menu_ust`, `menu_isim`, `menu_url`, `link`, `sekme`, `menu_sira`, `menu_durum`, `dil`) VALUES
(1, 0, 'Başkan Özgeçmiş', 'icerik/baskan-ozgecmis', ' ', 0, 1, 1, 1),
(2, 0, 'Başkanla Fotoğraflarınız', 'foto/baskanla-fotograflarimiz', ' ', 0, 2, 1, 1),
(3, 0, 'Başkan Görev ve Yetkileri', 'icerik/baskan-gorev-ve-yetkileri', ' ', 0, 3, 1, 1),
(4, 0, 'Başkana Sor', 'iletisim', ' ', 0, 4, 1, 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `baskan_ayarlar`
--

CREATE TABLE `baskan_ayarlar` (
  `id` int(11) NOT NULL,
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `slogan` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `gorsel` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `gorsel2` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `facebook` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `twitter` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `instagram` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `linkedin` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `youtube` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `baskan_ayarlar`
--

INSERT INTO `baskan_ayarlar` (`id`, `adi`, `slogan`, `gorsel`, `gorsel2`, `facebook`, `twitter`, `instagram`, `linkedin`, `youtube`, `dil`) VALUES
(1, 'Adınız Soyadınız', 'BÜYÜKŞEHİR BELEDİYE BAŞKANI', '1.png', '1_1.png', 'https://www.facebook.com/', 'https://twitter.com/?lang=tr', 'https://instagram.com/', 'https://tr.linkedin.com/', 'https://www.youtube.com/?hl=tr&gl=TR', 0);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `bildirimler`
--

CREATE TABLE `bildirimler` (
  `id` int(11) NOT NULL,
  `baslik` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `icon` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `bid` int(11) DEFAULT '0',
  `bildirim` text COLLATE utf8_turkish_ci,
  `ktarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `bildirimler`
--

INSERT INTO `bildirimler` (`id`, `baslik`, `icon`, `bid`, `bildirim`, `ktarih`, `tarih`) VALUES
(1, 'Popup Ayarlar Güncellendi', 'icon-settings', 1, '<strong>Yönetici</strong> açılır mesajı güncelledi.', '1581109200', '1581163425');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `bildirim_sablonu`
--

CREATE TABLE `bildirim_sablonu` (
  `id` int(11) NOT NULL,
  `degiskenler` varchar(255) NOT NULL,
  `sablon_adi` varchar(255) CHARACTER SET utf8 COLLATE utf8_turkish_ci DEFAULT NULL,
  `ubildirim` int(11) DEFAULT '0',
  `sbildirim` int(11) DEFAULT '0',
  `abildirim` int(11) DEFAULT '0',
  `ysbildirim` int(11) DEFAULT '0',
  `konu` varchar(255) CHARACTER SET utf8 COLLATE utf8_turkish_ci DEFAULT NULL,
  `konu2` varchar(255) CHARACTER SET utf8 COLLATE utf8_turkish_ci DEFAULT NULL,
  `icerik` longtext CHARACTER SET utf8 COLLATE utf8_turkish_ci,
  `icerik2` longtext CHARACTER SET utf8 COLLATE utf8_turkish_ci,
  `icerik3` longtext CHARACTER SET utf8 COLLATE utf8_turkish_ci,
  `icerik4` longtext CHARACTER SET utf8 COLLATE utf8_turkish_ci
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Tablo döküm verisi `bildirim_sablonu`
--

INSERT INTO `bildirim_sablonu` (`id`, `degiskenler`, `sablon_adi`, `ubildirim`, `sbildirim`, `abildirim`, `ysbildirim`, `konu`, `konu2`, `icerik`, `icerik2`, `icerik3`, `icerik4`) VALUES
(1, '{adsoyad},{mesajkonu},{email},{telefon},{mesaj},{tarih},{ip},{logo},{domain}', 'İletişim Formu', 1, 0, 1, 1, 'Mesajınızı Aldık!', 'Web sitenizden mesaj var!', '<div style=\"background-color: #4b4f52; width: 100%; float: left; text-align: center; padding-bottom: 40px;\">\r\n<div style=\"background-color: #fff; width: 650px; margin-left: auto; margin-right: auto; text-align: left; margin-top: 40px; border-bottom-width: 6px; border-bottom-style: solid; border-bottom-color: #ed4137;\">\r\n<div style=\"float: left; margin-bottom: 0px; width: 650px; text-align: center;\"><img class=\"\" style=\"text-align: center; float: none; margin-top: 25px;\" src=\"{logo}\" /></div>\r\n<div style=\"clear: both;\">&nbsp;</div>\r\n<div style=\"padding: 0px 25px;\">\r\n<p><strong style=\"font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 18px; color: #ff0000;\">Mesajınızı Aldık!</strong></p>\r\n<div style=\"text-align: center;\"><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">&nbsp;</span></div>\r\n<span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">Bu mesaj, iletişim formumuz aracılığı ile g&ouml;nderdiğiniz e-mailin tarafımıza ulaştığını teyit etmek amacıyla tarafınıza g&ouml;nderilmiştir.</span>\r\n<p style=\"color: #333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">En kısa s&uuml;rede tarafınıza d&ouml;n&uuml;ş yapacağımızdan emin olabilirsiniz.</p>\r\n<p style=\"color: #333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">İyi &ccedil;alışmalar dileriz.</p>\r\n<p><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">Saygılarımızla,</span><br /><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold;\">{domain}</span><br /><br /></p>\r\n</div>\r\n</div>\r\n</div>\r\n<div style=\"clear: both;\">&nbsp;</div>\r\n<p style=\"color: #333; font-family: Calibri; font-size: 14px; margin-top: 10px; text-align: center; font-weight: bold;\">&nbsp;</p>', '<div style=\"background-color: #4b4f52; width: 100%; float: left; text-align: center; padding-bottom: 40px;\">\r\n<div style=\"background-color: #fff; width: 650px; margin-left: auto; margin-right: auto; text-align: left; margin-top: 40px; border-bottom-width: 6px; border-bottom-style: solid; border-bottom-color: #ed4137;\">\r\n<div style=\"float: left; margin-bottom: 0px; width: 650px; text-align: center;\"><img class=\"\" style=\"text-align: center; float: none; margin-top: 25px;\" src=\"{logo}\" /></div>\r\n<div style=\"clear: both;\">&nbsp;</div>\r\n<div style=\"padding: 0px 25px;\">\r\n<p><strong style=\"font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 18px; color: #ff0000;\">Web Sitenizden Mesaj Var!</strong></p>\r\n<div style=\"text-align: center;\"><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">&nbsp;</span></div>\r\n<span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">Sn. Y&ouml;netici,</span>\r\n<p>&nbsp;</p>\r\n<p style=\"color: #333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">Bir ziyaret&ccedil;i, web siteniz &uuml;zerinden size bir mesaj g&ouml;nderdi.&nbsp;</p>\r\n<p style=\"font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\"><span style=\"font-weight: bold; font-size: 18px; color: #ff0000;\">İşte Detaylar;</span></p>\r\n<p><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\"><span style=\"font-weight: bold;\">Adı Soyadı</span>: {adsoyad}<br /></span><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\"><span style=\"font-weight: bold;\">Konu</span>: {mesajkonu}<br /></span><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\"><span style=\"font-weight: bold;\">E-Posta</span>: {email}<br /><span style=\"font-weight: bold;\">Telefon</span>: {telefon}<br /></span><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\"><span style=\"font-weight: bold;\">İşlem Tarihi</span>: {tarih}<br /></span><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\"><span style=\"font-weight: bold;\">IP Numarası</span>: {ip}<br /></span><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\"><span style=\"font-weight: bold;\">Mesajı</span>: {mesaj}</span></p>\r\n<p><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">Saygılarımızla,</span><br /><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold;\">{domain}<br /><br /></span></p>\r\n</div>\r\n</div>\r\n</div>\r\n<div style=\"clear: both;\">&nbsp;</div>\r\n<p style=\"color: #333; font-family: Calibri; font-size: 14px; margin-top: 10px; text-align: center; font-weight: bold;\">&nbsp;</p>', '', 'Sn. Yetkili;\r\n\r\nBir ziyaretçi, iletişim formunuz aracılığı ile size mesaj gönderdi.\r\n\r\nDetaylar;\r\nAdı Soyadı: {adsoyad}\r\nKonu: {mesajkonu}\r\nE-Posta: {email}\r\nTelefon: {telefon}\r\nİşlem Tarihi: {tarih}\r\nIP Numarası: {ip}\r\nMesajı: {mesaj}'),
(10, '{adsoyad},{kadi},{parola},{panel_url},{tarih},{ip},{logo},{domain}', 'Panel Şifre Sıfırlama', 0, 0, 1, 1, '', 'Yönetim Parola Hatırlatma', '', '<div style=\"background-color: #4b4f52; width: 100%; float: left; text-align: center; padding-bottom: 40px;\">\r\n<div style=\"background-color: #fff; width: 650px; margin-left: auto; margin-right: auto; text-align: left; margin-top: 40px; border-bottom-width: 6px; border-bottom-style: solid; border-bottom-color: #ed4137;\">\r\n<div style=\"float: left; margin-bottom: 0px; width: 650px; text-align: center;\"><img class=\"\" style=\"text-align: center; float: none; margin-top: 25px;\" src=\"{logo}\" /></div>\r\n<div style=\"clear: both;\">&nbsp;</div>\r\n<div style=\"padding: 0px 25px;\">\r\n<p style=\"color: #333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">Y&ouml;netici Sn. <strong>{adsoyad}</strong></p>\r\n<p><strong style=\"font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 18px; color: #ff0000;\">Parolanızı unuttuğunuza dair bildiriminizi aldık.</strong></p>\r\n<p style=\"color: #333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">Eğer bunu siz yaptıysanız y&ouml;netim paneli giriş bilgileriniz aşağıda yer almaktadır.</p>\r\n<p style=\"color: #333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">Eğer siz yapmadıysanız l&uuml;tfen bu maili dikkate almayınız.</p>\r\n<p style=\"font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\"><span style=\"font-weight: bold; color: #ff0000;\">Y&ouml;netici Giriş bilgileriniz;</span><br /><span style=\"color: #333333;\"> -----------</span><br /><strong style=\"color: #333333;\">Y&ouml;netim Paneli</strong><span style=\"color: #333333;\">: {panel_url}</span><br /><strong style=\"color: #333333;\">Kullanıcı Adı:</strong><span style=\"color: #333333;\"> {kadi}</span><br /><strong style=\"color: #333333;\">Parola:</strong><span style=\"color: #333333;\"> {parola}</span><br /><span style=\"color: #333333;\"> -----------</span></p>\r\n<p><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px;\">Saygılarımızla,<br /><strong>İşlem Tarihi</strong>: {tarih}<br /><strong>IP No</strong>: {ip}</span><br /><span style=\"color: #333333; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold;\">{domain}</span><br /><br /><br /></p>\r\n</div>\r\n</div>\r\n</div>\r\n<div style=\"clear: both;\">&nbsp;</div>\r\n<p style=\"color: #333; font-family: Calibri; font-size: 14px; margin-top: 10px; text-align: center; font-weight: bold;\">&nbsp;</p>', '', '');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `birimler`
--

CREATE TABLE `birimler` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` text COLLATE utf8_turkish_ci,
  `keywords` text COLLATE utf8_turkish_ci,
  `description` text COLLATE utf8_turkish_ci,
  `durum` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `birimler`
--

INSERT INTO `birimler` (`id`, `sira`, `adi`, `seo`, `resim`, `aciklama`, `keywords`, `description`, `durum`, `tarih`, `dil`) VALUES
(1, 0, 'Zabıta Amirliği', 'zabita-amirligi', '', '<p><strong>Belediye Zabıta Y&ouml;netmeliği\'ne g&ouml;re belediye zabıtasının g&ouml;revleri şunlardır:</strong></p>\r\n<p><strong>a) Beldenin d&uuml;zeni ve esenliği ile ilgili g&ouml;revleri;</strong></p>\r\n<p>1) Belediye sınırları i&ccedil;inde beldenin d&uuml;zenini, belde halkının huzurunu ve sağlığını sağlayıp korumak amacıyla kanun, t&uuml;z&uuml;k ve y&ouml;netmeliklerde, belediye zabıtasınca yerine getirileceği belirtilen g&ouml;revleri yapmak ve yetkileri kullanmak.</p>\r\n<p>2) Belediyece yerine getirileceği belirtilip de mahiyeti itibariyle belediyenin mevcut diğer birimlerini ilgilendirmeyen ve belediye zabıta kuruluşunca yerine getirilmesi tabii olan g&ouml;revleri yapmak.</p>\r\n<p>3) Belediye karar organları tarafından alınmış kararları, emir ve yasakları uygulamak ve sonu&ccedil;larını izlemek,</p>\r\n<p>4) Ulusal bayram ve genel tatil g&uuml;nleri ile &ouml;zellik taşıyan g&uuml;nlerde yapılacak t&ouml;renlerin gerektirdiği hizmetleri g&ouml;rmek.</p>\r\n<p>5) Cumhuriyet Bayramında iş yerlerinin kapalı kalması i&ccedil;in gerekli uyarıları yapmak, tedbirleri almak, bayrak asılmasını sağlamak.</p>\r\n<p>6) Kanunların belediyelere g&ouml;rev olarak verdiği takip, kontrol, izin ve yasaklayıcı hususları yerine getirmek.</p>\r\n<p>7) Belediye cezaları ile ilgili olarak kanunlar uyarınca belediye meclisi ve enc&uuml;meninin koymuş olduğu yasaklara aykırı hareket edenler hakkında gerekli işlemleri yapmak.</p>\r\n<p>8) 2/1/1924 tarihli ve 394 sayılı Hafta Tatili Kanununa g&ouml;re belediyeden izin almadan &ccedil;alışan işyerlerini kapatarak &ccedil;alışmalarına engel olmak ve haklarında kanuni işlemleri yapmak.</p>\r\n<p>9) Bulunmuş eşya ve malları, mevzuat h&uuml;k&uuml;mlerine ve belediye idaresinin bu konudaki karar ve işlemlerine g&ouml;re korumak; sahipleri anlaşıldığında onlara teslim etmek; sahipleri &ccedil;ıkmayan eşya ve malların, mevzuatta ayrıca &ouml;zel h&uuml;k&uuml;m yoksa bakım ve g&ouml;zetim masrafı alındıktan sonra bulana verilmesini sağlamak.</p>\r\n<p>10) 28/4/1926 tarihli ve 831 sayılı Sular Hakkındaki Kanuna g&ouml;re, umumi &ccedil;eşmelerin kırılmasını, bozulmasını &ouml;nlemek; kıran ve bozanlar hakkında işlem yapmak, şehir i&ccedil;me suyuna başka suyun karıştırılmasını veya sağlığa zararlı herhangi bir madde atılmasını &ouml;nlemek, kaynakların etrafını kirletenler hakkında gerekli kanuni işlemleri yapmak.</p>\r\n<p>11) 25/4/2006 tarihli ve 5490 sayılı N&uuml;fus Hizmetleri Kanunu ve bu Kanuna g&ouml;re &ccedil;ıkarılan 31/7/2006 tarihli ve 25245 sayılı Resm&icirc; Gazete\'de yayımlanan Adres ve Numaralamaya İlişkin Y&ouml;netmelik &ccedil;er&ccedil;evesinde binalara verilen numaraların ve sokaklara verilen isimlere ait levhaların s&ouml;k&uuml;lmesine, bozulmasına mani olmak.</p>\r\n<p>12) 23/2/1995 tarihli ve 4077 sayılı T&uuml;keticinin Korunması Hakkında Kanun h&uuml;k&uuml;mleri &ccedil;er&ccedil;evesinde etiketsiz mal, ayıplı mal ve hizmetler, satıştan ka&ccedil;ınma, taksitli ve kampanyalı satışlar ve denetim konularında belediyelere verilen g&ouml;revleri yerine getirmek.</p>\r\n<p>13) Kanunen belediyenin izni veya vergi ve har&ccedil;lara tabi iken izin alınmaksızın veya har&ccedil; ve vergi yatırılmaksızın yapılan işleri tespit etmek, bunların yapılmasında, işletilmesinde, kullanılmasında veya satılmasında sakınca varsa derhal men etmek ve kanuni işlem yapmak.</p>\r\n<p>14) 30/6/1934 tarihli ve 2548 sayılı Ceza Evleriyle Mahkeme Binaları İnşası Karşılığı Olarak Alınacak Har&ccedil;lar ve Mahkumlara &Ouml;dettirilecek Yiyecek Bedelleri Hakkında Kanuna g&ouml;re cezaevinde h&uuml;k&uuml;ml&uuml; olarak bulunanlar ve 11/8/1941 tarihli ve 4109 sayılı Asker Ailelerinden Muhta&ccedil; Olanlara Yardım Hakkında Kanuna g&ouml;re, yardıma muhta&ccedil; olduğunu beyanla m&uuml;racaat edenler hakkında muhta&ccedil;lık durumu araştırması yapmak.</p>\r\n<p>15) 26/5/1981 tarihli ve 2464 sayılı Belediye Gelirleri Kanununa g&ouml;re, izin verilmeyen yerlerin işgaline engel olmak, işgaller ile ilgili tahsilat g&ouml;revlilerine yardımcı olmak.</p>\r\n<p>16) 31/8/1956 tarihli ve 6831 sayılı Orman Kanunu h&uuml;k&uuml;mlerince belediye sınırları i&ccedil;inde ka&ccedil;ak orman emvalinin tespiti halinde orman memurlarına yardımcı olmak,</p>\r\n<p>17) 12/9/1960 tarihli ve 80 sayılı 1580 Sayılı Belediye Kanununun 15 inci Maddesinin 58 inci Bendine Tevfikan Belediyelerce Kurulan Toptancı Hallerinin Sureti İdaresi Hakkında Kanun, 24/6/1995 tarihli ve 552 sayılı Yaş Sebze ve Meyve Ticaretinin D&uuml;zenlenmesi ve Toptancı Halleri Hakkında Kanun H&uuml;km&uuml;nde Kararname h&uuml;k&uuml;mlerine g&ouml;re verilmiş bulunan sanat ve ticaretten men cezalarını yerine getirmek ve hal dışında toptan satışlara mani olmak.</p>\r\n<p>18) 15/5/1959 tarihli ve 7269 sayılı Umumi Hayata M&uuml;essir Afetler Dolayısıyla Alınacak Tedbirlerle Yapılacak Yardımlara Dair Kanun gereğince yangın, deprem ve su baskını gibi hallerde g&ouml;revli ekipler gelinceye kadar gerekli tedbirleri almak.</p>\r\n<p>19) 11/1/1989 tarihli ve 3516 sayılı &Ouml;l&ccedil;&uuml;ler ve Ayar Kanununa ve ilgili y&ouml;netmeliklerine g&ouml;re, &ouml;l&ccedil;&uuml; ve tartı aletlerinin damgalarını kontrol etmek, damgasız &ouml;l&ccedil;&uuml; aletleriyle satış yapılmasını &ouml;nlemek, yetkili tamircilerin yetki belgelerini kontrol etmek, damgalanmamış hileli, ayarı bozuk terazi, kantar, bask&uuml;l, litre gibi &ouml;l&ccedil;&uuml; aletlerini kullandırmamak, kullananlar hakkında gerekli işlemleri yapmak.</p>\r\n<p>20) 14/6/1989 tarihli ve 3572 sayılı İşyeri A&ccedil;ma Ruhsatlarına Dair Kanun H&uuml;km&uuml;nde Kararnamenin Değiştirilerek Kabul&uuml;ne Dair Kanun ile 14/7/2005 tarihli ve 2005/9207 sayılı Bakanlar Kurulu Kararı ile y&uuml;r&uuml;rl&uuml;ğe konulan, İşyeri A&ccedil;ma ve &Ccedil;alışma Ruhsatlarına İlişkin Y&ouml;netmelik h&uuml;k&uuml;mleri gereğince, işyerinin a&ccedil;ma ruhsatı alıp almadığını kontrol etmek, yetkili mercilerce verilen işyeri kapatma cezasını uygulamak ve gereken işlemleri yapmak.</p>\r\n<p>21) 5/12/1951 tarihli ve 5846 sayılı Fikir ve Sanat Eserleri Kanunu kapsamında korunan eser, icra ve yapımların tespit edildiği kitap, kaset, CD, VCD ve DVD gibi taşıyıcı materyallerin yol, meydan, pazar, kaldırım, iskele, k&ouml;pr&uuml; ve benzeri yerlerde satışına izin vermemek ve satışına teşebb&uuml;s edilen materyalleri toplayarak yetkililere teslim etmek.</p>\r\n<p>22) 21/7/1953 tarihli ve 6183 sayılı Amme Alacaklarının Tahsil Usul&uuml; Hakkındaki Kanuna g&ouml;re belediye alacaklarından dolayı haciz yoluyla yapılacak tahsilatlarda yardımcı olmak.</p>\r\n<p>23) 13/3/2005 tarihli ve 5326 sayılı Kabahatler Kanunu ile verilen g&ouml;revleri yerine getirmek.</p>\r\n<p>24) Korunması belediyelere ait tarihi ve turistik tesisleri muhafaza etmek, kirletilmesine, &ccedil;alınmalarına, tahrip edilmelerine ve her ne suretle olursa olsun zarara uğratılmalarına meydan vermemek.</p>\r\n<p>25) M&uuml;lki idare amiri, belediye başkanı veya yetkili kıldığı amirlerin hizmetle ilgili emirlerini yerine getirmek.</p>\r\n<p><strong>b) İmar ile ilgili g&ouml;revleri;</strong></p>\r\n<p>1) Fen elemanlarıyla birlikte yapılacak yasal işlemleri yerine getirmek.</p>\r\n<p>2) 3/5/1985 tarihli ve 3194 sayılı İmar Kanunu ve ilgili imar y&ouml;netmeliklerine g&ouml;re belediye ve m&uuml;cavir alan sınırları i&ccedil;inde g&uuml;venlik tedbirleri alınması gerekli g&ouml;r&uuml;len arsaların &ccedil;evrilmesini sağlamak, a&ccedil;ıkta bulunan kuyu, mahzen gibi yerleri kapattırarak zararlarını ve tehlikelerini gidermek, kanalizasyon ve fosseptik &ccedil;ukurlarının sızıntı yapmalarına mani olmayı sağlamak, hafriyat atıklarının m&uuml;saade edilen yerler dışına d&ouml;k&uuml;lmesini &ouml;nlemek, yıkılacak derecedeki binaları boşalttırmak, yıkım kararlarının uygulanmasında gerekli tedbirleri almak, ruhsatsız yapılan inşaatları tespit etmek ve derhal inşaatı durdurarak belediyenin fen kuruluşlarının yetkili elemanlarıyla birlikte tutanak d&uuml;zenlemek ve haklarında kanuni işlem yapmak.</p>\r\n<p>3) 20/7/1966 tarihli ve 775 sayılı Gecekondu Kanununa g&ouml;re izinsiz yapılaşmaya meydan vermemek, izinsiz yapıların tespitini yapmak ve fen elemanlarının g&ouml;zetiminde yıkılmasını sağlamak ve gerekli diğer tedbirleri almak.</p>\r\n<p>4) 21/7/1983 tarihli ve 2863 sayılı K&uuml;lt&uuml;r ve Tabiat Varlıklarını Koruma Kanununa g&ouml;re, sit ve koruma alanlarında ruhsatsız yapı, izinsiz kazı ve sondaj yaptıranları, izinsiz define arayanları ilgili mercilere bildirmek.</p>\r\n<p><strong>c) Sağlık ile ilgili g&ouml;revleri;</strong></p>\r\n<p>1) 24/4/1930 tarihli ve 1593 sayılı Umumi Hıfzıssıhha Kanunu ve 27/5/2004 tarihli ve 5179 sayılı Gıdaların &Uuml;retimi T&uuml;ketimi ve Denetlenmesine Dair Kanun H&uuml;km&uuml;nde Kararnamenin Değiştirilerek Kabul&uuml; Hakkında Kanun, ilgili t&uuml;z&uuml;k ve y&ouml;netmeliğin uygulanmasında ve alınması gerekli kararların yerine getirilmesinde g&ouml;revli personele yardımcı olmak.</p>\r\n<p>2) Ruhsatsız olarak a&ccedil;ılan veya ruhsata aykırı olarak işletilen işyerleriyle ilgili olarak İşyeri A&ccedil;ma ve &Ccedil;alışma Ruhsatlarına İlişkin Y&ouml;netmelik h&uuml;k&uuml;mlerine g&ouml;re işlem yapmak.</p>\r\n<p>3) İlgili kuruluşlarla işbirliği halinde, 5393 sayılı Kanunun 15 inci maddesinin birinci fıkrasının (l) bendi uyarınca gayri sıhhi m&uuml;esseseler ile umuma a&ccedil;ık istirahat ve eğlence yerlerinin ruhsatlı olup olmadığını denetlemek.</p>\r\n<p>4) Ev, apartman ve her t&uuml;rl&uuml; işyerlerinin &ccedil;&ouml;plerinin sokağa atılmasına mani olmak, &ccedil;&ouml;p kutu ve atıklarının eşelenmesini &ouml;nlemek.</p>\r\n<p>5) Cadde, sokak, park ve meydanlarda mevzuata ve sağlık şartlarına aykırı olarak satış yapan seyyar satıcıları men etmek, bu hususta yetkili mercilerin kararlarıyla zabıta tarafından yerine getirilmesi istenen hizmetleri yapmak.</p>\r\n<p>6) Gıdaların &Uuml;retimi T&uuml;ketimi ve Denetlenmesine Dair Kanun H&uuml;km&uuml;nde Kararnamenin Değiştirilerek Kabul&uuml; Hakkında Kanun, ilgili t&uuml;z&uuml;k ve y&ouml;netmelikler gereğince yıkanmadan, soyulmadan veya pişirilmeden yenen gıda maddelerinin a&ccedil;ıkta satılmasına mani olmak, karıştırıldıklarından ş&uuml;phe edilenlerden tahliller yapılmak &uuml;zere numune alınması hususunda ilgili teşkilata bilgi vermek, yetkili personelin bulunmaması halinde t&uuml;z&uuml;k ve y&ouml;netmeliklerde belirtilen kurallara uygun olarak numuneyi bizzat almak ve yapılan tahlil sonucunda sağlığa zararlı oldukları tespit edilenleri yetkililerin kararı ile imha etmek.</p>\r\n<p>7) Yetkili mercilerin kararları doğrultusunda belirlenen yerler dışında kurban kesilmesini &ouml;nlemek.</p>\r\n<p>8) 9/8/1983 tarihli ve 2872 sayılı &Ccedil;evre Kanununa ve ilgili y&ouml;netmeliklere g&ouml;re &ccedil;evre ve insan sağlığına zarar veren, kişilerin huzur ve s&uuml;k&ucirc;nunu, beden ve ruh sağlığını bozacak şekilde g&uuml;r&uuml;lt&uuml; yapan fabrika, işyeri, at&ouml;lye, eğlence yerleri gibi m&uuml;esseseleri tutanak d&uuml;zenleyerek yetkili mercilere bildirmek ve bu konuda kendisine verilen g&ouml;revleri yerine getirmek.</p>\r\n<p>9) 8/5/1986 tarihli ve 3285 sayılı Hayvan Sağlığı ve Zabıtası Kanununa ve ilgili y&ouml;netmeliğe g&ouml;re bir yerde hastalık &ccedil;ıkması veya sebebi belli olmayan hayvan &ouml;l&uuml;mlerinin g&ouml;r&uuml;lmesi halinde ilgili mercilere haber vermek, bu yerleri ge&ccedil;ici kordon altına almak, yetkililere bu konuda her t&uuml;rl&uuml; yardımı yapmak, imhası gereken hayvanların itlafına yardımcı olmak, bunların insan sağlığına zarar vermeyecek şekilde imhasını yaptırmak.</p>\r\n<p>10) 3285 sayılı Hayvan Sağlığı ve Zabıtası Kanununa ve Y&ouml;netmeliğine g&ouml;re hayvan ve hayvansal &uuml;r&uuml;nlerin nakliyeciliğini yapanların ruhsatlarını ve hayvanların menşe şahadetnamelerini kontrol etmek, mezbaha ve et kombinası dışı kesimleri &ouml;nlemek, bunların hakkında kanuni işlemler yapmak.</p>\r\n<p>11) 24/6/2004 tarihli ve 5199 sayılı Hayvanları Koruma Kanunu ile belediyelere, zabıtanın g&ouml;revleri i&ccedil;erisinde verilen yetkileri kullanmak.</p>\r\n<p>12) İlgili kuruluşlar ile işbirliği halinde fırınların ve ekmek fabrikalarının ve diğer gıda &uuml;retim yerlerinin sağlık şartlarına uygunluğunun denetiminde ilgili kuruluşların talebi halinde nezaret etmek, ekmek ve pide gramajını kontrol etmek, gerekli kanuni işlemleri yapmak.</p>\r\n<p><strong>&ccedil;) Trafikle ilgili g&ouml;revleri;</strong></p>\r\n<p>1) 13/10/1983 tarihli ve 2918 sayılı Karayolları Trafik Kanununa g&ouml;re belediye sınırları ve m&uuml;cavir alanlar i&ccedil;erisindeki karayolları kenarlarında yapılan yapı ve tesisler i&ccedil;in belge aramak, olmayanlar hakkında fen elemanları ile birlikte tutanak d&uuml;zenlemek.</p>\r\n<p>2) Yetkili organların kararı uyarınca belirlenen kara, deniz, su ve demiryolu &uuml;zerinde işletilen her t&uuml;rl&uuml; servis ve toplu taşıma ara&ccedil;ları ile taksilerin sayılarını, bilet &uuml;cret ve tarifeleri ile zaman ve g&uuml;zerg&acirc;hlarını denetlemek.</p>\r\n<p>3) Yetkili organların kararı uyarınca tespit edilen durak yerleri ile karayolu, yol, cadde, sokak, meydan ve benzeri yerler &uuml;zerindeki ara&ccedil; park yerlerinde gereken denetimleri ve diğer iş ve işlemleri yapmak.</p>\r\n<p>4) Kanunlarla belediyelere verilen trafik g&ouml;rev ve yetkilerinden belediye başkanlığınca uygun g&ouml;r&uuml;lenleri y&uuml;r&uuml;tmek,</p>\r\n<p>5) Belediyelerce yapılan alt yapı &ccedil;alışmalarında gerekli trafik &ouml;nlemlerini almak.</p>\r\n<p>6) Belediyelerce dikilen trafik işaret ve levhalarına verilen hasarları tespit etmek.</p>\r\n<p>7) Şehirlerarası otob&uuml;s terminalleri ile diğer garajlardaki otob&uuml;slerin fiyat ve zaman tarifelerini denetlemek, uymayanlara tutanak d&uuml;zenlemek.</p>\r\n<p><strong>d) Yardım g&ouml;revleri;</strong></p>\r\n<p>1) Beldenin yabancısı bulunan kimselere yardımcı olmak.</p>\r\n<p>2) Savaş ve savaşa hazırlık gibi olağan&uuml;st&uuml; hallerde sivil savunma hizmetlerinin gerektirdiği ve kendisine verilen g&ouml;revleri yerine getirmek.</p>\r\n<p>3) Korunmaya ve bakıma muhta&ccedil; &ccedil;ocukları, &ouml;z&uuml;rl&uuml;leri, yaşlıları ve yardıma muhta&ccedil; kişileri tespit halinde sosyal hizmet kurumlarına bildirmek</p>', 'Zabıta Amirliği', 'Zabıta Amirliği', 1, '2020-01-22 13:20:15', 1),
(2, 1, 'Yazı İşleri Müdürlüğü', 'yazi-isleri-mudurlugu', '', '<p><strong>YAZI İŞLERİ M&Uuml;D&Uuml;RL&Uuml;Ğ&Uuml;</strong></p>\r\n<p><strong>a) Belediye Meclisi</strong></p>\r\n<p>1.Belediye Meclisinde g&ouml;r&uuml;ş&uuml;lmesi gereken ve Yazı İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;&rsquo;nden &ccedil;ıkması gereken teklifler i&ccedil;in gerekli evraklar temin edildikten sonra Belediye Meclisinde g&ouml;r&uuml;ş&uuml;lmesi i&ccedil;in Başkanlık Makamından onay almak.</p>\r\n<p>2.Yazı işleri M&uuml;d&uuml;rl&uuml;ğ&uuml; ve diğer M&uuml;d&uuml;rl&uuml;klerden gelen teklifleri tasnif ederek Meclis g&uuml;ndemini oluşturmak.</p>\r\n<p>3.Hazırlanan g&uuml;ndem Başkanlığın da onayı alındıktan sonra Meclis &uuml;yelerine iadeli taahh&uuml;tl&uuml; posta yoluyla tebliğ edilirken, herhangi bir aksaklığın olmaması i&ccedil;in Meclis toplantı g&uuml;n&uuml;nden bir hafta &ouml;nce t&uuml;m &uuml;yelere SMS g&ouml;ndermek.</p>\r\n<p>4.Meclis toplantısında Yazı İşleri M&uuml;d&uuml;r&uuml; ve bir personeli hazır bulunarak, hem toplantı tutanağını tutmak hem de toplantının tamamını ses kayıt cihazları ile kasete &ccedil;ekmek.</p>\r\n<p>5.Toplantı sonrasında aynı g&uuml;n elle yazılan toplantı tutanağı bilgisayar ortamına aktarıldıktan sonra &ccedil;ıktısını almak ve Meclis Başkanı ile Divan Katiplerine imzalatmak.</p>\r\n<p>6.Belediye Meclisinde alınan kararlar doğrultusunda İhtisas Komisyonlarına havale edilen konuların takibini yapmak ve akabinde M&uuml;d&uuml;rl&uuml;ğ&uuml;m&uuml;ze gelen Komisyon raporlarını bilgisayar ortamına aktararak bir sonraki oturuma hazır hale getirmek.</p>\r\n<p>7.Yazılan Meclis kararlarını ekli evrakları ile birlikte onaylanması i&ccedil;in B&uuml;y&uuml;kşehir Belediye Başkanlığına g&ouml;ndermek.</p>\r\n<p>8.Onaylanan kararların uygulamaya ge&ccedil;irilmesi i&ccedil;in diğer birimlere tebliğini yapmak.</p>\r\n<p>9.Her ayın 15. g&uuml;n&uuml;nde Meclis ve İhtisas Komisyonları Huzur haklarının &uuml;yelere &ouml;denebilmesi i&ccedil;in Mali Hizmetler M&uuml;d&uuml;rl&uuml;ğ&uuml;ne tahakkukta bulunmak.</p>\r\n<p><strong>b)Belediye Enc&uuml;meni</strong></p>\r\n<p>1.Enc&uuml;mende g&ouml;r&uuml;ş&uuml;lmesi gereken ve Yazı İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;&rsquo;n&uuml; ilgilendiren konular i&ccedil;in gerekli evraklar temin edildikten sonra Belediye Enc&uuml;meninde g&ouml;r&uuml;ş&uuml;lmesi i&ccedil;in Başkanlık Makamından onay almak.</p>\r\n<p>2.Diğer birimlerden gelen teklifleri karara bağlanması i&ccedil;in Enc&uuml;mene sunmak.</p>\r\n<p>3.Enc&uuml;menin daha derin bilgiye ihtiya&ccedil; duyması halinde M&uuml;d&uuml;rl&uuml;klerden &uuml;st yazı ile ek bilgi talebinde bulunmak</p>\r\n<p>4.Enc&uuml;mende g&ouml;r&uuml;ş&uuml;len dosyaların kararlarını yazıp imzaya sunmak.</p>\r\n<p>5.İmzaları tamamlanan Enc&uuml;men kararların &uuml;st yazılarını yazıp Başkan Yardımcısının onayı alındıktan sonra en kısa s&uuml;rede ilgili birimlere tebligatını yapmak.</p>\r\n<p>6.&Ccedil;ıkan Enc&uuml;men Kararlarını, Enc&uuml;men karar defterine el yazısı ile bire bir aktarmak.</p>\r\n<p>7.Her ayın 15. g&uuml;n&uuml;nde Enc&uuml;men Huzur haklarının &uuml;yelere &ouml;denebilmesi i&ccedil;in Mali Hizmetler M&uuml;d&uuml;rl&uuml;ğ&uuml;ne tahakkukta bulunmak.</p>\r\n<p><strong>c)Asker Aile Yardımı</strong></p>\r\n<p>1.Asker Aile Yardımı i&ccedil;in Belediyemize gelen başvuruları kabul ederek, m&uuml;racaat kabul defterine kayıtlarını yapmak.</p>\r\n<p>2.Asker ailesi hakkında yeterli bilgiye ulaşabilmek i&ccedil;in; Tapu Sicil M&uuml;d&uuml;rl&uuml;ğ&uuml;, N&uuml;fus M&uuml;d&uuml;rl&uuml;ğ&uuml; ve Askerlik Şubesi Başkanlığı ile gerekli yazışmaları yapmak.</p>\r\n<p>3.Yazışmaları tamamlanan askerin hakkında tahkikat yapılması i&ccedil;in Zabıta M&uuml;d&uuml;rl&uuml;ğ&uuml;nce mahallince inceleme yapılmasının sağlanması.</p>\r\n<p>4.Dosyası tamamlanan asker ailesinin maaşa bağlanıp bağlanamayacağı hususunda karar alınması i&ccedil;in Başkanlıktan onay alınarak Enc&uuml;mene sunmak.</p>\r\n<p>5.Kabul g&ouml;ren dosyaları &ouml;deme dosyasının hazırlanması i&ccedil;in Mali Hizmetler M&uuml;d&uuml;rl&uuml;ğ&uuml;ne g&ouml;ndermek, reddedilen dosyaları da Yazı işleri M&uuml;d&uuml;rl&uuml;ğ&uuml; arşivinde kaldırmak.</p>\r\n<p><strong>d)Genel Evrak Servisi</strong></p>\r\n<p>1.Belediyemize Resmi Kurumlardan, Vatandaştan ve T&uuml;zel Kişilerden gelen her t&uuml;rl&uuml; resmi yazı, dilek&ccedil;e ve evrakı Kurum Amirlerinden havale alındıktan sonra elektronik ortamda kaydını yaparak ilgili servis ve m&uuml;d&uuml;rl&uuml;klere zimmet ile tebliği yapmak.</p>\r\n<p>2.Gelen yazıların gerek Yazı İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;nce, gerekse diğer M&uuml;d&uuml;rl&uuml;klerce cevabı yazıldıktan sonra yine Genel Evrak Servisimizce &ccedil;ıkış kaydının vermek.</p>\r\n<p>3.&Ccedil;ıkış kaydı verilen evrak şehir i&ccedil;inde bir yere g&ouml;nderilecekse kurye ile teslimatının yapılmasını sağlamak. Eğer şehir dışında ise zarflama işlemini tamamlayıp aynı g&uuml;n i&ccedil;inde iadeli postaya vermek.</p>\r\n<p>4.Resmi Kurumlarca Belediyemize g&ouml;nderilen g&uuml;nl&uuml; yazıların giriş kaydı yapıldıktan sonra, herhangi bir gecikmeye ve tekide mahal vermeden zamanında cevap verilmesi i&ccedil;in gerekli takibi yapmak.</p>\r\n<p>5.Belediyemize ilk defa dilek&ccedil;e veren Vatandaş veya Firmaların kimlik, adres, telefon ve vergi kimlik bilgilerini Belediyemizin bilgi bankasına kaydetmek suretiyle sicil numarası verilir. Aynı vatandaş veya Firmanın tekrar Kurumumuza başvurması halinde bu sicil numarası sayesinde eskiye y&ouml;nelik işlemlerinin takibini yapmak.</p>\r\n<p>6.Son &ccedil;ıkan genelge - tamim, y&ouml;netmelik, kanun ve t&uuml;z&uuml;kleri g&uuml;ncel olarak internet &uuml;zerinden takibini yaparak, Kurumumuzu ilgilendiren kısımların &ccedil;ıktısını alarak bilgi bankamıza aktarılmasını sağlamak.</p>\r\n<p><strong>e)Evlendirme Memurluğu</strong></p>\r\n<p>4721 Sayılı T&uuml;rk Medeni Kanunun ve Evlendirme Y&ouml;netmeliği gereğince Evlilik işlemleri i&ccedil;in yapılan iş ve işlemler aşağıda belirtildiği şekildedir.</p>\r\n<p>1.Evlenmek &uuml;zere Memurluğumuza başvuran &ccedil;iftlerin başvurularını kabul edip, nikah i&ccedil;in g&uuml;n vermek.</p>\r\n<p>2.Nik&acirc;hlarını başka bir kurumda kıydırmak isteyen vatandaşlara evlenme izin belgesi d&uuml;zenlemek.</p>\r\n<p>3.Nik&acirc;h akitleri ger&ccedil;ekleştirilecek vatandaşları Evlenme K&uuml;t&uuml;ğ&uuml;ne işlemek, uluslararası aile c&uuml;zdanı d&uuml;zenlemek ve verilen g&uuml;nde nik&acirc;hlarını kıymak.</p>\r\n<p>4.Ger&ccedil;ekleştirilen nik&acirc;hların Mernislerini d&uuml;zenleyerek 10 g&uuml;n i&ccedil;inde İl&ccedil;e N&uuml;fus M&uuml;d&uuml;rl&uuml;ğ&uuml;ne bildirmek.</p>\r\n<p>5.Evlendikten sonra kendi soyadını kullanmak isteyen bayanlara dilek&ccedil;e hazırlama ve gerekli işlemlerini tamamlamak.</p>\r\n<p>6.Talepleri doğrultusunda; d&uuml;ğ&uuml;n salonu, otel, k&uuml;lt&uuml;r merkezi gibi yerlere memur g&ouml;revlendirmek suretiyle nik&acirc;h hizmetini vatandaşın ayağına kadar g&ouml;t&uuml;rmek.</p>\r\n<p>7.Her ayın son haftasında evlenen &ccedil;iftlerin adı, soyadı, telefon ve adres bilgileri toplanarak rapor haline bilgilerin toplanması.</p>\r\n<p><strong>f)Başbakanlık İletişim Merkezi (BİMER) &ndash; Doğrudan Başbakanlık</strong></p>\r\n<p>Başbakanlık İletişim Merkezi; BİMER, bilişim ve iletişim teknolojileri kullanılarak hayata ge&ccedil;irilen bir halkla ilişkiler uygulamasıdır. BİMER ile oluşturulan sistem sayesinde vatandaş ile devlet arasındaki iletişim kanallarının t&uuml;m&uuml; a&ccedil;ık tutularak m&uuml;racaatların her zaman ve her yerden yapılabilmesinin yanı sıra, m&uuml;racaatlara, cevapların daha hızlı, etkin ve ekonomik bir şekilde verilebilmesine imk&acirc;n sağlanmıştır.</p>\r\n<p><strong>g)Genel İdari Hizmetler</strong></p>\r\n<p>1)Belediyemize gelen posta iletilerini teslim almak ve ilgili birimlere tebliğ etmek.</p>\r\n<p>2)Kurum i&ccedil;i veya dışında verilecek olan seminer, eğitim ve buna benzer etkinliklerin ger&ccedil;ekleşebilmesi i&ccedil;in gereken İnsan Kaynakları ve Eğitim M&uuml;d&uuml;rl&uuml;ğ&uuml;ne teklifte bulunma.</p>', 'Yazı İşleri Müdürlüğü', 'Yazı İşleri Müdürlüğü', 1, '2020-01-22 13:22:24', 1),
(3, 2, 'Mali Hizmetler Müdürlüğü', 'mali-hizmetler-mudurlugu', '', '<p><strong>G&ouml;rev ve Sorumlulukları</strong></p>\r\n<p>Başkanlık tarafından onaylandıktan sonra ilgili firmalara tebligat yapmak, s&ouml;zleşmeler hazırlamak ve sonu&ccedil;larını takip etmek,</p>\r\n<p>Temin edilen malzemelerle ilgili tahakkuk evraklarını hazırlayıp Mali Hizmetler M&uuml;d&uuml;rl&uuml;ğ&uuml;ne iletmek,</p>\r\n<p>Belediyemiz b&uuml;nyesindeki m&uuml;d&uuml;rl&uuml;klerce alımı ger&ccedil;ekleştirilecek mal, hizmet, yapım ve danışmanlık hizmeti alımlarının 4734 sayılı Kamu İhale Kanunu&rsquo;nun 22/d maddesine g&ouml;re doğrudan temin ve istisnalar başlıklı 3. maddesine g&ouml;re tedarik edilmesinde piyasa araştırmasının yapılması ve sekretarya hizmetlerini vermek,</p>\r\n<p>Belediye merkezinin ve dış birimleri b&uuml;nyesinde verimli ve sağlıklı bir &ccedil;alışma ortamının oluşturulmasına y&ouml;nelik genel hizmetlerin y&uuml;r&uuml;t&uuml;lmesini sağlamak</p>\r\n<p>Kurum faaliyetlerinin y&uuml;r&uuml;t&uuml;lebilmesi i&ccedil;in gerekli her t&uuml;rl&uuml; demirbaş eşya, b&uuml;ro makinesi, mobilya ve mefruşat, basılı k&acirc;ğıt ve kırtasiye ile belediyenin ihtiyacı olan yedek par&ccedil;a, hammadde, yarı mamul v.b. diğer malzemelerin onaylanan iş planları uyarınca istenilen &ouml;zelliklerde ve asgari maliyetle zamanında temini ve ilgili birimlere ulaştırılması &ccedil;alışmalarını kontrol etmek</p>\r\n<p>Ara&ccedil;ların bakım- onarım hizmetlerinin zamanında ger&ccedil;ekleştirilmesi i&ccedil;in standartlara uygun satın alınan yedek par&ccedil;a ve malzemeleri muayene ederek teslim almak</p>\r\n<p>Ambar giriş-&ccedil;ıkışını bilgisayar ortamında yapmak</p>\r\n<p>Ara&ccedil;ların sigorta işlemleri ve periyodik bakımlarının yapılmasını sağlamak</p>\r\n<p>Yıl sonunda maliyet &ccedil;alışması yaparak, ekonomik &ouml;m&uuml;rleri dolmuş ara&ccedil;ların 237 Sayılı taşıtlar kanununa g&ouml;re kayıttan d&uuml;ş&uuml;r&uuml;lmesi işlemlerini y&uuml;r&uuml;tmek</p>\r\n<p>Belediyenin terkin ve diğer yollarla hurdaya ayrılan malzemelerini toplayarak muhafaza etmek</p>\r\n<p>Birime kurum i&ccedil;i ve kurum dışından gelen evrakların, dilek&ccedil;elerin kayıt, dosyalama, arşivleme ve yazışma işlemlerinin sağlamasını yapmakla g&ouml;revlidir.</p>\r\n<p>Satın alma M&uuml;d&uuml;r&uuml; g&ouml;rev ve hizmetlerinden &ouml;t&uuml;r&uuml; Belediye Başkanı&rsquo;na karşı sorumlu olup;</p>\r\n<p><br />a)&nbsp;Belediye Başkanı&rsquo;nın g&ouml;zetimi ve denetimi altında, mevzuat gereği M&uuml;d&uuml;rl&uuml;ğ&uuml;n sevk ve idaresini, organizasyonunu, kadrolar arasında g&ouml;revlerin dağıtılmasını, iş ve işlemlerin yeniden tanzimine ilişkin dahili d&uuml;zenlemeleri yapmak,</p>\r\n<p>b)&nbsp;M&uuml;d&uuml;rl&uuml;ğ&uuml; i&ccedil;in, Başkanlığın gayeleri, politikaları, b&uuml;t&ccedil;eleri ile uyumlu hedefler planlar, programlar geliştirir ve verilen sorumluluğa g&ouml;re icraatlarda bulunmak,</p>\r\n<p>c)&nbsp;Emrindeki elemanlara iş tariflerini a&ccedil;ıklar, inisiyatifleri ve yetkilerini kullanmayı sağlamak,</p>\r\n<p>&ccedil;)&nbsp;M&uuml;d&uuml;rl&uuml;ğ&uuml;n g&ouml;rev alanı i&ccedil;erisinde ihale iş ve işlemlerin, ihale mevzuatı &ccedil;er&ccedil;evesinde yapılmasını sağlamak,</p>\r\n<p>d)&nbsp;M&uuml;d&uuml;rl&uuml;k personelinin atama, yer değiştirme, &ouml;d&uuml;llendirme ve cezalandırma hususlarını Personel M&uuml;d&uuml;rl&uuml;ğ&uuml; ile işbirliği yaparak yerine getirmek,</p>\r\n<p>e)&nbsp;Ekonomik &uuml;retkenlik, y&uuml;ksek verimlilik ve performans arttırıcı etki oluşturmak amacıyla mevzuat ve stratejik hedefler &ccedil;er&ccedil;evesinde b&uuml;t&ccedil;e uygulamalarını sağlamak,</p>\r\n<p>f)&nbsp;Hizmetlerin mevzuat &ccedil;er&ccedil;evesinde yerine getirilmesinden Belediye Başkanı&rsquo;na karşı sorumludur.</p>\r\n<p>g)&nbsp;Bilgi edinme yasası ve diğer yasalarda belirtilen konularla ilgili verilen dilek&ccedil;elere en ge&ccedil; 15 iş g&uuml;n&uuml; i&ccedil;erisinde yazılı cevap vermek,</p>\r\n<p>ğ)&nbsp;Resmi gazetede &ccedil;ıkan ve m&uuml;d&uuml;rl&uuml;ğ&uuml;n&uuml; ilgilendiren kanun, t&uuml;z&uuml;k, y&ouml;netmelik ve genelgeleri arşivlemek,</p>\r\n<p>h)&nbsp;Emrinde &ccedil;alışan memurların, izin, vizite g&uuml;nl&uuml;k g&ouml;rev &ccedil;izelgelerini takip etmek,</p>\r\n<p>ı)&nbsp;Personeli bilgilendirmek amacı ile hizmet i&ccedil;i eğitim yapmak ve buna dair tutanak tanzim edip, dosyada saklamak.</p>\r\n<p>i)&nbsp;Gider b&uuml;t&ccedil;esini hazırlamak ve mali hizmetler m&uuml;d&uuml;rl&uuml;ğ&uuml;ne g&ouml;ndermek, harcamaları usul&uuml;ne uygun olarak yapmak ve b&uuml;t&ccedil;e ilkelerine riayet etmek,</p>\r\n<p>j)&nbsp;Stratejik plan, performans programı, toplam kalite y&ouml;netimi ve coğrafi bilgi sistemi uygulamalarında m&uuml;d&uuml;rl&uuml;ğ&uuml;n sorumlu olduğu hususları uygulamak, m&uuml;d&uuml;rl&uuml;ğe ait işleri zamanında yerine getirmek, arşiv sistemini d&uuml;zenli bir şekilde y&uuml;r&uuml;tmek<br />&nbsp;</p>', 'Mali Hizmetler Müdürlüğü', 'Mali Hizmetler Müdürlüğü', 1, '2020-01-22 13:24:09', 1),
(4, 3, 'İnsan Kaynakları Ve Eğit.Müdürlüğü', 'insan-kaynaklari-ve-egit-mudurlugu', '', '<p><strong>Belediye Başkanlık makamı işlerini koordine eden ve Belediye i&ccedil;i ve Belediye dışı iletişim işlemlerinin y&uuml;r&uuml;t&uuml;ld&uuml;ğ&uuml; birimdir.&nbsp;</strong></p>\r\n<p><strong>G&Ouml;REV ALANI</strong></p>\r\n<p>Belediye Başkanı&rsquo;nın ziyaret, davet, karşılama, ağırlama, uğurlama, a&ccedil;ılış, milli ve dini bayramlar ile mahalli kurtuluş g&uuml;nleri vesaire &ouml;nemli g&uuml;nlerde d&uuml;zenlenen organizasyonlarda her t&uuml;rl&uuml; protokol &nbsp;ve t&ouml;ren işlerini d&uuml;zenlemek, y&uuml;r&uuml;tmek, zaman ve yerlerini Belediye Başkanı&rsquo;na bildirmek, bu gibi t&ouml;renlere Belediye Başkanı&rsquo;nın iştirak etmesini temin etmek, Belediye Başkanı&rsquo;nın iştirak edemediği program, t&ouml;ren v.s.lerde başkan adına protokol gereklerini yerine getirmek.</p>\r\n<p>Belediye\'yi ve Belediye Başkanı\'nı yurt i&ccedil;i veya yurt dışında ziyarete gelen temsilciler ve t&uuml;zel kişileri ağırlamak ve gerekli t&uuml;m d&uuml;zenlemeleri yapmak,</p>\r\n<p>Belediye Başkanı\'nın g&uuml;nl&uuml;k, haftalık ve aylık &ccedil;alışma programının hazırlamak, randevu taleplerini değerlendirip programa almak ve telefon g&ouml;r&uuml;şmelerini sağlamak. Başkan\'ın zamanını planlamasına yardımcı olmak i&ccedil;in gerekli t&uuml;m işlemleri yapmak,</p>\r\n<p>Randevu g&uuml;nleri ve/veya diğer g&uuml;nlerde vatandaşları veya kurum i&ccedil;inde g&ouml;r&uuml;şmek isteyen personel ile Belediye Başkanı\'nın g&ouml;r&uuml;şmelerini sağlamak,</p>\r\n<p>Başkanlık ve Belediye birimleri arasında koordinasyonun temini i&ccedil;in gerekli işlemlerinin yapılmasını takip ederek sonu&ccedil;landırmak, &nbsp; &nbsp;</p>\r\n<p>Başkan tarafından yapılacak konuşma ve sunumlarda gerekli hazırlıklara ilişkin t&uuml;m işlemlerin yapılmasını, kontrol ve takip edilerek sonu&ccedil;landırılmasını sağlamak,</p>\r\n<p>Başkanlığın yurt dışı ve kardeş şehirlerle olan iletişim ve faaliyetlerinin organize edilmesi, Başkanlığa gelen yabancı misafirlere ev sahipliği yapılması ve dış &uuml;lkelere yapılan gezilerin organize edilmesi işlemlerinin yapılmasını ve takip edilerek sonu&ccedil;landırılmasını sağlamak,</p>\r\n<p>Başkanlığı ilgilendiren toplantı, brifing ve g&ouml;r&uuml;şmeleri d&uuml;zenlemek, bunlara ait &ouml;nemli not ve tutanakların tutulması ve yayımlanması işlemlerinin yapılmasını sağlamak.</p>\r\n<p>Resmi ve &ouml;zel tebrik, kutlama, teşekk&uuml;r, taziye, mektup gibi konuların hazırlanması</p>\r\n<p>M&uuml;d&uuml;rl&uuml;ğe faks, e-mail, posta yoluyla gelen şikayet ve talepler ve davetleri başkana sunmak; verilen talimat doğrultusunda ilgili yerlere dağıtımını yapmak ve sonucunu takip etmek.</p>\r\n<p>Belediyenin ve Belediye Başkanının t&uuml;m medya kuruluşları (gazeteler, dergiler, televizyonlar, radyolar) ile iletişimini Basın Yayın ve Halkla İlişkiler M&uuml;d&uuml;rl&uuml;ğ&uuml; ile koordineli olarak sağlamak.</p>', 'İnsan Kaynakları Ve Eğit.Müdürlüğü', 'İnsan Kaynakları Ve Eğit.Müdürlüğü', 1, '2020-01-22 13:25:12', 1),
(5, 4, 'Fen İşleri İmar Müdürlüğü', 'fen-isleri-imar-mudurlugu', '', '<p><strong>Nereden Gelir?</strong></p>\r\n<p><br />Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>\r\n<p><strong>Neden Kullanırız?</strong></p>\r\n<p><br />Yinelenen bir sayfa i&ccedil;eriğinin okuyucunun dikkatini dağıttığı bilinen bir ger&ccedil;ektir. Lorem Ipsum kullanmanın amacı, s&uuml;rekli \'buraya metin gelecek, buraya metin gelecek\' yazmaya kıyasla daha dengeli bir harf dağılımı sağlayarak okunurluğu artırmasıdır. Şu anda bir&ccedil;ok masa&uuml;st&uuml; yayıncılık paketi ve web sayfa d&uuml;zenleyicisi, varsayılan mıgır metinler olarak Lorem Ipsum kullanmaktadır. Ayrıca arama motorlarında \'lorem ipsum\' anahtar s&ouml;zc&uuml;kleri ile arama yapıldığında hen&uuml;z tasarım aşamasında olan &ccedil;ok sayıda site listelenir. Yıllar i&ccedil;inde, bazen kazara, bazen bilin&ccedil;li olarak (&ouml;rneğin mizah katılarak), &ccedil;eşitli s&uuml;r&uuml;mleri geliştirilmiştir.</p>', 'Fen İşleri İmar Müdürlüğü', 'Fen İşleri İmar Müdürlüğü', 1, '2020-01-22 13:26:53', 1),
(6, 5, 'Muhtarlık İşleri Müdürlüğü', 'muhtarlik-isleri-mudurlugu', '', '<p><strong>BİRİNCİ B&Ouml;L&Uuml;M</strong><br />Ama&ccedil;, Kapsam, Dayanak ve Tanımlar</p>\r\n<p><strong>Ama&ccedil;</strong></p>\r\n<p>MADDE 1 - Bu y&ouml;netmeliğin amacı, İ&ccedil;işleri Bakanlığı&rsquo;nın 2015/8 Sayılı Genelgesi esas alınarak kurulmuş olan Muhtarlık İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;n&uuml;n kuruluş, g&ouml;rev, yetki ve sorumlulukları ile &ccedil;alışma usul ve esaslarını d&uuml;zenlemektir.</p>\r\n<p><strong>Kapsam</strong></p>\r\n<p>MADDE 2 - Bu Y&ouml;netmelik, Muhtarlık İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;ndeki personelin g&ouml;rev, yetki ve sorumlulukları ile &ccedil;alışma usul ve esaslarını kapsar.</p>\r\n<p><strong>Dayanak</strong></p>\r\n<p>MADDE 3 - Bu y&ouml;netmelik; Anayasa&rsquo;nın 124. maddesi ve 5393 sayılı Belediye Kanunu 15/b maddesine ve diğer ilgili mevzuat h&uuml;k&uuml;mlerine istinaden hazırlanmıştır.</p>\r\n<p><strong>Tanımlar</strong></p>\r\n<p>MADDE 4 - Bu y&ouml;netmelikte ge&ccedil;en: a) Belediye :Salıpazarı Belediyesi&rsquo;ni,</p>\r\n<p>b) Başkanlık :Salıpazarı Belediye Başkanlığı&rsquo;nı,</p>\r\n<p>c) B&uuml;y&uuml;kşehir : Samsun B&uuml;y&uuml;kşehir Belediyesi&rsquo;ni,</p>\r\n<p>d) M&uuml;d&uuml;rl&uuml;k : Muhtarlık İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;&rsquo;n&uuml;,</p>\r\n<p>e) M&uuml;d&uuml;r : Muhtarlık İşleri M&uuml;d&uuml;r&uuml;&rsquo;n&uuml;,</p>\r\n<p>f) Y&ouml;netmelik : Muhtarlık İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml; G&ouml;rev ve &Ccedil;alışma Y&ouml;netmeliğini ifade eder.</p>\r\n<p>g) MBS: Muhtar Bilgi Sistemi</p>\r\n<p><br /><strong>İKİNCİ B&Ouml;L&Uuml;M</strong></p>\r\n<p><br />Kuruluş ve Teşkilat</p>\r\n<p><strong>Kuruluş</strong></p>\r\n<p>MADDE 5- 5393 sayılı Belediye Kanununun 48. ve 49.maddeleri ve 22.04.2006 tarih ve 26147 sayılı Resmi Gazetede yayımlanan Belediye ve Bağlı Kuruluşları ile Mahalli İdare Birlikleri Norm Kadro İlke ve Standartlarına Dair Y&ouml;netmelik esasları &ccedil;er&ccedil;evesinde Salıpazarı Belediye Meclisinin 05.05.2015 tarih ve 52 sayılı kararı ile kurulmuş idari y&uuml;r&uuml;tme organıdır.</p>\r\n<p><strong>Teşkilat</strong></p>\r\n<p>MADDE 6 - Muhtarlık İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;n&uuml;n Personel yapısı aşağıda belirtilen şekildedir.</p>\r\n<p>a) M&uuml;d&uuml;r</p>\r\n<p>b) Şef</p>\r\n<p>c) Memurlar</p>\r\n<p>d) İş&ccedil;iler</p>\r\n<p>e) S&ouml;zleşmeli memurlar</p>\r\n<p>f) Diğer personel</p>\r\n<p>g) Hizmetli personel</p>\r\n<p>&nbsp;</p>\r\n<p><strong>&Uuml;&Ccedil;&Uuml;NC&Uuml; B&Ouml;L&Uuml;M</strong></p>\r\n<p><br />G&ouml;rev, Yetki ve Sorumluluk</p>\r\n<p><strong>M&uuml;d&uuml;rl&uuml;ğ&uuml;n g&ouml;revleri</strong></p>\r\n<p>MADDE 7 &ndash; (1) Muhtarlık İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;, İ&ccedil;işleri Bakanlığının 2015/8 Sayılı Genelgesinde belirtilen iş ve işlemlerin tamamının etkin ve verimli bir şekilde yapılmasından sorumludur.</p>\r\n<p>(2) İ&ccedil;işleri Bakanlığı tarafından www.muhtar.gov.tr &uuml;zerinden oluşturulan MUHTAR BİLGİ SİSTEMİ aracılığıyla belediyemize iletilen talep, şikayet, &ouml;neri ve isteklerin mevzuatta belirtilen s&uuml;relerde karşılanmasını ve sonu&ccedil;landırılmasını sağlamak.</p>\r\n<p>(3) MBS haricinde muhtarlıklardan gelen (bizzat, telefonla, maille, dilek&ccedil;e ile vb)<br />hert&uuml;rl&uuml; talebin uygun birime ve uygun kişilere y&ouml;nlendirilmesini sağlamak ve sonu&ccedil;larını takip etmek.</p>\r\n<p>(4) MBS &uuml;zerinden veya başka yollarla muhtarlardan gelen t&uuml;m talep, şikayet, &ouml;neri ve isteklerle ilgili istatistiki kayıtları tutmak, raporlamak ve başkanlığa sunmak.</p>\r\n<p>(5) Yılın belirli zamanlarında Muhtarlarla &ldquo;istişare toplantıları&rdquo; d&uuml;zenlemek ve mahalle bazlı hizmetlerin değerlendirmesini yapmak.</p>\r\n<p>(6) Belediyemiz m&uuml;d&uuml;rl&uuml;kleri tarafından yapılan t&uuml;m hizmetlerin mahalle bazlı raporlanmasını sağlamak. İlgili m&uuml;d&uuml;rl&uuml;klerde mahalle bazlı raporlama ve arşiv oluşturulmasını sağlamak.</p>\r\n<p>(7) Belediyemizde &uuml;retilen t&uuml;m hizmetlerle ilgili mahalle bazlı raporlar hazırlayarak Başkanlık makamına sunmak.</p>\r\n<p><br /><strong>M&uuml;d&uuml;rl&uuml;k yetkisi</strong></p>\r\n<p>MADDE 8 - Muhtarlık İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;, bu y&ouml;netmelikte sayılan g&ouml;revleri ve 5393 sayılı Belediye Kanununa dayanarak Belediye Başkanınca kendisine verilen t&uuml;m g&ouml;revleri kanunlar &ccedil;er&ccedil;evesinde yapmaya yetkilidir.</p>\r\n<p><strong>M&uuml;d&uuml;rl&uuml;ğ&uuml;n sorumluluğu</strong></p>\r\n<p>MADDE 9 - Muhtarlık İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;, Belediye Başkanınca verilen ve bu y&ouml;netmelikte tarif edilen g&ouml;revler ile ilgili yasalarda belirtilen g&ouml;revleri gereken &ouml;zen ve &ccedil;abuklukla yapmak ve y&uuml;r&uuml;tmekle sorumludur.</p>\r\n<p><strong>M&uuml;d&uuml;r&uuml;n g&ouml;rev, yetki ve sorumluluğu</strong></p>\r\n<p>MADDE 10 - (1) Muhtarlık İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;n&uuml; Başkanlık Makamına karşı temsil eder.</p>\r\n<p>(2) M&uuml;d&uuml;rl&uuml;ğ&uuml;n y&ouml;netiminde tam yetkili kişidir.</p>\r\n<p>(3) &ldquo;M&uuml;d&uuml;rl&uuml;ğ&uuml;n G&ouml;revleri&rdquo; kısmında tanımlanmış t&uuml;m işleri koordine eder, etkili ve verimli bir şekilde sonu&ccedil;lanmasını sağlar.<br />(4) Muhtarlık İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;n&uuml;n Tahakkuk Amiri, Harcama Yetkilisi ve M&uuml;d&uuml;rl&uuml;k personelinin disiplin amiridir.</p>\r\n<p>(5) Muhtarlık İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml; ile diğer M&uuml;d&uuml;rl&uuml;kler arasında koordinasyonu sağlar.</p>\r\n<p>(6) M&uuml;d&uuml;rl&uuml;ğ&uuml;n yıllık Performans Programını ve buna bağlı olarak yıllık B&uuml;t&ccedil;esini hazırlar.</p>\r\n<p>(7) Performans Hedefleri, İş kapasitesi ve Faaliyet alanlarını dikkate alarak g&uuml;nl&uuml;k,<br />haftalık, aylık ve yıllık &ccedil;alışma planları hazırlar ve bu planların uygulanmasını sağlar.</p>\r\n<p>(8) Performans Hedefleri ve B&uuml;t&ccedil;esine g&ouml;re bir yıl boyunca kullandığı kaynakları ve yaptığı faaliyetleri g&ouml;steren &ldquo;Yıllı Faaliyet Raporu&rdquo;nu hazırlar.</p>\r\n<p>&nbsp;(9) Vatandaşa y&ouml;nelik hizmetlerle ilgili &ldquo;hizmet standartları&rdquo; belirleyerek daha hızlı ve etkin hizmet vermek i&ccedil;in tedbirler alır, s&uuml;re&ccedil; iyileştirmesi yapar.</p>\r\n<p>(10) Faaliyet alanıyla ilgili vatandaş memnuniyeti &ouml;l&ccedil;&uuml;mleri yapar.</p>\r\n<p>(11) M&uuml;d&uuml;rl&uuml;ğ&uuml;nde Kamu İ&ccedil; Kontrol Sisteminin ve Kalite Y&ouml;netim Sisteminin kurulmasından birinci derecede sorumludur. Bu konuda Strateji Geliştirme M&uuml;d&uuml;rl&uuml;ğ&uuml; ile koordineli &ccedil;alışır.</p>\r\n<p>(12) M&uuml;d&uuml;rl&uuml;ğ&uuml;n mevcut dosya, evrak ve diğer bilgilerinin Devlet Arşivleri Genel M&uuml;d&uuml;rl&uuml;ğ&uuml;nce belirlenen &ldquo;Standart Dosya Planı&rdquo; formatına uygun olarak d&uuml;zenlenmesini ve arşivlenmesini sağlar. Bu konuda Yazı İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml; ile koordineli &ccedil;alışır.</p>\r\n<p>(13) T&uuml;m dosya, evrak ve bilgiler i&ccedil;in mevzuatın &ouml;ng&ouml;rd&uuml;ğ&uuml; şekilde &ldquo;Saklama Planı&rdquo; oluşturur, s&uuml;resi gelenlerin imha edilmesini sağlar.</p>\r\n<p>(14) İş s&uuml;re&ccedil;lerinin iyileştirilmesine y&ouml;nelik &ccedil;alışmalar yapar.</p>\r\n<p>(15) Personelin eğitim ihtiya&ccedil;larını belirleyerek, eğitim almalarını sağlar.</p>\r\n<p>(16) Mesai saatlerinin etkin / verimli kullanılması ve birim personelinin uyum i&ccedil;inde &ccedil;alışmasını sağlar.</p>\r\n<p>(17) Birimi ile ilgili faaliyet raporlarının periyodik olarak hazırlanması ve Başkanlığa sunulmasını sağlar.</p>\r\n<p>(18) İş g&uuml;venliğini sağlar ve &ccedil;alışma ortamını s&uuml;rekli geliştirme &ccedil;abası i&ccedil;inde olur.</p>\r\n<p>(19) Birim personelinin g&ouml;rev, yetki ve sorumluluklarını belirler, g&ouml;revli personelin disiplin amiri olarak g&ouml;rev ve sorumluluklarını yerine getirir.</p>\r\n<p>(20) Yasalarla verilen her t&uuml;rl&uuml; ek g&ouml;revi yapar.</p>\r\n<p><strong>Muhtar Bilgi Sistemi Sorumlusunun g&ouml;rev, yetki ve sorumluluğu</strong></p>\r\n<p>MADDE 11&ndash; (1) İ&ccedil;işleri Bakanlığı tarafından www.muhtar.gov.tr &uuml;zerinden oluşturulan MUHTAR BİLGİ SİSTEMİ&rsquo;nin koordinasyonunu sağlar.</p>\r\n<p>(2) MBS aracılığıyla belediyemize iletilen talep, şikayet, &ouml;neri ve isteklerin mevzuatta belirtilen s&uuml;relerde karşılanmasını ve sonu&ccedil;landırılmasını sağlar.</p>\r\n<p>(3) M&uuml;d&uuml;rl&uuml;kler tarafından yapılacak geri d&ouml;n&uuml;şlerin MBS talep, şikayet, &ouml;neri ve isteğinin tam karşılığı olup olmadığını sorgular, sonu&ccedil;ların etkinliğini denetler ve iyileştirilmesini sağlar.</p>\r\n<p>(4) MBS haricinde muhtarlıklardan gelen (bizzat, telefonla, maille, dilek&ccedil;e ile vb) her t&uuml;rl&uuml; talebin uygun birime ve uygun kişilere y&ouml;nlendirilmesini sağlar ve sonu&ccedil;ların uygunluğunu denetler.</p>\r\n<p>(5) MBS &uuml;zerinden veya başka yollarla muhtarlardan gelen t&uuml;m talep, şikayet, &ouml;neri ve isteklerle ilgili istatistiki kayıtları tutar, raporlar ve başkanlığa sunar.</p>\r\n<p>(6) &Ouml;zellikle karşılanamayan taleplerle ilgili gerek&ccedil;e raporları oluşturur.</p>\r\n<p><strong>Diğer Personelinin g&ouml;rev, yetki ve sorumluluğu</strong></p>\r\n<p>MADDE 17 - (1) G&ouml;revi gereği M&uuml;d&uuml;r tarafından kendilerine verilen işleri yasalar ve y&ouml;netmelik esaslarına g&ouml;re yapar.</p>\r\n<p>(2) M&uuml;d&uuml;rl&uuml;ğe gelen telefonlara bakar, gerekli hallerde M&uuml;d&uuml;r&uuml;n&uuml; bilgilendirir.<br />(3) M&uuml;d&uuml;rl&uuml;kte &ldquo;Standart Dosya Planı&rdquo;nın eksiksiz ve mevzuata uygun y&uuml;r&uuml;t&uuml;lmesini sağlar.</p>\r\n<p>(4) M&uuml;d&uuml;r&uuml;yle birlikte Birim Arşivi oluşturur, Devlet Arşiv Hizmetleri Hakkında Y&ouml;netmelik h&uuml;k&uuml;mlerine g&ouml;re mevcut dosyaların &ldquo;Saklama Planı&rdquo;nı oluşturur ve takibini yapar. Bu konuda Yazı İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml; ile koordineli &ccedil;alışır.</p>\r\n<p>(5) M&uuml;d&uuml;rl&uuml;ğe gelen-giden evrakların kayıtlarını tutar, yazışmaları hazırlar.</p>\r\n<p>(6) M&uuml;d&uuml;r&uuml;n talimatıyla satın alım taleplerini a&ccedil;ar ve satın alım sonu&ccedil;lanana kadar s&uuml;reci takip eder.</p>\r\n<p>(7) M&uuml;d&uuml;rl&uuml;kteki demirbaş malzemelerinin kayıtlarını tutar.</p>\r\n<p>(8) M&uuml;d&uuml;rl&uuml;k personeli, M&uuml;d&uuml;r ve m&uuml;d&uuml;r&uuml;n yetkili kıldığı kişiler tarafından verilen diğer işleri yapar.</p>\r\n<p><br /><strong>D&Ouml;RD&Uuml;NC&Uuml; B&Ouml;L&Uuml;M</strong><br />G&ouml;rev ve Hizmetlerin İcrası</p>\r\n<p><strong>G&ouml;revin planlanması</strong></p>\r\n<p>MADDE 18 - Muhtarlık İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;ndeki iş ve işlemler M&uuml;d&uuml;r tarafından d&uuml;zenlenen plan dahilinde y&uuml;r&uuml;t&uuml;l&uuml;r.</p>\r\n<p><strong>G&ouml;revin y&uuml;r&uuml;t&uuml;lmesi</strong></p>\r\n<p>MADDE 19 - M&uuml;d&uuml;rl&uuml;kte g&ouml;revli t&uuml;m personel, kendilerine verilen g&ouml;revleri yasa ve y&ouml;netmelikler doğrultusunda gereken &ouml;zen ve s&uuml;ratle yapmak zorundadır.</p>\r\n<p><strong>BEŞİNCİ B&Ouml;L&Uuml;M<br /></strong>İşbirliği ve Koordinasyon</p>\r\n<p><strong>M&uuml;d&uuml;rl&uuml;k birimleri arasında işbirliği</strong></p>\r\n<p>MADDE 20- (1) M&uuml;d&uuml;rl&uuml;k dahilinde &ccedil;alışanlar arasındaki işbirliği ve koordinasyon, M&uuml;d&uuml;r tarafından sağlanır.</p>\r\n<p>(2) M&uuml;d&uuml;rl&uuml;ğe gelen t&uuml;m evraklar toplanıp konularına g&ouml;re dosyalandıktan sonra m&uuml;d&uuml;re iletilir.</p>\r\n<p>(3) M&uuml;d&uuml;r, evrakları gereği i&ccedil;in ilgili personele tevzi eder.<br />(4) Bu Y&ouml;netmelikte adı ge&ccedil;en g&ouml;revlilerin &ouml;l&uuml;m hari&ccedil; her hangi bir nedenle g&ouml;revlerinden ayrılmaları durumunda g&ouml;revleri gereği yanlarında bulunan her t&uuml;rl&uuml; dosya, yazı ve belgeler ile zimmeti altında bulunan eşyaları bir &ccedil;izelgeye bağlı olarak yeni g&ouml;revliye devir teslimini yapmaları zorunludur. Devir-teslim yapılmadan g&ouml;revden ayrılma işlemleri yapılmaz.</p>\r\n<p>(5) &Ccedil;alışanın &ouml;l&uuml;m&uuml; halinde, kendisine verilen yazı, belge ve diğer eşyalar birim amirinin hazırlayacağı bir tutanakla yeni g&ouml;revliye teslim edilir.</p>\r\n<p><strong>Diğer kurum ve kuruluşlarla koordinasyon</strong></p>\r\n<p>MADDE 21 - (1) M&uuml;d&uuml;rl&uuml;kler arası yazışmalar M&uuml;d&uuml;r&rsquo; &uuml;n imzası ile y&uuml;r&uuml;t&uuml;l&uuml;r.</p>\r\n<p>(2) M&uuml;d&uuml;rl&uuml;ğ&uuml;n, Belediye dışı &ouml;zel ve t&uuml;zel kişiler, Valilik, B&uuml;y&uuml;kşehir Belediyesi, Kamu Kurum ve Kuruluşları ve diğer şahıslarla ilgili gerekli g&ouml;r&uuml;len yazışmalar; M&uuml;d&uuml;r ve Başkan Yardımcısının parafı Belediye Başkanının veya yetki verdiği Başkan Yardımcısının imzası ile y&uuml;r&uuml;t&uuml;l&uuml;r.</p>\r\n<p><strong>ALTINCI B&Ouml;L&Uuml;M<br /></strong><br />Evraklarla İlgili İşlemler ve Arşivleme</p>\r\n<p><strong>Gelen giden evrakla ilgili yapılacak işlem</strong></p>\r\n<p>MADDE 22 - (1) M&uuml;d&uuml;rl&uuml;ğe gelen evrakın &ouml;nce kaydı yapılır. M&uuml;d&uuml;r tarafından ilgili personele havale edilir. Personel evrakın gereğini zamanında ve noksansız yapmakla y&uuml;k&uuml;ml&uuml;d&uuml;r.<br />(2) Evraklar ilgili personele zimmetle ve imza karşılığı dağıtılır. Gelen ve giden evraklar ilgili kayıt defterlerine sayılarına g&ouml;re işlenir, dış m&uuml;d&uuml;rl&uuml;k evrakları yine zimmetle ilgili M&uuml;d&uuml;rl&uuml;ğe teslim edilir. M&uuml;d&uuml;rl&uuml;kler arası havale ve kayıt işlemleri elektronik ortamda yapılır.</p>\r\n<p><strong>Arşivleme ve dosyalama</strong></p>\r\n<p>MADDE 23 - (1) M&uuml;d&uuml;rl&uuml;k tarafından yapılan t&uuml;m yazışmaların birer paraflı n&uuml;shası konusuna g&ouml;re Standart Dosya Planı&rsquo;na uygun olarak muhafaza edilir.<br />(2) M&uuml;d&uuml;rl&uuml;kte &uuml;retilen ve m&uuml;d&uuml;rl&uuml;ğe gelen t&uuml;m evrak ve belgeler Standart Dosya Planı&rsquo;na g&ouml;re sınıflandırılır ve dosyalama yapılır.</p>\r\n<p>(3) İşlemi biten evraklar &ldquo;Devlet Arşiv Hizmetleri Hakkında Y&ouml;netmelik&rdquo;e uygun olarak arşive kaldırılır.</p>\r\n<p><strong>YEDİNCİ B&Ouml;L&Uuml;M<br /></strong><br />Denetim</p>\r\n<p><strong>Denetim ve disiplin h&uuml;k&uuml;mleri</strong></p>\r\n<p>MADDE 24- (1) Muhtarlık İşleri M&uuml;d&uuml;r&uuml; t&uuml;m personelini her zaman denetleme yetkisine sahiptir.</p>\r\n<p>(2) Muhtarlık İşleri M&uuml;d&uuml;r&uuml; 1. Disiplin Amiri olarak disiplin mevzuatı doğrultusunda işlemleri y&uuml;r&uuml;t&uuml;r.</p>\r\n<p><strong>SEKİZİNCİ B&Ouml;L&Uuml;M</strong><br />&Ccedil;eşitli ve Son H&uuml;k&uuml;mler</p>\r\n<p><strong>Y&ouml;netmelikte h&uuml;k&uuml;m bulunmayan haller</strong></p>\r\n<p>MADDE 25 - İşbu y&ouml;netmelikte h&uuml;k&uuml;m bulunmayan hallerde y&uuml;r&uuml;rl&uuml;kteki ilgili mevzuat h&uuml;k&uuml;mlerine uyulur.</p>\r\n<p><strong>Y&uuml;r&uuml;rl&uuml;k</strong><br />MADDE 26- Y&ouml;netmelik Belediye Meclisinin kabul&uuml; ve ilanından sonra y&uuml;r&uuml;rl&uuml;ğe girer.</p>\r\n<p><strong>Y&uuml;r&uuml;tme</strong><br />MADDE 27 - Bu y&ouml;netmelik h&uuml;k&uuml;mlerini Belediye Başkanı y&uuml;r&uuml;t&uuml;r.</p>\r\n<p>Bu Y&ouml;netmelik; Belediyemiz Meclisinin 02.09.2015 tarih ve 81 sayılı kararı ile kabul edilmiş olup, Belediyemiz duyuru panosundan ilan edilerek 17.09.2015 tarihinden itibaren y&uuml;r&uuml;rl&uuml;ğe girmiştir.</p>', 'Muhtarlık İşleri Müdürlüğü', 'Muhtarlık İşleri Müdürlüğü', 1, '2020-01-22 13:31:49', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `diller`
--

CREATE TABLE `diller` (
  `id` int(11) NOT NULL,
  `adi` varchar(155) CHARACTER SET latin1 DEFAULT NULL,
  `bayrak` varchar(155) CHARACTER SET latin1 DEFAULT NULL,
  `sira` int(11) NOT NULL,
  `anadil` tinyint(1) NOT NULL DEFAULT '0',
  `durum` int(11) DEFAULT '0'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `diller`
--

INSERT INTO `diller` (`id`, `adi`, `bayrak`, `sira`, `anadil`, `durum`) VALUES
(1, 'Türkçe', 'flag-icon-tr', 0, 1, 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `duyurular`
--

CREATE TABLE `duyurular` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` longtext COLLATE utf8_turkish_ci,
  `keywords` text COLLATE utf8_turkish_ci,
  `description` text COLLATE utf8_turkish_ci,
  `durum` int(11) DEFAULT '0',
  `anasayfa` int(11) DEFAULT '0',
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarihg` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `duyurular`
--

INSERT INTO `duyurular` (`id`, `sira`, `adi`, `seo`, `aciklama`, `keywords`, `description`, `durum`, `anasayfa`, `resim`, `tarih`, `tarihg`, `dil`) VALUES
(1, 3, 'Köy yollarının onarımı ve tamiratı yapılacaktır.', 'koy-yollarinin-onarimi-ve-tamirati-yapilacaktir', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Köy yollarının onarımı ve tamiratı yapılacaktır.', 'Köy yollarının onarımı ve tamiratı yapılacaktır.', 1, 1, '', '17-01-2020 09:36', '24-01-2020 09:37', 1),
(2, 0, 'Tüm belediye üyelerimizin dikkatine önemli duyuru', 'tum-belediye-uyelerimizin-dikkatine-onemli-duyuru', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Tüm belediye üyelerimizin dikkatine önemli duyuru', 'Tüm belediye üyelerimizin dikkatine önemli duyuru', 1, 1, '', '07-01-2020 09:37', '07-01-2020 09:37', 1),
(3, 1, 'Yönetim Kurulu Toplantısı', 'yonetim-kurulu-toplantisi', '<p>T&uuml;rk&ccedil;e Lorem İpsum. Hesap makinesi sandalye layıkıyla g&ouml;rd&uuml;m otob&uuml;s patlıcan lambadaki cezbelendi sıla de. T&uuml;remiş sıfat eve doğru şafak uzattı &ccedil;obanın. Otob&uuml;s &ouml;tekinden dolayı sıradanlıktan koştum bilgisayarı koştum g&ouml;rd&uuml;m bilgisayarı ama bilgisayarı.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl. Yapacakmış ve duyulmamış mutlu oldular koyun balıkhaneye g&ouml;rd&uuml;m koştum koşuyorlar g&uuml;l telefonu sıradanlıktan d&uuml;ş&uuml;n&uuml;yor. De g&ouml;rd&uuml;m &ccedil;&uuml;nk&uuml; sokaklarda ona doğru salladı eve doğru biber dışarı &ccedil;ıktılar anlamsız. Ve karşıdakine sinema sokaklarda &ouml;yle ki adresini gitti masaya doğru &ccedil;obanın bahar g&uuml;l sinema bilgiyasayarı. Umut tv mutlu oldular koyun patlıcan. Nedir ne demek T&uuml;rk&ccedil;e Lorem İpsum.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl.</p>\r\n<p>G&ouml;rd&uuml;m &ouml;tekinden dolayı yazın &ccedil;akıl bundan dolayı un değirmeni d&uuml;ş&uuml;n&uuml;yor g&uuml;l&uuml;yorum g&ouml;ze &ccedil;arpan. Otob&uuml;s &ccedil;akıl g&ouml;rd&uuml;m umut gitti cesurca yaptı yapacakmış ona doğru d&uuml;ş&uuml;n&uuml;yor patlıcan telefonu sinema. Kalemi orta otob&uuml;s ama bundan dolayı salladı sokaklarda bilgiyasayarı gazete.</p>', 'Yönetim Kurulu Toplantısı', 'Yönetim Kurulu Toplantısı', 1, 1, '', '15-01-2020 09:37', '15-01-2020 09:37', 1),
(4, 2, '30 Ağustos Zafer Bayramı\'nda toplu taşıma ücretsiz', '30-agustos-zafer-bayrami-nda-toplu-tasima-ucretsiz', '<p>T&uuml;rk&ccedil;e Lorem İpsum. Hesap makinesi sandalye layıkıyla g&ouml;rd&uuml;m otob&uuml;s patlıcan lambadaki cezbelendi sıla de. T&uuml;remiş sıfat eve doğru şafak uzattı &ccedil;obanın. Otob&uuml;s &ouml;tekinden dolayı sıradanlıktan koştum bilgisayarı koştum g&ouml;rd&uuml;m bilgisayarı ama bilgisayarı.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl. Yapacakmış ve duyulmamış mutlu oldular koyun balıkhaneye g&ouml;rd&uuml;m koştum koşuyorlar g&uuml;l telefonu sıradanlıktan d&uuml;ş&uuml;n&uuml;yor. De g&ouml;rd&uuml;m &ccedil;&uuml;nk&uuml; sokaklarda ona doğru salladı eve doğru biber dışarı &ccedil;ıktılar anlamsız. Ve karşıdakine sinema sokaklarda &ouml;yle ki adresini gitti masaya doğru &ccedil;obanın bahar g&uuml;l sinema bilgiyasayarı. Umut tv mutlu oldular koyun patlıcan. Nedir ne demek T&uuml;rk&ccedil;e Lorem İpsum.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl.</p>\r\n<p>G&ouml;rd&uuml;m &ouml;tekinden dolayı yazın &ccedil;akıl bundan dolayı un değirmeni d&uuml;ş&uuml;n&uuml;yor g&uuml;l&uuml;yorum g&ouml;ze &ccedil;arpan. Otob&uuml;s &ccedil;akıl g&ouml;rd&uuml;m umut gitti cesurca yaptı yapacakmış ona doğru d&uuml;ş&uuml;n&uuml;yor patlıcan telefonu sinema. Kalemi orta otob&uuml;s ama bundan dolayı salladı sokaklarda bilgiyasayarı gazete.</p>', '30 Ağustos Zafer Bayramı\'nda toplu taşıma ücretsiz', '30 Ağustos Zafer Bayramı\'nda toplu taşıma ücretsiz', 1, 1, '', '16-01-2020 09:37', '16-01-2020 09:38', 1),
(5, 4, 'Su Kesintisi', 'su-kesintisi', '<p>T&uuml;rk&ccedil;e Lorem İpsum. Hesap makinesi sandalye layıkıyla g&ouml;rd&uuml;m otob&uuml;s patlıcan lambadaki cezbelendi sıla de. T&uuml;remiş sıfat eve doğru şafak uzattı &ccedil;obanın. Otob&uuml;s &ouml;tekinden dolayı sıradanlıktan koştum bilgisayarı koştum g&ouml;rd&uuml;m bilgisayarı ama bilgisayarı.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl. Yapacakmış ve duyulmamış mutlu oldular koyun balıkhaneye g&ouml;rd&uuml;m koştum koşuyorlar g&uuml;l telefonu sıradanlıktan d&uuml;ş&uuml;n&uuml;yor. De g&ouml;rd&uuml;m &ccedil;&uuml;nk&uuml; sokaklarda ona doğru salladı eve doğru biber dışarı &ccedil;ıktılar anlamsız. Ve karşıdakine sinema sokaklarda &ouml;yle ki adresini gitti masaya doğru &ccedil;obanın bahar g&uuml;l sinema bilgiyasayarı. Umut tv mutlu oldular koyun patlıcan. Nedir ne demek T&uuml;rk&ccedil;e Lorem İpsum.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl.</p>\r\n<p>G&ouml;rd&uuml;m &ouml;tekinden dolayı yazın &ccedil;akıl bundan dolayı un değirmeni d&uuml;ş&uuml;n&uuml;yor g&uuml;l&uuml;yorum g&ouml;ze &ccedil;arpan. Otob&uuml;s &ccedil;akıl g&ouml;rd&uuml;m umut gitti cesurca yaptı yapacakmış ona doğru d&uuml;ş&uuml;n&uuml;yor patlıcan telefonu sinema. Kalemi orta otob&uuml;s ama bundan dolayı salladı sokaklarda bilgiyasayarı gazete.</p>', 'Su Kesintisi', 'Su Kesintisi', 1, 1, '', '19-01-2020 09:38', '19-01-2020 09:38', 1),
(6, 5, '22.01.2020 Basın Duyurusu', '22-01-2020-basin-duyurusu', '<p>T&uuml;rk&ccedil;e Lorem İpsum. Hesap makinesi sandalye layıkıyla g&ouml;rd&uuml;m otob&uuml;s patlıcan lambadaki cezbelendi sıla de. T&uuml;remiş sıfat eve doğru şafak uzattı &ccedil;obanın. Otob&uuml;s &ouml;tekinden dolayı sıradanlıktan koştum bilgisayarı koştum g&ouml;rd&uuml;m bilgisayarı ama bilgisayarı.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl. Yapacakmış ve duyulmamış mutlu oldular koyun balıkhaneye g&ouml;rd&uuml;m koştum koşuyorlar g&uuml;l telefonu sıradanlıktan d&uuml;ş&uuml;n&uuml;yor. De g&ouml;rd&uuml;m &ccedil;&uuml;nk&uuml; sokaklarda ona doğru salladı eve doğru biber dışarı &ccedil;ıktılar anlamsız. Ve karşıdakine sinema sokaklarda &ouml;yle ki adresini gitti masaya doğru &ccedil;obanın bahar g&uuml;l sinema bilgiyasayarı. Umut tv mutlu oldular koyun patlıcan. Nedir ne demek T&uuml;rk&ccedil;e Lorem İpsum.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl.</p>\r\n<p>G&ouml;rd&uuml;m &ouml;tekinden dolayı yazın &ccedil;akıl bundan dolayı un değirmeni d&uuml;ş&uuml;n&uuml;yor g&uuml;l&uuml;yorum g&ouml;ze &ccedil;arpan. Otob&uuml;s &ccedil;akıl g&ouml;rd&uuml;m umut gitti cesurca yaptı yapacakmış ona doğru d&uuml;ş&uuml;n&uuml;yor patlıcan telefonu sinema. Kalemi orta otob&uuml;s ama bundan dolayı salladı sokaklarda bilgiyasayarı gazete.</p>', '22.01.2020 Basın Duyurusu', '22.01.2020 Basın Duyurusu', 1, 1, '', '23-01-2020 09:38', '23-01-2020 09:38', 1),
(7, 6, 'İlçeler için Toplu Taşıma Çalışma Saatleri 22.01.2020', 'ilceler-icin-toplu-tasima-calisma-saatleri-22-01-2020', '<p>T&uuml;rk&ccedil;e Lorem İpsum. Hesap makinesi sandalye layıkıyla g&ouml;rd&uuml;m otob&uuml;s patlıcan lambadaki cezbelendi sıla de. T&uuml;remiş sıfat eve doğru şafak uzattı &ccedil;obanın. Otob&uuml;s &ouml;tekinden dolayı sıradanlıktan koştum bilgisayarı koştum g&ouml;rd&uuml;m bilgisayarı ama bilgisayarı.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl. Yapacakmış ve duyulmamış mutlu oldular koyun balıkhaneye g&ouml;rd&uuml;m koştum koşuyorlar g&uuml;l telefonu sıradanlıktan d&uuml;ş&uuml;n&uuml;yor. De g&ouml;rd&uuml;m &ccedil;&uuml;nk&uuml; sokaklarda ona doğru salladı eve doğru biber dışarı &ccedil;ıktılar anlamsız. Ve karşıdakine sinema sokaklarda &ouml;yle ki adresini gitti masaya doğru &ccedil;obanın bahar g&uuml;l sinema bilgiyasayarı. Umut tv mutlu oldular koyun patlıcan. Nedir ne demek T&uuml;rk&ccedil;e Lorem İpsum.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl.</p>\r\n<p>G&ouml;rd&uuml;m &ouml;tekinden dolayı yazın &ccedil;akıl bundan dolayı un değirmeni d&uuml;ş&uuml;n&uuml;yor g&uuml;l&uuml;yorum g&ouml;ze &ccedil;arpan. Otob&uuml;s &ccedil;akıl g&ouml;rd&uuml;m umut gitti cesurca yaptı yapacakmış ona doğru d&uuml;ş&uuml;n&uuml;yor patlıcan telefonu sinema. Kalemi orta otob&uuml;s ama bundan dolayı salladı sokaklarda bilgiyasayarı gazete.</p>', 'İlçeler için Toplu Taşıma Çalışma Saatleri 22.01.2020', 'İlçeler için Toplu Taşıma Çalışma Saatleri 22.01.2020', 1, 1, '', '23-01-2020 09:38', '23-01-2020 09:38', 1),
(8, 7, '2020 - 2024 Stratejik Plan Hazırlık ve Zaman programı', '2020-2024-stratejik-plan-hazirlik-ve-zaman-programi', '<p>T&uuml;rk&ccedil;e Lorem İpsum. Hesap makinesi sandalye layıkıyla g&ouml;rd&uuml;m otob&uuml;s patlıcan lambadaki cezbelendi sıla de. T&uuml;remiş sıfat eve doğru şafak uzattı &ccedil;obanın. Otob&uuml;s &ouml;tekinden dolayı sıradanlıktan koştum bilgisayarı koştum g&ouml;rd&uuml;m bilgisayarı ama bilgisayarı.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl. Yapacakmış ve duyulmamış mutlu oldular koyun balıkhaneye g&ouml;rd&uuml;m koştum koşuyorlar g&uuml;l telefonu sıradanlıktan d&uuml;ş&uuml;n&uuml;yor. De g&ouml;rd&uuml;m &ccedil;&uuml;nk&uuml; sokaklarda ona doğru salladı eve doğru biber dışarı &ccedil;ıktılar anlamsız. Ve karşıdakine sinema sokaklarda &ouml;yle ki adresini gitti masaya doğru &ccedil;obanın bahar g&uuml;l sinema bilgiyasayarı. Umut tv mutlu oldular koyun patlıcan. Nedir ne demek T&uuml;rk&ccedil;e Lorem İpsum.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl.</p>\r\n<p>G&ouml;rd&uuml;m &ouml;tekinden dolayı yazın &ccedil;akıl bundan dolayı un değirmeni d&uuml;ş&uuml;n&uuml;yor g&uuml;l&uuml;yorum g&ouml;ze &ccedil;arpan. Otob&uuml;s &ccedil;akıl g&ouml;rd&uuml;m umut gitti cesurca yaptı yapacakmış ona doğru d&uuml;ş&uuml;n&uuml;yor patlıcan telefonu sinema. Kalemi orta otob&uuml;s ama bundan dolayı salladı sokaklarda bilgiyasayarı gazete.</p>', '2020 - 2024 Stratejik Plan Hazırlık ve Zaman programı', '2020 - 2024 Stratejik Plan Hazırlık ve Zaman programı', 1, 1, '', '24-01-2020 09:39', '24-01-2020 09:39', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `etkinlikler`
--

CREATE TABLE `etkinlikler` (
  `id` int(11) NOT NULL,
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `yer` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `gmap` text COLLATE utf8_turkish_ci,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `baslama_tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `bitis_tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` text COLLATE utf8_turkish_ci,
  `keywords` text COLLATE utf8_turkish_ci,
  `description` text COLLATE utf8_turkish_ci,
  `durum` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `etkinlikler`
--

INSERT INTO `etkinlikler` (`id`, `adi`, `yer`, `gmap`, `seo`, `resim`, `baslama_tarih`, `bitis_tarih`, `aciklama`, `keywords`, `description`, `durum`, `tarih`, `dil`) VALUES
(1, 'Toz Ruhu, Her Cuma Yeni Sinema\'da', 'Levent Kültür Merkezi, Onat Kutlar Sinema Salonu', 'https://goo.gl/maps/j2u4CwqLQSZVR66H7', 'toz-ruhu-her-cuma-yeni-sinema-da', '15042015-11-48-56.jpg', '1588176000', '1590771600', '<p>Her Cuma Yeni Sinema\'da, Nesimi Yetik\'in yazıp y&ouml;nettiği &ldquo;Toz Ruhu&rdquo; filmi, 29 Mayıs Cuma g&uuml;n&uuml; Levent K&uuml;lt&uuml;r Merkezi&rsquo;nde&hellip;</p>\r\n<p>TOZ RUHU<br />2013 / 95 &rsquo; / Renkli / T&uuml;rkiye</p>\r\n<p><strong>Y&ouml;netmen:</strong>&nbsp;Nesimi Yetik<br /><strong>Senaryo:</strong>&nbsp;Bet&uuml;l Esener , Nesimi Yetik<br /><strong>M&uuml;zik:</strong>&nbsp;Bet&uuml;l Esener, Ezgi Baltaş<br /><strong>G&ouml;r&uuml;nt&uuml; Y&ouml;netmeni:</strong>&nbsp;Sedat Şahin, Cevahir Şahin<br /><strong>Sanat Y&ouml;netmeni:&nbsp;</strong>Osman &Ouml;zcan<br /><strong>Kurgu:</strong>&nbsp;Ali Umut Ergin<br /><strong>Oyuncular:</strong>&nbsp;Tansu Bi&ccedil;er, Ertuğrul Ayta&ccedil; Uşun, Selin Yeninci, Ayta&ccedil; Arman, Nihal G.Koldaş, Settar Tanrı&ouml;ğen</p>\r\n<p><strong>Film Hakkında</strong><br />Metin İstanbul&rsquo;da yaşayan bir erkek g&uuml;ndelik&ccedil;idir. Kendi halinde, mutlu bir d&uuml;nyası vardır. Arabesk m&uuml;zik tutkunudur, şarkılar besteler. Metin&rsquo;in k&uuml;&ccedil;&uuml;k d&uuml;nyası ilk olarak İstanbul&rsquo;a asker olarak gelen yeğeni &Uuml;mit&rsquo;in ziyaretiyle değişir. Ama d&uuml;nyasının asıl sarsılışı m&uuml;şterisi Suzan Hanım&rsquo;ın evinde birlikte &ccedil;alıştıkları Neslihan&rsquo;ın evine gelmesiyle olur. En nihayetinde Metin&rsquo;in hayatına giren iki kişi de kendi yollarına doğru giderler. Metin yine k&uuml;&ccedil;&uuml;k d&uuml;nyasında, yalnızlığıyla baş başa kalır. Bu sırada Metin&rsquo;in hayatında ilgin&ccedil; bir gelişme olur, İstiklal Caddesi&rsquo;ndeki kabininde şarkı s&ouml;ylediği televizyon programı onu konuk olarak &ccedil;ağırır.</p>\r\n<p><strong>Tarih:</strong> 29 Mayıs 2020, Cuma<br /><strong>Saat:&nbsp;</strong>19.00<br /><strong>Yer:</strong>&nbsp;Levent K&uuml;lt&uuml;r Merkezi, Onat Kutlar Sinema Salonu<br /><strong>Adres:</strong>&nbsp;Levent K&uuml;lt&uuml;r Merkezi,<br /><strong>&Ccedil;alıkuşu Sok. No:</strong> 1 Levent- Beşiktaş<br /><strong>Levent K&uuml;lt&uuml;r Merkezi:</strong> 0000 000 00 00</p>\r\n<p><br />*G&ouml;sterimler &uuml;cretsizdir.<br />Filmin tekrarlarını hafta i&ccedil;i her g&uuml;n 14:00 ve 16:30 saatlerinde izleyebilirsiniz.</p>', 'Toz Ruhu,Her Cuma Yeni Sinema\'da', 'Toz Ruhu, Her Cuma Yeni Sinema\'da', 1, '2020-01-24 11:47:27', 1),
(2, 'Erkan Oğur ve İsmail Hakkı Demircioğlu', 'Beylikdüzü Atatürk Kültür ve Sanat Merkezi', 'https://goo.gl/maps/j2u4CwqLQSZVR66H7', 'erkan-ogur-ve-ismail-hakki-demircioglu', 'etkinlik-web-takvim-konser-24.jpg', '1585157400', '1585162800', '<p>Türk halk müziğinin iki usta ismi Erkan Oğur ve İsmail Hakkı Demircioğlu, sizler i&ccedil;in aynı sahneyi paylaşıyor.</p>\r\n<p>Erkan Oğur ve İsmail Hakkı Demircioğlu, &ccedil;oğu eski, bazıları ise &ccedil;ok eski Anadolu türkülerinden oluşan bir repertuvarı seslendiriyorlar. Bu nedenle, kendi ifadeleriyle, performanslarını &ldquo;bir birlikte hatırlama &ccedil;abası&rdquo; olarak g&ouml;rüyorlar. Düo formatında ger&ccedil;ekleştirdikleri, benzersiz ve ustalıklı türkü yorumları, Türk halk müziğinde yeni bir tarzın doğuşuna yol a&ccedil;ıyor.</p>', 'Erkan Oğur ve İsmail Hakkı Demircioğlu', 'Erkan Oğur ve İsmail Hakkı Demircioğlu', 1, '2020-02-06 17:27:26', 1),
(3, 'Astro Ay\'a Tırmanıyor', 'Beylikdüzü Atatürk Kültür ve Sanat Merkezi', 'https://goo.gl/maps/j2u4CwqLQSZVR66H7', 'astro-ay-a-tirmaniyor', 'etkinlik-web-takvim-cYocuk-01-74.jpg', '1580036400', '1580040000', '<p>En büyük hayali astronot olup uzaya gitmek olan Bağış, o gece yine g&ouml;kyüzünü inceleyip, g&ouml;zlem yapıp, notlar almaktadır. G&ouml;kyüzü her zamankinden daha hareketli ve eğlencelidir. Bu durum Babi&rsquo;yi &ccedil;ok heyecanlandırsa da uykusuna yenik düşmüş ve yatağına ge&ccedil;ip uykuya dalmıştır. O gece g&ouml;kyüzünün ona bir sürprizi vardır. Dostu Astro, Babi&rsquo;yi bir yolculuğa &ccedil;ıkaracak ve belki de b&ouml;ylece Babi&rsquo;nin hayalleri ger&ccedil;ek olacaktır. Sonrası mı?..</p>\r\n<p>&lsquo;&rsquo;Astro Ay&rsquo;a Tırmanıyor&rsquo;&rsquo; 35 dakika süresiyle sadece bir &ccedil;ocuk oyunu olmayıp, ailelerin de izleyeceği bir performanstır.</p>', 'Astro Ay\'a Tırmanıyor', 'Astro Ay\'a Tırmanıyor', 1, '2020-02-06 17:28:15', 1),
(4, 'Harem Kabare', 'Beylikdüzü Atatürk Kültür ve Sanat Merkezi', 'https://goo.gl/maps/j2u4CwqLQSZVR66H7', 'harem-kabare', 'etkinlik-web-takvim-yetisYkin-05-789.jpg', '1611336600', '1611340200', '<p>Okan Bayülgen yazdı &ndash; y&ouml;netti &ndash; oynadı.</p>\r\n<p>&Ouml;zge Borak, Ezgi &Ccedil;elik, Beste Tok, &Ouml;dül Turan, Gizem Din&ccedil;, Aybüke Albere&ccedil;ok farklı ve eğlenceli kadınlara can verdiler.</p>\r\n<p>&ldquo;Bu kadınlar siz, arkadaşlarınız, ge&ccedil;mişteki ya da gelecekteki haliniz gibi. Fena halde tanıdık, korkun&ccedil;, şuh, dramatik ve komik.</p>\r\n<p>Bu adamı tepelesinler mi, sevsinler mi, &ouml;ldürsünler mi?</p>\r\n<p>Hep beraber karar vereceğiz.&rdquo;</p>', 'Harem Kabare', 'Harem Kabare', 1, '2020-02-06 17:27:44', 1),
(5, 'Vahşet Tanrısı', 'Beylikdüzü Atatürk Kültür ve Sanat Merkezi', 'https://goo.gl/maps/j2u4CwqLQSZVR66H7', 'vahset-tanrisi', 'etkinlik-web-takvim-yetisYkin-02-7881.jpg', '1579627800', '1579631400', '<p>Celal Kadri Kınoğlu&rsquo;nun y&ouml;nettiği Vahşet Tanrısı oyunu, izleyicisiyle buluşmaya devam ediyor.</p>\r\n<p>Hayal ettiğimiz kişiler olamadık. Mutluluk taklidi yapan, &ouml;zlemini duyduğumuz anne babalar olmaktan uzak yalnızlarız ve bizi anlatan bu oyun müthiş komik &ouml;yle mi? Evet.</p>', 'Vahşet Tanrısı', 'Vahşet Tanrısı', 1, '2020-01-24 12:09:40', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `faaliyet_raporlari`
--

CREATE TABLE `faaliyet_raporlari` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` longtext COLLATE utf8_turkish_ci,
  `keywords` text COLLATE utf8_turkish_ci,
  `description` text COLLATE utf8_turkish_ci,
  `durum` int(11) DEFAULT '0',
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dosya` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `faaliyet_raporlari`
--

INSERT INTO `faaliyet_raporlari` (`id`, `sira`, `adi`, `seo`, `aciklama`, `keywords`, `description`, `durum`, `resim`, `dosya`, `tarih`, `dil`) VALUES
(1, 0, '2010 Yılı Faaliyet Raporu', '2010-yili-faaliyet-raporu', '', '2010 Yılı Faaliyet Raporu', '2010 Yılı Faaliyet Raporu', 1, '', 'ornek_3.pdf', '28-01-2020 14:19', 1),
(2, 1, '2011 Yılı Faaliyet Raporu', '2011-yili-faaliyet-raporu', '', '2011 Yılı Faaliyet Raporu', '2011 Yılı Faaliyet Raporu', 1, '', 'ornek_3_1.pdf', '28-01-2020 14:19', 1),
(3, 2, '2012 Yılı Faaliyet Raporu', '2012-yili-faaliyet-raporu', '', '2012 Yılı Faaliyet Raporu', '2012 Yılı Faaliyet Raporu', 1, '', 'ornek_3_2.pdf', '28-01-2020 14:20', 1),
(4, 3, '2013 Yılı Faaliyet Raporu', '2013-yili-faaliyet-raporu', '', '2013 Yılı Faaliyet Raporu', '2013 Yılı Faaliyet Raporu', 1, '', 'ornek_3_3.pdf', '28-01-2020 14:20', 1),
(5, 4, '2014 Yılı Faaliyet Raporu', '2014-yili-faaliyet-raporu', '', '2014 Yılı Faaliyet Raporu', '2014 Yılı Faaliyet Raporu', 1, '', 'ornek_3_4.pdf', '28-01-2020 14:21', 1),
(6, 5, '2015 Yılı Faaliyet Raporu', '2015-yili-faaliyet-raporu', '', '2015 Yılı Faaliyet Raporu', '2015 Yılı Faaliyet Raporu', 1, '', 'ornek_3_5.pdf', '28-01-2020 14:22', 1),
(7, 6, '2016 Yılı Faaliyet Raporu', '2016-yili-faaliyet-raporu', '', '2016 Yılı Faaliyet Raporu', '2016 Yılı Faaliyet Raporu', 1, '', 'ornek_3_9.pdf', '28-01-2020 14:24', 1),
(8, 7, '2017 Yılı Faaliyet Raporu', '2017-yili-faaliyet-raporu', '', '2017 Yılı Faaliyet Raporu', '2017 Yılı Faaliyet Raporu', 1, '', 'ornek_3_6.pdf', '28-01-2020 14:24', 1),
(9, 8, '2018 Yılı Faaliyet Raporu', '2018-yili-faaliyet-raporu', '', '2018 Yılı Faaliyet Raporu', '2018 Yılı Faaliyet Raporu', 1, '', 'ornek_3_7.pdf', '28-01-2020 14:25', 1),
(10, 9, '2019 Yılı Faaliyet Raporu', '2019-yili-faaliyet-raporu', '', '2019 Yılı Faaliyet Raporu', '2019 Yılı Faaliyet Raporu', 1, '', 'ornek_3_8.pdf', '28-01-2020 14:25', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `footermenu`
--

CREATE TABLE `footermenu` (
  `id` int(11) NOT NULL,
  `menu_ust` int(11) DEFAULT '0',
  `menu_isim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `menu_url` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `link` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `sekme` int(11) DEFAULT '0',
  `menu_sira` int(2) DEFAULT '0',
  `menu_durum` int(1) DEFAULT '0',
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `footermenu`
--

INSERT INTO `footermenu` (`id`, `menu_ust`, `menu_isim`, `menu_url`, `link`, `sekme`, `menu_sira`, `menu_durum`, `dil`) VALUES
(1, 0, 'KURUMSAL', '0', ' #', 0, 1, 1, 1),
(2, 0, 'HİZMETLERİMİZ', '0', ' #', 0, 2, 1, 1),
(3, 1, 'Meclis Kararları', 'meclis-kararlari', ' ', 0, 1, 1, 1),
(4, 2, 'İmar İşleri', 'hizmet/imar-isleri', ' ', 0, 1, 1, 1),
(5, 0, 'BİRİMLER', '0', 'javascript:;', 0, 3, 1, 1),
(6, 0, 'KENT REHBERİ', '0', 'javascript:;', 0, 4, 1, 1),
(7, 5, 'Zabıta Amirliği', 'birim/zabita-amirligi', '', 0, 1, 1, 1),
(8, 6, 'Tarihçe', 'icerik/tarihce', '', 0, 1, 1, 1),
(9, 1, 'Faaliyet Raporları', 'faaliyet-raporlari', '', 0, 2, 1, 1),
(10, 1, 'Meclis Üyeleri', 'profil-kategori/meclis-uyeleri', '', 0, 3, 1, 1),
(11, 1, 'Belediye Personeli', 'profil-kategori/belediye-personeli', '', 0, 4, 1, 1),
(12, 1, 'Güncel Duyurular', 'duyurular', '', 0, 5, 1, 1),
(13, 1, 'Güncel İhaleler', 'ihaleler', '', 0, 6, 1, 1),
(14, 1, 'Güncel İlanlar', 'ilanlar', '', 0, 7, 1, 1),
(15, 1, 'Etkinlikler', 'etkinlikler', '', 0, 8, 1, 1),
(16, 1, 'Foto Galeri', 'foto-galeri', '', 0, 9, 1, 1),
(17, 1, 'Video Galeri', 'video-galeri', '', 0, 10, 1, 1),
(18, 2, 'Yapı Kullanım', 'hizmet/yapi-kullanim', '', 0, 2, 1, 1),
(19, 2, 'İnşaat Ruhsatı', 'hizmet/insaat-ruhsati', '', 0, 3, 1, 1),
(20, 2, 'Numarataj', 'hizmet/numarataj', '', 0, 4, 1, 1),
(21, 2, 'Vergi İşlemleri', 'hizmet/vergi-islemleri', '', 0, 5, 1, 1),
(22, 2, 'İşyeri Açma Ruhsatı', 'hizmet/isyeri-acma-ruhsati', '', 0, 6, 1, 1),
(23, 2, 'Evlilik Hizmetleri', 'hizmet/evlilik-hizmetleri', '', 0, 7, 1, 1),
(24, 2, 'Otobüs Seferleri', 'hizmet/otobus-seferleri', '', 0, 8, 1, 1),
(25, 5, 'Yazı İşleri Müdürlüğü', 'birim/yazi-isleri-mudurlugu', '', 0, 2, 1, 1),
(26, 5, 'Mali Hizmetler Müdürlüğü', 'birim/mali-hizmetler-mudurlugu', '', 0, 3, 1, 1),
(27, 5, 'İnsan Kaynakları Ve Eğit.Müdürlüğü', 'birim/insan-kaynaklari-ve-egit-mudurlugu', '', 0, 4, 1, 1),
(28, 5, 'Fen İşleri İmar Müdürlüğü', 'birim/fen-isleri-imar-mudurlugu', '', 0, 5, 1, 1),
(29, 5, 'Muhtarlık İşleri Müdürlüğü', 'birim/muhtarlik-isleri-mudurlugu', '', 0, 6, 1, 1),
(30, 6, 'El Sanatları', 'icerik/el-sanatlari', '', 0, 2, 1, 1),
(31, 6, 'Av Turizmi', 'icerik/av-turizmi', '', 0, 3, 1, 1),
(32, 6, 'Kültürel Zenginlik', 'icerik/kulturel-zenginlik', '', 0, 4, 1, 1),
(33, 6, 'Kentsel Doku', 'icerik/kentsel-doku', '', 0, 5, 1, 1),
(34, 6, 'Doğal Güzellikler', 'icerik/dogal-guzellikler', '', 0, 6, 1, 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `fotograflar`
--

CREATE TABLE `fotograflar` (
  `id` int(11) NOT NULL,
  `resimid` int(11) NOT NULL,
  `resim` text COLLATE utf8_turkish_ci NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `fotograflar`
--

INSERT INTO `fotograflar` (`id`, `resimid`, `resim`) VALUES
(176, 5, '728xauto.webp'),
(170, 4, '5_1280.jpg'),
(169, 4, '_dsc6469_8791-126.jpg'),
(178, 5, 'baskan-acardan-okul-ziyaretleri.jpg'),
(177, 5, 'baskan_vergiliye_ziyaretler.jpg'),
(175, 5, '728xauto_1.webp'),
(160, 6, '2838ec8e62f927da39943e891f2c598d.jpg'),
(159, 7, 'samsun-nostalji-saathane.jpg'),
(158, 7, 'maxresdefault.jpg'),
(155, 8, 'bandirma-vapuru-muzesi.jpg'),
(154, 8, 'Bandirma-Vapuru.jpg'),
(156, 8, 'd13a5187-320a-4ee2-bccf-d36cc82053fd.jpg'),
(157, 8, 'Samsun-Bandirma-Vapuru.jpg'),
(161, 6, '7325898.jpg'),
(162, 6, 'atakent-sahil_125545_bfd27.jpg'),
(163, 6, 'DSCF0618.jpg'),
(164, 6, 'KurtuluY-Yolu-Samsun.png'),
(165, 6, '5ca1c6d045d2a0296418dded.jpg'),
(166, 6, '423005.jpg'),
(167, 6, '8973615.jpg'),
(168, 6, 'karadeniz-in-dogal-sahili-korunan-tek-ili-old-11462052_amp.jpg'),
(171, 4, '1571316829_esnaf.ziyaret2.jpg'),
(172, 4, 'dsc_1918_9311-126.jpg'),
(173, 4, 'dsc_9137_3261-126.jpg'),
(174, 4, 'tekdeistanbul_4.jpg'),
(179, 5, 'baskan-atac-tan-gecmis-olsun-ziyaretleri-12784328_amp.jpg'),
(180, 5, 'baskan-mahalle-ziyaretlerine-devam-ediyor.jpg'),
(181, 5, 'baskan-tanistan-mahalle-ziyareti-1561729455.jpg'),
(182, 5, 'baskan-yuksele-tebrik-ziyaretleri-suruyor-1555321602.jpg');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `foto_galeri`
--

CREATE TABLE `foto_galeri` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `kapak` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` longtext COLLATE utf8_turkish_ci,
  `description` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `keywords` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '0',
  `baskan` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `foto_galeri`
--

INSERT INTO `foto_galeri` (`id`, `sira`, `adi`, `seo`, `kapak`, `aciklama`, `description`, `keywords`, `durum`, `baskan`, `tarih`, `dil`) VALUES
(5, 2, 'Başkan Ziyaretler', 'baskan-ziyaretler', 'baskan-tanistan-mahalle-ziyareti-1561729455.jpg', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>', 'Başkan Ziyaretler', 'Başkan Ziyaretler', 1, 0, '2020-01-23 10:13:12', 1),
(4, 0, 'Başkanla Fotoğraflarımız', 'baskanla-fotograflarimiz', 'dsc_1918_9311-126.jpg', '<p>Sizin firmanız, hakkında detaylı bilgiyi bu sayfaya yazabilirsiniz.&nbsp;Sitenize yine sizi anlatan istediğiniz sayıda sayfa ekleme şansınız bulunmaktadır. Mevcut sayfalarınızı dilediğiniz zaman gelişmiş y&ouml;netim paneli ile g&uuml;ncelleyebilirsiniz.&nbsp;Y&ouml;netim panellerimiz giriş seviyede bilgisayar bilgisine sahip her kullanıcı tarafından kolayca kullanılabilmektedir.</p>', 'Başkanla Fotoğraflarımız', 'Başkanla Fotoğraflarımız', 1, 1, '2020-02-01 11:06:30', 1),
(6, 1, 'Dernek & Belediye V7 Limanı ve Sahil Yolu', 'dernek-belediye-v7-limani-ve-sahil-yolu', 'KurtuluY-Yolu-Samsun.png', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Dernek & Belediye V7 Limanı ve Sahil Yolu', 'Dernek & Belediye V7 Limanı ve Sahil Yolu', 1, 0, '2020-02-07 21:37:39', 1),
(7, 3, 'Dernek & Belediye V7\'den Nostalji Fotoğraflar', 'dernek-belediye-v7-den-nostalji-fotograflar', '9-98.jpg', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Dernek & Belediye V7\'den Nostalji Fotoğraflar', 'Dernek & Belediye V7\'den Nostalji Fotoğraflar', 1, 0, '2020-02-07 21:38:17', 1),
(8, 4, 'Dernek & Belediye V7 Ve Müze', 'dernek-belediye-v7-ve-muze', 'SAMSUN-BANDIRMA_VAPURU-GULCAN_ACAR_11.jpg', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Dernek & Belediye V7 Ve Müze', 'Dernek & Belediye V7 Ve Müze', 1, 0, '2020-02-07 21:38:48', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `haberfoto`
--

CREATE TABLE `haberfoto` (
  `id` int(11) NOT NULL,
  `resimid` int(11) NOT NULL,
  `resim` text COLLATE utf8_turkish_ci NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `haberfoto`
--

INSERT INTO `haberfoto` (`id`, `resimid`, `resim`) VALUES
(6, 5, 'iscilerden-sozlesme-ve-yuzde-18-zamma-davullu-zurnali-kutlama_909.jpg'),
(7, 5, 'TOPLU-SOZLEYMEYE-DAVULLU-ZURNALI-KUTLAMA-FOTO-1-2.jpg'),
(2, 14, '186301.jpg'),
(3, 14, 'gulan-grup-tan-sancaktepe-ye-200-milyon-liralik-dev-yatirim-otostat.jpg'),
(4, 14, 'izmire-183-milyon-liralik-dev-yatirim-icin-ilk-kazma-vuruldu.jpg'),
(5, 14, 'KUMLAYA-40-MYLYON-LYRALIK-DEV-YATIRIM-FOTO-3.jpg');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `haberler`
--

CREATE TABLE `haberler` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `kategori` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` longtext COLLATE utf8_turkish_ci,
  `videoid` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `spot` text COLLATE utf8_turkish_ci,
  `keywords` text COLLATE utf8_turkish_ci,
  `description` text COLLATE utf8_turkish_ci,
  `durum` int(11) DEFAULT '0',
  `manset` int(11) DEFAULT '0',
  `manset_yani` int(11) DEFAULT '0',
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarihg` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `haberler`
--

INSERT INTO `haberler` (`id`, `sira`, `kategori`, `adi`, `seo`, `aciklama`, `videoid`, `spot`, `keywords`, `description`, `durum`, `manset`, `manset_yani`, `resim`, `tarih`, `tarihg`, `dil`) VALUES
(2, 1, 1, 'Vergi Haftası Başladı', 'vergi-haftasi-basladi', '<p>Vergi Haftası, Kutlamalar, Ziyaretler ve Bilin&ccedil;lendirme toplantılarıyla start aldı. 25 Şubat 3 Mart tarihleri arasında kutlanacak olan etkinlikler kapsamında Sizin Belediye Başkanı\'nı&nbsp;makamında ziyaret eden Vergi Dairesi M&uuml;d&uuml;r&uuml; , Başkan\'a &ccedil;i&ccedil;ek takdim edip, rozet taktı.</p>\r\n<p>Vergi Dairesi memurlarının da katıldığı ziyarette konuşan Vergi Dairesi M&uuml;d&uuml;r&uuml;, hafta boyunca ziyaretlerin yanı sıra, &ouml;zellikle okullara y&ouml;nelik, bilin&ccedil;lendirme ve bilgilendirme toplantılarını devam ettireceklerini s&ouml;yledi.</p>\r\n<p>Verginin vatandaşlık g&ouml;revi olduğunu anlatan Vergi Dairesi M&uuml;d&uuml;r&uuml;, devlet b&uuml;t&ccedil;esinin y&uuml;zde 85\'inin vergiden oluştuğunu a&ccedil;ıkladı. Kutsal g&ouml;revle ilgili okullarda toplantılara devam edeceklerini vurguladı.Hafta boyunca ziyaret, bilgilendirme ve bilin&ccedil;lendirme toplantılarının aralıksız devam edeceğini s&ouml;zlerine ekledi.</p>', '', 'Vergi Haftası, Kutlamalar, Ziyaretler ve Bilinçlendirme toplantılarıyla start aldı. 25 Şubat 3 Mart tarihleri arasında kutlanacak olan etkinlikler kapsamında Sizin Belediye Başkanı\'nı makamında ziyaret eden Vergi Dairesi Müdürü , Başkan\'a çiçek takdim edip, rozet taktı.', 'Vergi Haftası Başladı', 'Vergi Haftası Başladı', 1, 0, 0, 'vergi-haftasi-basladi.jpg', '06-01-2018 20:03', '06-01-2018 20:03', 1),
(14, 0, 1, '40 Milyon Liralık Dev Yatırım', '40-milyon-liralik-dev-yatirim', '<p>Su işlerinden Sizin Şehir&nbsp;X&nbsp;Mahallesine 40 milyonluk dev alt yapı yatırımı &ccedil;alışmaları başladı. B&uuml;y&uuml;kşehir Belediyesi, Sizin&nbsp;Belediyesi ve Su İşleri&nbsp;işbirliğiyle yapılacak &ccedil;alışmalar kapsamında yaz aylarında n&uuml;fusu 100 bine yaklaşan turistik X Mahallesinin t&uuml;m alt yapısı yenilenecek. Sizin Şehir&rsquo;den sonra Y İl&ccedil;esi&nbsp;ve ardından X Mahallesinde de yatırım atağına kalkan ekipler, kanserojen madde i&ccedil;eren asbestli boruların da değişeceğini a&ccedil;ıkladılar.</p>\r\n<p>Belediye Başkanı, Belediye Başkan Yardımcıları ,&nbsp;İ&ccedil;me Suyu Daire Başkanı ve Kanalizasyon Daire Başkanı\'nın&nbsp;yanı sıra teknik ekiple bir araya geldiler. Turistik X&nbsp;Mahallesinin i&ccedil;me suyu, kanalizasyon ve yağmur suyu giderlerinin tamamen yenileneceğini ifade eden Belediye Başkanı , B&uuml;y&uuml;kşehir Belediye Başkanı ve Su İşleri&nbsp;yetkililerine teşekk&uuml;r etti. Alt yapı hamlesinin arıtma tesisi ile destekleneceğini vurgulayan Gemlik Belediye Başkanı Refik Yılmaz, kamulaştırması tamamlanan arıtma tesisi yapım ihalesinin de &ouml;n&uuml;m&uuml;zdeki g&uuml;nlerde ger&ccedil;ekleşeceğini m&uuml;jdeledi.</p>', '80yhhveEQko', 'Su işlerinden Sizin Şehir X Mahallesine 40 milyonluk dev alt yapı yatırımı çalışmaları başladı.', '40 Milyon Liralık Dev Yatırım', '40 Milyon Liralık Dev Yatırım', 1, 1, 0, '40-milyon-liralik-dev-yatirim.jpg', '06-01-2018 22:02', '06-01-2018 22:02', 1),
(3, 2, 2, 'Belediye Personeline İtfaiye Eğitimi', 'belediye-personeline-itfaiye-egitimi', '<p>Sizin Belediye Başkanlığının, hizmet i&ccedil;i eğitim seminerleri s&uuml;r&uuml;yor. Teorik ve Uygulamalı Yangın ve İtfaiye eğitimi b&uuml;y&uuml;k ilgi g&ouml;rd&uuml;. Ticaret ve Sanayi Odası Toplantı salonunda yapılan seminere Belediye Başkan Yardımcısı\'nın&nbsp;yanı sıra belediye memur ve iş&ccedil;ileri ile daire amir ve m&uuml;d&uuml;rleri katıldı.</p>\r\n<p>B&uuml;y&uuml;kşehir Belediyesi İtfaiye Eğitim Amiri&nbsp;tarafından verilen seminerde, yangına ilk m&uuml;dahale, yangın &ccedil;eşitleri, yangın s&ouml;nd&uuml;rme metotları ve hangi yangına nasıl ve hangi ara&ccedil;larla m&uuml;dahale edileceği gibi konularda detaylı bilgiler verildi. Slayt ve videolu g&ouml;sterimle de kamuoyunda b&uuml;y&uuml;k yankı uyandıran yangınlar ve bu yangınlarda yapılan doğrular ile hayati yanlışlar da masaya yatırıldı. Belediye &ccedil;alışanlarının sorularının da yanıtlandığı seminer yaklaşık &uuml;&ccedil; saat s&uuml;rd&uuml;. Belediye Başkan Yardımcısı , itfaiye amirine teşekk&uuml;r ederek, personele y&ouml;nelik eğitim seminerlerinin devam edeceğini a&ccedil;ıkladı.&nbsp;</p>', '', 'Sizin Belediye Başkanlığının, hizmet içi eğitim seminerleri sürüyor. Teorik ve Uygulamalı Yangın ve İtfaiye eğitimi büyük ilgi gördü.', 'Belediye Personeline İtfaiye Eğitimi', 'Belediye Personeline İtfaiye Eğitimi', 1, 1, 1, 'belediye-personeline-itfaiye-egitimi.jpg', '06-01-2018 20:03', '06-01-2018 20:03', 1),
(4, 6, 4, 'Yol Süpürme Araçları Görücüye Çıktı', 'yol-supurme-araclari-gorucuye-cikti', '<p>&Ccedil;evreci faaliyetleri ile dikkat &ccedil;eken Sizin Belediyesi, daha temiz bir Şehir i&ccedil;in teknoloji ve &ccedil;evre sağlığıyla uyumlu imk&acirc;nları da değerlendirmeye aldı. Pilot B&ouml;lge olarak belirlenen Kumla Mahallesinde, Uğurel Limitet Şirketine ait elektrikli ve dizel yol s&uuml;p&uuml;rme ara&ccedil;ları test s&uuml;r&uuml;şleri yaptı. 100 litrelik torba stokuyla dikkat &ccedil;eken s&uuml;p&uuml;rme ara&ccedil;ları, 1,5 metrek&uuml;pl&uuml;k depoya sahip diğer temizlik ara&ccedil;ları ve damperli &ccedil;&ouml;p kamyonu ile destekleniyor. Bahar ayları boyunca devam edecek uygulamanın yaz aylarında n&uuml;fusu 100 bine yaklaşan Kumla&rsquo;da, tatil d&ouml;nemine hazırlık olarak nitelendiriliyor.</p>\r\n<p>Sizin Belediye Başkanı Ad SOYAD\'ın direktifleri doğrultusunda pilot b&ouml;lge olarak belirlenen X Mahallesinde teknolojik ve &ccedil;evreye duyarlı &ccedil;&ouml;p toplama ara&ccedil;ları vatandaşlar tarafından da b&uuml;y&uuml;k ilgi g&ouml;rd&uuml;. Her t&uuml;rl&uuml; &ccedil;&ouml;p, plastik, teneke, naylon, sigara paketi, sigara izmaritleri, şişe ve kumları toplayıp, &ouml;ğ&uuml;tebilen ara&ccedil;lar dikkat &ccedil;ekti. Şirket Yetkilisi Sezai Y&uuml;celli ile birlikte ara&ccedil;ların uygulama &ccedil;alışmalarını yerinde inceleyen ve notlar alan Sizin&nbsp;Belediyesi Temizlik İşleri M&uuml;d&uuml;r&uuml; Ad Soyad, zaman zaman ara&ccedil;ları kendi de kullanarak, test &ccedil;alışmalarında aktif rol aldı.</p>\r\n<p>Uygulamayı bahar ve yaz aylarında devam ettirmekten yana olduklarını ifade eden Sizin Belediyesi Temizlik İşleri M&uuml;d&uuml;r&uuml; Ad Soyad, turistik &ouml;zelliği nedeniyle X Mahallesinin pilot b&ouml;lge olarak belirlendiğini a&ccedil;ıkladı. X&nbsp;sahilinin tamamında, dar cadde ve sokaklarda temizlik konusunda etkili olacak &ccedil;&ouml;p toplama ara&ccedil;larının daha temiz ve daha yaşanabilir Şehir&nbsp;hedeflerinde &ouml;nemli bir yer tutacağını anlatan Ad Soyad, test &ccedil;alışmalarının başarıyla uygulandığını s&ouml;zlerine ekledi.</p>', '', 'Çevreci faaliyetleri ile dikkat çeken Sizin Belediyesi, daha temiz bir Şehir için teknoloji ve çevre sağlığıyla uyumlu imkânları da değerlendirmeye aldı.', 'Yol Süpürme Araçları Görücüye Çıktı', 'Yol Süpürme Araçları Görücüye Çıktı', 1, 1, 1, 'yol-supurme-araclari-gorucuye-cikti.jpg', '06-01-2018 20:03', '06-01-2018 20:03', 1),
(5, 9, 2, 'Başkan\'dan Öğrencilere Çorba İkramı, Sürpriz Ziyaret', 'baskan-dan-ogrencilere-corba-ikrami-surpriz-ziyaret', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Başkan\'dan Öğrencilere Çorba İkramı,Sürpriz Ziyaret', 'Başkan\'dan Öğrencilere Çorba İkramı, Sürpriz Ziyaret', 1, 1, 0, '_DX_2533.jpg', '14-01-2020 17:20', '14-01-2020 17:20', 1),
(6, 5, 1, '2020 Yatırım Ve Turizm Yılı Olacak', '2020-yatirim-ve-turizm-yili-olacak', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', NULL, 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', '2020 Yatırım Ve Turizm Yılı Olacak', '2020 Yatırım Ve Turizm Yılı Olacak', 1, 1, 0, 'b3e118f7mansetc.jpg', '14-01-2020 17:16', '14-01-2020 17:16', 1),
(7, 3, 1, 'Gazetecilik Gönül İşidir', 'gazetecilik-gonul-isidir', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', NULL, 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Gazetecilik Gönül İşidir', 'Gazetecilik Gönül İşidir', 1, 1, 0, 'gaziantep-buyuksehir-belediyesinden-dernegimize-ziyaret-1.jpg', '14-01-2020 17:15', '14-01-2020 17:15', 1),
(8, 8, 3, 'Şampiyonlar Samsun\'dan Çıkacak', 'sampiyonlar-samsun-dan-cikacak', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '80yhhveEQko', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Şampiyonlar Samsun\'dan Çıkacak', 'Şampiyonlar Samsun\'dan Çıkacak', 1, 1, 0, '51df1_w1000.jpg', '14-01-2020 17:19', '14-01-2020 17:19', 1),
(9, 9, 1, 'SASKİ 3 Milyon Liralık Su Kayıp Kaçağını Önledi', 'saski-3-milyon-liralik-su-kayip-kacagini-onledi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', NULL, 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'SASKİ 3 Milyon Liralık Su Kayıp Kaçağını Önledi', 'SASKİ 3 Milyon Liralık Su Kayıp Kaçağını Önledi', 1, 1, 0, 'su_kayiplarina_gecit_verilmiyor_h65749_2f202.jpg', '14-01-2020 17:21', '14-01-2020 17:21', 1),
(10, 9, 1, 'Ulaşım Koordinasyon Toplantısı Yapıldı', 'ulasim-koordinasyon-toplantisi-yapildi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', NULL, 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Ulaşım Koordinasyon Toplantısı Yapıldı', 'Ulaşım Koordinasyon Toplantısı Yapıldı', 1, 1, 0, 'il-koordinasyon-toplantisi-yapildi-12823392_amp.jpg', '14-01-2020 17:20', '14-01-2020 17:20', 1),
(11, 9, 1, 'Büyükşehir\'den Akıllı Şehir Buluşmaları', 'buyuksehir-den-akilli-sehir-bulusmalari', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', NULL, 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Büyükşehir\'den Akıllı Şehir Buluşmaları', 'Büyükşehir\'den Akıllı Şehir Buluşmaları', 1, 1, 0, 'buyuksehir-den-akilli-sehir-bulusmalari-12793150_amp.jpg', '14-01-2020 17:19', '14-01-2020 17:19', 1),
(12, 9, 1, 'Başkan\'dan Ziyaret Ve Açılışlar', 'baskan-dan-ziyaret-ve-acilislar', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', NULL, 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Başkan\'dan Ziyaret Ve Açılışlar', 'Başkan\'dan Ziyaret Ve Açılışlar', 1, 1, 0, 'baskandan_ziyaret_ve_acilislar_h28250_70882.jpg', '14-01-2020 17:22', '14-01-2020 17:22', 1),
(13, 9, 1, 'Büyükşehir\'de Yatırımlara Engel Yok', 'buyuksehir-de-yatirimlara-engel-yok', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', NULL, 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Büyükşehir\'de Yatırımlara Engel Yok', 'Büyükşehir\'de Yatırımlara Engel Yok', 1, 1, 1, 'buyuksehir-de-yatirimlara-engel-yok-12784694_amp.jpg', '14-01-2020 17:22', '14-01-2020 17:22', 1),
(23, 8, 2, 'Büyükşehir, 2020 Yılına Ödülle Başladı', 'buyuksehir-2020-yilina-odulle-basladi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Büyükşehir,2020 Yılına Ödülle Başladı', 'Büyükşehir, 2020 Yılına Ödülle Başladı', 1, 1, 0, '2020_yilinin_ilk_buyuksehir_belediye_meclis_toplantisi_yapildi_h1652682.jpg', '14-01-2020 17:17', '14-01-2020 17:17', 1),
(15, 4, 1, 'Görev Başındakilere Moral Verdiler', 'gorev-basindakilere-moral-verdiler', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '80yhhveEQko', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Görev Başındakilere Moral Verdiler', 'Görev Başındakilere Moral Verdiler', 1, 1, 0, '_DX_1471.jpg', '14-01-2020 17:16', '14-01-2020 17:16', 1),
(16, 8, 1, 'Başkan\'dan Esnaflara Sürpriz Ziyaret', 'baskan-dan-esnaflara-surpriz-ziyaret', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\n<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', NULL, 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Başkan\'dan Esnaflara Sürpriz Ziyaret', 'Başkan\'dan Esnaflara Sürpriz Ziyaret', 1, 1, 0, 'baskan-yasardan-gimat-esnafina-ziyaret-1551428705.jpg', '14-01-2020 17:17', '14-01-2020 17:17', 1),
(17, 7, 4, 'SASKİ\'den Mazgallara Çöp Atmayın Uyarısı', 'saski-den-mazgallara-cop-atmayin-uyarisi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'SASKİ\'den Mazgallara Çöp Atmayın Uyarısı', 'SASKİ\'den Mazgallara Çöp Atmayın Uyarısı', 1, 1, 0, 'f4d3b06b-7cce-4942-9d35-768ce3b990b2.jpg', '14-01-2020 17:18', '14-01-2020 17:18', 1),
(18, 9, 1, 'Hep Beraber Samsun\'umuza Sahip Çıkalım', 'hep-beraber-samsun-umuza-sahip-cikalim', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '80yhhveEQko', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Hep Beraber Samsun\'umuza Sahip Çıkalım', 'Hep Beraber Samsun\'umuza Sahip Çıkalım', 1, 1, 0, 'untitled-1_761.jpg', '14-01-2020 17:19', '14-01-2020 17:19', 1),
(19, 9, 1, 'Hayırseverlerimizle Gurur Duyuyoruz', 'hayirseverlerimizle-gurur-duyuyoruz', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', NULL, 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Hayırseverlerimizle Gurur Duyuyoruz', 'Hayırseverlerimizle Gurur Duyuyoruz', 1, 1, 1, '_DX_0053.jpg', '14-01-2020 17:19', '14-01-2020 17:19', 1),
(20, 9, 1, 'Büyükşehir\'den Öğrencilere Büyük Kolaylık', 'buyuksehir-den-ogrencilere-buyuk-kolaylik', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Büyükşehir\'den Öğrencilere Büyük Kolaylık', 'Büyükşehir\'den Öğrencilere Büyük Kolaylık', 1, 0, 0, '29924_2.jpg', '14-01-2020 17:20', '14-01-2020 17:20', 1),
(21, 8, 1, 'Büyükşehir\'den Hizmet İçi Eğitim Semineri', 'buyuksehir-den-hizmet-ici-egitim-semineri', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', NULL, 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Büyükşehir\'den Hizmet İçi Eğitim Semineri', 'Büyükşehir\'den Hizmet İçi Eğitim Semineri', 1, 1, 0, '718241172769268.jpg', '14-01-2020 17:21', '14-01-2020 17:21', 1),
(22, 9, 4, 'Büyükşehir\'in Ulaşım Yatırımları Devam Ediyor', 'buyuksehir-in-ulasim-yatirimlari-devam-ediyor', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Büyükşehir\'in Ulaşım Yatırımları Devam Ediyor', 'Büyükşehir\'in Ulaşım Yatırımları Devam Ediyor', 1, 0, 1, 'buyuksehir-in-ulasim-yatirimlari-devam-ediyor-12754785_amp.jpg', '14-01-2020 17:21', '14-01-2020 17:21', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `haber_kategori`
--

CREATE TABLE `haber_kategori` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `keywords` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `description` text COLLATE utf8_turkish_ci,
  `kapak` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `haber_kategori`
--

INSERT INTO `haber_kategori` (`id`, `sira`, `adi`, `seo`, `keywords`, `description`, `kapak`, `durum`, `tarih`, `dil`) VALUES
(1, 0, 'GENEL HABERLER', 'genel-haberler', 'Genel Haberler', 'Genel Haberler', 'gaziantep-buyuksehir-belediyesinden-dernegimize-ziyaret-1.jpg', 1, '2020-01-31 12:36:28', 1),
(2, 1, 'EĞİTİM', 'egitim', 'Eğitim', 'Eğitim', '5d5f077618c7731cfc8cbc52.jpg', 1, '2020-01-31 12:36:43', 1),
(3, 2, 'SPOR', 'spor', 'Spor', 'Spor', 'futbol-sahasY.jpg', 1, '2020-01-31 12:36:51', 1),
(4, 3, 'ULAŞIM', 'ulasim', 'Ulaşım', 'Ulaşım', 'dernek-kapak.jpg', 1, '2020-01-31 12:37:03', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `havadurumu`
--

CREATE TABLE `havadurumu` (
  `tarih` datetime NOT NULL,
  `derece` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tahmin` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `img` text COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `havadurumu`
--

INSERT INTO `havadurumu` (`tarih`, `derece`, `tahmin`, `img`) VALUES
('2020-02-08 14:39:21', '-3&deg;', 'Kar Yağışlı', '//media.ntvhava.com/weather-images/170x159/w22.png'),
('2020-02-08 14:39:21', '1&deg;', 'Parçalı Bulutlu', '//media.ntvhava.com/weather-images/170x159/w4.png'),
('2020-02-08 14:39:21', '5&deg;', 'Parçalı Bulutlu', '//media.ntvhava.com/weather-images/170x159/w4.png');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `hit`
--

CREATE TABLE `hit` (
  `id` int(11) NOT NULL,
  `gun` int(11) DEFAULT '0',
  `ay` int(11) DEFAULT '0',
  `yil` int(11) DEFAULT '0',
  `simdi` int(11) DEFAULT '0',
  `sayac` int(11) DEFAULT '0',
  `ip` varchar(100) CHARACTER SET utf8 COLLATE utf8_turkish_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Tablo döküm verisi `hit`
--

INSERT INTO `hit` (`id`, `gun`, `ay`, `yil`, `simdi`, `sayac`, `ip`) VALUES
(1, 8, 2, 2020, 1581163684, 121, '195.155.192.14');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `hizmetler`
--

CREATE TABLE `hizmetler` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` text COLLATE utf8_turkish_ci,
  `keywords` text COLLATE utf8_turkish_ci,
  `description` text COLLATE utf8_turkish_ci,
  `durum` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `hizmetler`
--

INSERT INTO `hizmetler` (`id`, `sira`, `adi`, `seo`, `resim`, `aciklama`, `keywords`, `description`, `durum`, `tarih`, `dil`) VALUES
(1, 1, 'İmar İşleri', 'imar-isleri', '', '<p>1-Belediyesinin hizmet ama&ccedil;ları doğrultusunda Başkanın belirleyeceği prensip ve politika esasları &ccedil;er&ccedil;evesinde, kurum k&uuml;lt&uuml;r&uuml;, misyonu, vizyonu ve Belediye ile M&uuml;d&uuml;rl&uuml;k hedefleri doğrultusunda meri mevzuata uygun olarak &ccedil;alışmak.&nbsp;</p>\r\n<p>2-Başkanlık Makamına karşı sorumluluk bilincinde olmak.&nbsp;</p>\r\n<p>3-T&uuml;m iş ve işlemlerin hatasız, kaliteli ve zamanında yapılmasına &ouml;zen g&ouml;stererek hizmet kalitesini iyileştirmek.</p>\r\n<p>4-Mevcut kaynakları ve zamanı en verimli şekilde kullanarak hizmet maliyetlerini d&uuml;ş&uuml;rmek ve tasarruf sağlamak.&nbsp;</p>\r\n<p>5-M&uuml;d&uuml;rl&uuml;k hizmetlerinden faydalanan (personel ve halkımızın) Kuruma ve M&uuml;d&uuml;rl&uuml;ğe olan g&uuml;ven duygusunu geliştirmek.&nbsp;</p>\r\n<p>6-M&uuml;d&uuml;rl&uuml;ğ&uuml;n iş ve işlemlerinin yapılmasında teknolojiyi azami seviyede kullanmak.&nbsp;</p>\r\n<p>7-G&ouml;rev alanına giren işlerin yıllık plan ve programını yapmak, M&uuml;d&uuml;rl&uuml;k b&uuml;t&ccedil;esini hazırlamak.&nbsp;</p>\r\n<p>8-G&ouml;rev alanı ile ilgili Başkanlık Makamı tarafından verilen diğer g&ouml;revleri yapmak.<br />&nbsp;<br />&nbsp;</p>', 'İmar İşleri', 'İmar İşleri', 1, '2020-01-22 11:46:44', 1),
(2, 0, 'Yapı Kullanım', 'yapi-kullanim', '', '<p><strong>İSKAN RAPORU (YAPI KULLANMA İZİN BELGESİ)</strong></p>\r\n<p><strong>YAPI KULLANMA İZNİ NEDİR?</strong></p>\r\n<p>İnşaatı tamamlanan yapıların, bina ile ilgili t&uuml;m teknik işlemler tamamlandıktan sonra, yapının ruhsat ve eklerine uygun olduğunu, kullanılmasında fen ve sağlık bakımından herhangi bir sakınca olmadığını, i&ccedil;eriğinde; ruhsat bilgilerini, inşaatın bitim tarihini, tapu kaydını, adresini, bağımsız b&ouml;l&uuml;mlerin cinslerini, numaralarını, metrekarelerini, sınıflarını, mal sahiplerini g&ouml;steren ve Belediyemiz İmar ve Şehircilik M&uuml;d&uuml;rl&uuml;ğ&uuml; Yapı İşleri birimince d&uuml;zenlenen bir belgedir.</p>\r\n<p><strong>YAPI KULLANMA İZNİ OLMADAN BİNAMIZDA OTURAMAZ MIYIZ?</strong></p>\r\n<p>Yapı kullanma izni almadan binanıza; yasa gereğince su, elektrik, telefon v.s. aboneliği yaptıramazsınız.</p>\r\n<p><strong>YAPI KULLANMA İZNİ ALINIRKEN GEREKLİ BELGELER NELERDİR?</strong></p>\r\n<p>1- Dilek&ccedil;e</p>\r\n<p>2- Onaylı İnşaat Ruhsatı</p>\r\n<p>3- Tapu</p>\r\n<p>4- SSK&rsquo; dan alınacak ilişiksizlik belgesi (Borcu Yoktur Yazısı)</p>\r\n<p>5- İnşaat ruhsatında var ise sığınak, asans&ouml;r, yangın tesisat raporları</p>\r\n<p>6- Binanın cephelerinden alınmış 13x18 cm ebadında fotoğraflar</p>\r\n<p><strong>YAPI KULLANMA İZNİ NASIL ALINIR?</strong></p>\r\n<p>İskan raporu almak i&ccedil;in inşaat sahibi, m&uuml;teahhidi veya yetkilisi bir dilek&ccedil;e ile Belediyemize başvurmalıdır. Başvuruyu alan Yapı Kullanma İzni teknik elemanları binanın ruhsat ve eklerine uygun olarak yapılıp yapılmadığını yerinde kontrol ederek saptar. Binanın herhangi bir teknik eksikliği yoksa mal sahibi veya m&uuml;teahhidinden yapıyla ilgili olarak Sivil Savunma M&uuml;d&uuml;rl&uuml;ğ&uuml; sığınak raporu ile, yapının fenni sorumlusundan yapının kontrol&uuml; altında ruhsat ve eki projesine uygun olarak yapıldığına dair taahh&uuml;tnameyi &nbsp;Yapı kullanma İzni birimine vermesi istenir.&nbsp;</p>\r\n<p><br />Dosyası (Yukarıda belirtilen evraklar) tamamlanmış binalardaki her bağımsız b&ouml;l&uuml;m i&ccedil;in 3 &uuml;&ccedil; adet tapu fotokopisi ile belediyemiz Yapı İşleri birimine başvurulur.&nbsp;Yapı kullanma izni har&ccedil;ları ve katılım payları tahsil edildikten ve vergi dairesinden ilişik kestirdikten sonra bağımsız b&ouml;l&uuml;mler i&ccedil;in Yapı Kullanma İzni Belgesi d&uuml;zenlenir. &nbsp;</p>\r\n<p><br />Yapı kullanma izni ile ilgili kuruluşlara başvurarak su, elektirik ve telefon abonelikleri de yaptırılabilir<br />&nbsp;<br />&nbsp;</p>', 'Yapı Kullanım', 'Yapı Kullanım', 1, '2020-01-22 11:45:40', 1),
(3, 2, 'İnşaat Ruhsatı', 'insaat-ruhsati', '', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'İnşaat Ruhsatı', 'İnşaat Ruhsatı', 1, '2020-01-20 15:48:33', 1),
(4, 3, 'Numarataj', 'numarataj', '', '<p>G&ouml;rev ve Sorumluluklar<br />Adres ve Numaralama Y&ouml;netmeliğine uygun olarak meydan, bulvar, cadde, yol ve sokak ad ve numaraları ile bunlar &uuml;zerindeki binalara numara vermek ve alanda tabelaların takılması işleri y&uuml;r&uuml;tmek.<br />Oluşturulacak yeni mahallelerle ile ilgili işlemleri koordine etmek, konuyu Meclise intikal ettirerek gerekli &ccedil;alışmaları yapmak.</p>\r\n<p>Se&ccedil;im kanunlarına g&ouml;re İl&ccedil;e Se&ccedil;im Kurullarına ait Se&ccedil;men Sandıklarını muhafaza etmek, belirlenen adreslere dağıtmak ve toplatmak. Se&ccedil;men k&uuml;t&uuml;klerine esas olmak &uuml;zere binalara, sokak, cadde ve bulvarların kılavuz cetvellerini İl&ccedil;e Se&ccedil;im Kurullarına vermek. Arşivleme ve Veri Akış Şefliğinin G&ouml;rev, Yetki ve &Ccedil;alışma Konuları<br />Şube M&uuml;d&uuml;rl&uuml;ğ&uuml;n&uuml;n faaliyetlerinin d&uuml;zenli bir şekilde y&uuml;r&uuml;t&uuml;lmesi amacıyla birimler arası koordinasyonu sağlamak.</p>\r\n<p>Şube M&uuml;d&uuml;rl&uuml;ğ&uuml; i&ccedil;i ve dışı kurum ve kuruluş ve şahıs yazışmalarını takip etmek ve arşivlendirmek. &nbsp;Memur iş&ccedil;i ve s&ouml;zleşmeli personelle ilgili iş ve işlemleri d&uuml;zenli olarak yapmak.</p>\r\n<p>İhtiya&ccedil;ların tespiti, takibi ve ilgili birimlere ulaştırarak teminini sağlamak. Aylık ve yıllık faaliyetleri derleyerek, kayda ge&ccedil;irmek, ilgili birimleri bilgilendirmek.</p>\r\n<p>Şube M&uuml;d&uuml;r&uuml;n&uuml;n yasal mevzuat &ccedil;er&ccedil;evesinde vereceği diğer g&ouml;revleri yerine getirmek, takip etmek ve sonu&ccedil;landırmak.<br />Harita Şefliğinin G&ouml;rev, Yetki ve &Ccedil;alışma Konuları Numarataj &ccedil;alışmaları i&ccedil;in gerekli olan, il&ccedil;elere ve mahallelere g&ouml;re haritalar hazırlamak. Ulusal adres veritabanına işlenmiş cadde, sokak ve bulvarları haritalara işleyerek, g&uuml;ncel tutulmasını sağlamak.<br />Diğer kurumlar ve muhtarlıklar tarafından talep edilen mahalle haritalarının &ccedil;ıktılarını hazırlamak. Şube M&uuml;d&uuml;r&uuml;n&uuml;n yasal mevzuat &ccedil;er&ccedil;evesinde vereceği diğer g&ouml;revleri yerine getirmek, takip etmek ve sonu&ccedil;landırmak.<br />Numarataj Şefliğinin G&ouml;rev, Yetki ve &Ccedil;alışma Konuları<br />Meydan, bulvar, cadde, sokak ve yolların isimleri ve numaraları ile bunların &uuml;zerindeki binalara numara vermek bu yerlerle ilgili numarataj &ccedil;alışması yapmak, tabelalarını yapmak ve alanda uygulamak.Meydan, bulvar, cadde, sokak ve yolların isimlerine g&ouml;re tabelaların &uuml;retimini yapmak, yaptırmak ve alanda uygulamak.Alanda uygulanan numarataj &ccedil;alışmasının, cadde, sokak, bulvar isimlerinin ve bunlar &uuml;zerindeki binaların numaralarının (ADRES KAYIT SİSTEMİNDE) ulusal adres veritabanına işlenmesini sağlamak.Y&uuml;ksek Se&ccedil;im Kurulu tarafından Belediyeye verilen se&ccedil;im sandıklarının se&ccedil;im zamanlarında dağıtımı ve geri toplama işlemini yapmak Kurumların ve şahısların (ADRES KAYIT SİSTEMİNDE) ulusal adres veritabanında adresle ilgili başvurularını tetkik edip cevaplandırmak. Yeni yapılan binaların numaralarını tespit edip ulusal adres veritabanına işlenmesini sağlamak.</p>\r\n<p>Ulusal adres veritabanına erişen kurumların, adres bileşenlerinde tespit ettikleri hataları inceleyip giderilmesini sağlamak<br />&nbsp;<br />&nbsp;</p>', 'Numarataj', 'Numarataj', 1, '2020-01-22 11:43:58', 1),
(5, 4, 'Vergi İşlemleri', 'vergi-islemleri', '', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Vergi İşlemleri', 'Vergi İşlemleri', 1, '2020-01-20 15:49:12', 1),
(6, 5, 'İşyeri Açma Ruhsatı', 'isyeri-acma-ruhsati', '', '<p><strong>UMUMA A&Ccedil;IK İSTİRAHAT VE EĞLENCE YERİ</strong></p>\r\n<p>1- Tapu fotokopisi<br />2- Kira kontratı Aslı(mal sahibi ile yapılmamış ise vekaletname, tapuda hisseli ise muvaffakatname )<br />3- Yapı kullanma izin belgesi (Belediye imar m&uuml;d&uuml;rl&uuml;ğ&uuml;nden onaylı )<br />4- Vergi levhası fotokopisi<br />5- Kimlik fotokopisi<br />6- Ustalık belgesi &nbsp;( gerekli işyerleri i&ccedil;in )<br />7- Esnaf Sicil Tasdiknamesi-Oda &Uuml;yelik belgesi veya - Ticaret odası &uuml;yelik belgesi<br />8- Şirket ise Ticaret Sicili Gazetesi ana şirket s&ouml;zleşmesi ve imza sirk&uuml;leri<br />9- İtfaiye &nbsp; raporu<br />10- Bulaşıcı hastalık olmadığına dair sağlık raporu(&Ccedil;alışanlardan)<br />11- 1 adet Renkli fotoğraf ve bir adet plastik dosya<br />12- Devir ise devir dilek&ccedil;esi ve eski ruhsat<br />13- Adli sicil belgesi<br />14- Kolluk kuvveti g&ouml;r&uuml;ş yazısı<br />15 -Mesafe krokisi</p>\r\n<p><strong>GAYRİSIHHI M&Uuml;ESSESER</strong></p>\r\n<p>1- Tapu fotokopisi<br />2- Kira kontratı Aslı (mal sahibi ile yapılmamış ise vekaletname, tapuda hisseli ise &nbsp; &nbsp; &nbsp;muvaffakatname )<br />3- Yapı kullanma izin belgesi ( imar m&uuml;d&uuml;rl&uuml;ğ&uuml;nden onaylı )<br />4- Vergi levhası fotokopisi<br />5- Kimlik fotokopisi<br />6- Ustalık belgesi ( gerekli işyerleri i&ccedil;in )<br />7 -Esnaf Sicil Tasdiknamesi-Oda &Uuml;yelik belgesi veya - Ticaret odası &uuml;yelik belgesi<br />8- Şirket ise Ticaret Sicili Gazetesi ana şirket s&ouml;zleşmesi ve imza sirk&uuml;leri<br />9- İtfaiye &nbsp; raporu<br />10-&Ccedil;ED raporu ( gerekli işyerleri i&ccedil;in )<br />11-Bağlı olduğu &nbsp;odadan Kapasite raporu ( gerekli işyerleri i&ccedil;in )<br />12-Vaziyet Planı ( gerekli işyerleri i&ccedil;in )<br />13-1 adet Renkli fotoğraf ve bir adet plastik<br />14-İşletme Belgesi( Gerekli işyerleri i&ccedil;in) &Ccedil;alışma ve Sosyal Bakanlığı B&ouml;lge M&uuml;d.<br />15- Devir ise devir dilek&ccedil;esi ve eski ruhsat</p>\r\n<p><strong>SIHHİ İŞYERLERİ</strong></p>\r\n<p>1- Tapu fotokopisi<br />2- Kira kontratı Aslı (mal sahibi ile yapılmamış ise vekaletname, tapuda hisseli ise &nbsp;muvaffakatname<br />3- Yapı kullanma izin belgesi ( imar m&uuml;d&uuml;rl&uuml;ğ&uuml;nden onaylı )<br />4- Vergi levhası fotokopisi<br />5- Kimlik fotokopisi<br />6- Ustalık belgesi &nbsp;veya &nbsp;satış elemanlığı belgesi ( gerekli işyerleri i&ccedil;in )<br />7- Esnaf Sicil Tasdiknamesi - Oda &Uuml;yelik belgesi veya - Ticaret odası &uuml;yelik belgesi<br />8- Şirket ise Ticaret Sicili Gazetesi ana şirket s&ouml;zleşmesi ve imza sirk&uuml;leri<br />9- İtfaiye &nbsp; raporu<br />10- Devir ise devir dilek&ccedil;esi ve eski ruhsat<br />11-1 adet Renkli fotoğraf ve bir adet plastik dosya</p>\r\n<p><strong>MESUL M&Uuml;D&Uuml;RL&Uuml;K</strong></p>\r\n<p>a) İşyeri a&ccedil;ma ve &ccedil;alışma ruhsatının fotokobisi<br />b) İşyeri işletmecisi tarafından mesul m&uuml;d&uuml;r olarak atanacak şahsa verdiği vekaletname(noterden)<br />c) Dilek&ccedil;e<br />&ccedil;) Adli sicil belgesi<br />d) Bulaşıcı hastalık olmadığına dair sağlık raporu<br />e) N&uuml;fus c&uuml;zdan sureti</p>\r\n<p><strong>HAFTA TATİLİ RUHSATİ</strong></p>\r\n<p>1-Ruhsat fotokopisi<br />2-M&uuml;racaat formu</p>', 'İşyeri Açma Ruhsatı', 'İşyeri Açma Ruhsatı', 1, '2020-01-22 11:40:52', 1),
(7, 6, 'Evlilik Hizmetleri', 'evlilik-hizmetleri', '', '<p>Evlilik başvurusunda gerekli belgeler;</p>\r\n<p>1. Resimli N&uuml;fus c&uuml;zdanları aslı ve fotokopileri. &nbsp;10 yılı ge&ccedil;en n&uuml;fus c&uuml;zdanları ge&ccedil;ersizdir.Kabul edilmeyecektir.</p>\r\n<p>2. &Ccedil;iftlerden birinin &nbsp;Belediye sınırları i&ccedil;erisinde ikamet etmesi zorunludur.</p>\r\n<p>3. Son 6 ayda &ccedil;ekilmiş 4er adet vesikalık fotoğraf. FOTOKOPİ RESİMLER GE&Ccedil;ERSİZDİR.</p>\r\n<p>4. 16 yaşını doldurup , 17 sinden g&uuml;n alan adaylar Aile Mahkemesinden evlenme izin belgesi 17 yaşını bitirip 18 yaşından g&uuml;n alan adaylar noterden alınmış anne-baba muvafakatnamesi ile evlenebilirler.(Anne veya babadan biri &ouml;lm&uuml;ş ise &ouml;l&uuml;m&uuml; n&uuml;fus kaydı ile belgelenecektir).beraber gelmeleri zorunludur.</p>\r\n<p>5. Kayıt ve m&uuml;racaatlar sabah 08.30-16.00 saatleri arasında yapılır.M&uuml;racaat sonrasında,hazırlanacak evraklar bir sonraki g&uuml;n başvurunun yapıldığı ilgilidentemin edilir.Temin edilen evraklarda istenilen hususlar yerine getirilerek Nikah saati i&ccedil;in gerekli başvuru Yazı İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml;\'ne yapılır.</p>\r\n<p>6.Belediye Meclisinin ...... Tarih ve .......&nbsp;Sayılı kararı gereği:</p>\r\n<p>Nikah akdi &uuml;creti:<br />Belediye de yapılan nikah akdi &uuml;creti:<br />C&uuml;zdan Bedeli&nbsp; &nbsp; ............TL<br />&nbsp;</p>\r\n<p>Mal ayrılığı talebi olanların, noterden yaptırmış oldukları MAL AYRILIĞI S&Ouml;ZLEŞMESİ m&uuml;racaat dosyasına koyulur.<br />&nbsp;</p>\r\n<p>Kızlık soyadını kullanmak isteyenler, m&uuml;racaat anında ilgili memura talebini bildireceklerdir.</p>\r\n<p>M&Uuml;RACAAT EVRAKLARI, ALINDIĞI TARİHTEN İTİBAREN 6 AY S&Uuml;RE İLE GE&Ccedil;ERLİDİR.</p>\r\n<p>Yabancı Uyruklu Vatandaşlar i&ccedil;in alınacak belgeler hakkında Yazı İşleri M&uuml;d&uuml;rl&uuml;ğ&uuml; 543 23 20 (216) &nbsp;no\'lu telefonlardan bilgi alınabilir.</p>\r\n<p>İstenilen evraklar tamamlandıktan sonra g&uuml;n i&ccedil;in m&uuml;racaat edilecektir.Eksik evrakla m&uuml;racaat yasa gereği kabul edilmemektedir.</p>\r\n<p>EVLİLİK BAŞVURU EVRAKLARI D&Uuml;ZENLENDİĞİ TARİHTEN İTİBAREN 6 (ALTI AY) S&Uuml;RE &nbsp;İLE GE&Ccedil;ERLİ OLDUĞUNDAN &nbsp;İSTENİLEN &nbsp;NİKAH G&Uuml;N&Uuml; BU TARİH ARALIĞINI &nbsp;GE&Ccedil;MEYECEKTİR.</p>\r\n<p>Nikah şahitlerinin evlenecek kişileri tanıması ve T.C. Kimlik numaralarının bildirilmesi zorunludur.</p>', 'Evlilik Hizmetleri', 'Evlilik Hizmetleri', 1, '2020-01-22 11:32:03', 1),
(8, 7, 'Otobüs Seferleri', 'otobus-seferleri', '', '<p>Otob&uuml;s Seferleri</p>', 'Otobüs Seferleri', 'Otobüs Seferleri', 1, '2020-01-20 15:50:38', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `ihaleler`
--

CREATE TABLE `ihaleler` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `birim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `baslama_tarih` date DEFAULT NULL,
  `baslatma_saat` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `bitis_tarih` date DEFAULT NULL,
  `bitis_saat` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `ihale_durum` int(11) DEFAULT '0',
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` longtext COLLATE utf8_turkish_ci,
  `keywords` text COLLATE utf8_turkish_ci,
  `description` text COLLATE utf8_turkish_ci,
  `durum` int(11) DEFAULT '0',
  `anasayfa` int(11) DEFAULT '0',
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dosya` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `ihaleler`
--

INSERT INTO `ihaleler` (`id`, `sira`, `adi`, `birim`, `baslama_tarih`, `baslatma_saat`, `bitis_tarih`, `bitis_saat`, `ihale_durum`, `seo`, `aciklama`, `keywords`, `description`, `durum`, `anasayfa`, `resim`, `dosya`, `tarih`, `dil`) VALUES
(1, 1, 'Belediyemize Ait Hizmet Alanlarında Taş Tamiratı ve Döşemesi İşi', 'Fen İşleri', '2020-01-19', '12:10', '2020-01-19', '12:15', 1, 'belediyemize-ait-hizmet-alanlarinda-tas-tamirati-ve-dosemesi-isi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Belediyemize Ait Hizmet Alanlarında Taş Tamiratı ve Döşemesi İşi', 'Belediyemize Ait Hizmet Alanlarında Taş Tamiratı ve Döşemesi İşi', 1, 1, '', '', '2020-02-01 10:10:35', 1),
(2, 0, 'Eski Konservatuvar Binasının Kütüphaneye Çevrilmesi İşi', 'Yapı Kontrol', '2020-01-18', '12:30', '2020-01-18', '16:00', 2, 'eski-konservatuvar-binasinin-kutuphaneye-cevrilmesi-isi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Eski Konservatuvar Binasının Kütüphaneye Çevrilmesi İşi', 'Eski Konservatuvar Binasının Kütüphaneye Çevrilmesi İşi', 1, 1, '', 'ornek_3.pdf', '2020-01-31 15:28:45', 1),
(3, 2, 'Çim Biçimi, Yabancı Ot Temizliği ile Çanak Yapılması', 'Destek Hizmetleri', '2020-01-20', '10:00', '2020-01-20', '10:00', 3, 'cim-bicimi-yabanci-ot-temizligi-ile-canak-yapilmasi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Çim Biçimi,Yabancı Ot Temizliği ile Çanak Yapılması', 'Çim Biçimi, Yabancı Ot Temizliği ile Çanak Yapılması', 1, 1, '', '', '2020-02-01 10:11:11', 1),
(4, 3, '6 Kalem Muhtelif Bitki Alımı', 'Destek Hizmetleri', '2020-01-22', '17:42', '2020-01-22', '17:42', 0, '6-kalem-muhtelif-bitki-alimi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '6 Kalem Muhtelif Bitki Alımı', '6 Kalem Muhtelif Bitki Alımı', 1, 1, '', '', '2020-01-31 15:30:00', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `il`
--

CREATE TABLE `il` (
  `ID` int(11) NOT NULL,
  `ADI` varchar(20) COLLATE utf8_turkish_ci NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `il`
--

INSERT INTO `il` (`ID`, `ADI`) VALUES
(1, 'Adana'),
(2, 'Adiyaman'),
(3, 'Afyonkarahisar'),
(4, 'Ağri'),
(5, 'Amasya'),
(6, 'Ankara'),
(7, 'Antalya'),
(8, 'Artvin'),
(9, 'Aydin'),
(10, 'Balikesir'),
(11, 'Bilecik'),
(12, 'Bingöl'),
(13, 'Bitlis'),
(14, 'Bolu'),
(15, 'Burdur'),
(16, 'Bursa'),
(17, 'Çanakkale'),
(18, 'Çankiri'),
(19, 'Çorum'),
(20, 'Denizlİ'),
(21, 'Diyarbakir'),
(22, 'Edirne'),
(23, 'Elaziğ'),
(24, 'Erzincan'),
(25, 'Erzurum'),
(26, 'Eskişehir'),
(27, 'Gaziantep'),
(28, 'Giresun'),
(29, 'Gümüşhane'),
(30, 'Hakkari'),
(31, 'Hatay'),
(32, 'Isparta'),
(33, 'Mersin'),
(34, 'İstanbul'),
(35, 'İzmir'),
(36, 'Kars'),
(37, 'Kastamonu'),
(38, 'Kayseri'),
(39, 'Kirklareli'),
(40, 'Kirşehir'),
(41, 'Kocaeli'),
(42, 'Konya'),
(43, 'Kütahya'),
(44, 'Malatya'),
(45, 'Manisa'),
(46, 'Kahramanmaraş'),
(47, 'Mardin'),
(48, 'Muğla'),
(49, 'Muş'),
(50, 'Nevşehir'),
(51, 'Niğde'),
(52, 'Ordu'),
(53, 'Rize'),
(54, 'Sakarya'),
(55, 'Samsun'),
(56, 'Siirt'),
(57, 'Sinop'),
(58, 'Sivas'),
(59, 'Tekirdağ'),
(60, 'Tokat'),
(61, 'Trabzon'),
(62, 'Tuncelİ'),
(63, 'Şanlıurfa'),
(64, 'Uşak'),
(65, 'Van'),
(66, 'Yozgat'),
(67, 'Zonguldak'),
(68, 'Aksaray'),
(69, 'Bayburt'),
(70, 'Karaman'),
(71, 'Kirikkale'),
(72, 'Batman'),
(73, 'Şirnak'),
(74, 'Bartin'),
(75, 'Ardahan'),
(76, 'Iğdir'),
(77, 'Yalova'),
(78, 'Karabük'),
(79, 'Kilis'),
(80, 'Osmaniye'),
(81, 'Düzce');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `ilanlar`
--

CREATE TABLE `ilanlar` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` longtext COLLATE utf8_turkish_ci,
  `keywords` text COLLATE utf8_turkish_ci,
  `description` text COLLATE utf8_turkish_ci,
  `durum` int(11) DEFAULT '0',
  `anasayfa` int(11) DEFAULT '0',
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `ilanlar`
--

INSERT INTO `ilanlar` (`id`, `sira`, `adi`, `seo`, `aciklama`, `keywords`, `description`, `durum`, `anasayfa`, `resim`, `tarih`, `dil`) VALUES
(1, 0, 'Derebahçe Mahallesi İmar Plan Değişikliği', 'derebahce-mahallesi-imar-plan-degisikligi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Derebahçe Mahallesi İmar Plan Değişikliği', 'Derebahçe Mahallesi İmar Plan Değişikliği\r\n', 1, 1, 'dernek-kapak.jpg', '2020-01-27 16:29:04', 1),
(2, 1, 'Fatih Mahallesi İmar Plan Değişikliği', 'fatih-mahallesi-imar-plan-degisikligi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Fatih Mahallesi İmar Plan Değişikliği', 'Fatih Mahallesi İmar Plan Değişikliği\r\n', 1, 1, '', '2020-02-05 14:46:08', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `ilce`
--

CREATE TABLE `ilce` (
  `ID` int(11) NOT NULL,
  `IL_ID` int(11) NOT NULL,
  `ADI` varchar(25) COLLATE utf8_turkish_ci NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `ilce`
--

INSERT INTO `ilce` (`ID`, `IL_ID`, `ADI`) VALUES
(1, 1, 'Merkez'),
(2, 1, 'Aladag'),
(3, 1, 'Ceyhan'),
(4, 1, 'Feke'),
(5, 1, 'Imamoglu'),
(6, 1, 'Karaisali'),
(7, 1, 'Karatas'),
(8, 1, 'Kozan'),
(9, 1, 'Pozanti'),
(10, 1, 'Saimbeyli'),
(11, 1, 'Seyhan'),
(12, 1, 'Tufanbeyli'),
(13, 1, 'Yumurtalik'),
(14, 1, 'Yüregir'),
(15, 2, 'Merkez'),
(16, 2, 'Besni'),
(17, 2, 'Çelikhan'),
(18, 2, 'Gerger'),
(19, 2, 'Gölbasi'),
(20, 2, 'Kahta'),
(21, 2, 'Samsat'),
(22, 2, 'Sincik'),
(23, 2, 'Tut'),
(24, 3, 'Merkez'),
(25, 3, 'Basmakçi'),
(26, 3, 'Bayat'),
(27, 3, 'Bolvadin'),
(28, 3, 'Çobanlar'),
(29, 3, 'Çay'),
(30, 3, 'Dazkiri'),
(31, 3, 'Dinar'),
(32, 3, 'Emirdag'),
(33, 3, 'Evciler'),
(34, 3, 'Hocalar'),
(35, 3, 'Ihsaniye'),
(36, 3, 'Iscehisar'),
(37, 3, 'Kizilören'),
(38, 3, 'Sandikli'),
(39, 3, 'Sincanli'),
(40, 3, 'Sultandagi'),
(41, 3, 'Suhut'),
(42, 4, 'Merkez'),
(43, 4, 'Diyadin'),
(44, 4, 'Dogubeyazit'),
(45, 4, 'Eleskirt'),
(46, 4, 'Hamur'),
(47, 4, 'Patnos'),
(48, 4, 'Tasliçay'),
(49, 4, 'Tutak'),
(50, 5, 'Merkez'),
(51, 5, 'Göynücek'),
(52, 5, 'Gümüshacikö'),
(53, 5, 'Hamamözü'),
(54, 5, 'Merzifon'),
(55, 5, 'Suluova'),
(56, 5, 'Tasova'),
(57, 6, 'Merkez'),
(58, 6, 'Akyurt'),
(59, 6, 'Altindag'),
(60, 6, 'Ayas'),
(61, 6, 'Bala'),
(62, 6, 'Beypazari'),
(63, 6, 'Çamlidere'),
(64, 6, 'Çankaya'),
(65, 6, 'Çubuk'),
(66, 6, 'Elmadag'),
(67, 6, 'Etimesgut'),
(68, 6, 'Evren'),
(69, 6, 'Gölbasi'),
(70, 6, 'Güdül'),
(71, 6, 'Haymana'),
(72, 6, 'Kalecik'),
(73, 6, 'Kazan'),
(74, 6, 'Keçiören'),
(75, 6, 'Kizilcahama'),
(76, 6, 'Mamak'),
(77, 6, 'Nallihan'),
(78, 6, 'Polatli'),
(79, 6, 'Sincan'),
(80, 6, 'Sereflikoçh'),
(81, 6, 'Yenimahalle'),
(82, 7, 'Merkez'),
(83, 7, 'Akseki'),
(84, 7, 'Alanya'),
(85, 7, 'Demre'),
(86, 7, 'Elmali'),
(87, 7, 'Finike'),
(88, 7, 'Gazipasa'),
(89, 7, 'Gündogmus'),
(90, 7, 'Ibradi'),
(91, 7, 'Kale'),
(92, 7, 'Kas'),
(93, 7, 'Kemer'),
(94, 7, 'Korkuteli'),
(95, 7, 'Kumluca'),
(96, 7, 'Manavgat'),
(97, 7, 'Serik'),
(98, 8, 'Merkez'),
(99, 8, 'Ardanuç'),
(100, 8, 'Arhavi'),
(101, 8, 'Borçka'),
(102, 8, 'Hopa'),
(103, 8, 'Murgul'),
(104, 8, 'Savsat'),
(105, 8, 'Yusufeli'),
(106, 9, 'Merkez'),
(107, 9, 'Bozdogan'),
(108, 9, 'Buharkent'),
(109, 9, 'Çine'),
(110, 9, 'Germencik'),
(111, 9, 'Incirliova'),
(112, 9, 'Karacasu'),
(113, 9, 'Karpuzlu'),
(114, 9, 'Koçarli'),
(115, 9, 'Kösk'),
(116, 9, 'Kusadasi'),
(117, 9, 'Kuyucak'),
(118, 9, 'Nazilli'),
(119, 9, 'Söke'),
(120, 9, 'Sultanhisar'),
(121, 9, 'Yenihisar'),
(122, 9, 'Yenipazar'),
(123, 10, 'Merkez'),
(124, 10, 'Ayvalik'),
(125, 10, 'Akçay'),
(126, 10, 'Balya'),
(127, 10, 'Bandirma'),
(128, 10, 'Bigadiç'),
(129, 10, 'Burhaniye'),
(130, 10, 'Dursunbey'),
(131, 10, 'Edremit'),
(132, 10, 'Erdek'),
(133, 10, 'Gönen'),
(134, 10, 'Gömeç'),
(135, 10, 'Havran'),
(136, 10, 'Ivrindi'),
(137, 10, 'Kepsut'),
(138, 10, 'Manyas'),
(139, 10, 'Marmara'),
(140, 10, 'Savastepe'),
(141, 10, 'Sindirgi'),
(142, 10, 'Susurluk'),
(143, 11, 'Merkez'),
(144, 11, 'Bozöyük'),
(145, 11, 'Gölpazari'),
(146, 11, 'Inhisar'),
(147, 11, 'Osmaneli'),
(148, 11, 'Pazaryeri'),
(149, 11, 'Sögüt'),
(150, 11, 'Yenipazar'),
(151, 12, 'Merkez'),
(152, 12, 'Adakli'),
(153, 12, 'Genç'),
(154, 12, 'Karliova'),
(155, 12, 'Kigi'),
(156, 12, 'Solhan'),
(157, 12, 'Yayladere'),
(158, 12, 'Yedisu'),
(159, 13, 'Merkez'),
(160, 13, 'Adilcevaz'),
(161, 13, 'Ahlat'),
(162, 13, 'Güroymak'),
(163, 13, 'Hizan'),
(164, 13, 'Mutki'),
(165, 13, 'Tatvan'),
(166, 14, 'Merkez'),
(167, 14, 'Dörtdivan'),
(168, 14, 'Gerede'),
(169, 14, 'Göynük'),
(170, 14, 'Kibriscik'),
(171, 14, 'Mengen'),
(172, 14, 'Mudurnu'),
(173, 14, 'Seben'),
(174, 14, 'Yeniçaga'),
(175, 15, 'Merkez'),
(176, 15, 'Altinyayla'),
(177, 15, 'Aglasun'),
(178, 15, 'Bucak'),
(179, 15, 'Çavdir'),
(180, 15, 'Çeltikçi'),
(181, 15, 'Gölhisar'),
(182, 15, 'Karamanli'),
(183, 15, 'Kemer'),
(184, 15, 'Tefenni'),
(185, 15, 'Yesilova'),
(186, 16, 'Merkez'),
(187, 16, 'Büyükorhan'),
(188, 16, 'Gemlik'),
(189, 16, 'Gürsu'),
(190, 16, 'Harmancik'),
(191, 16, 'Inegöl'),
(192, 16, 'Iznik'),
(193, 16, 'Karacabey'),
(194, 16, 'Keles'),
(195, 16, 'Kestel'),
(196, 16, 'Mudanya'),
(197, 16, 'Mustafakema'),
(198, 16, 'Nilüfer'),
(199, 16, 'Orhaneli'),
(200, 16, 'Orhangazi'),
(201, 16, 'Osmangazi'),
(202, 16, 'Yenisehir'),
(203, 16, 'Yildirim'),
(204, 17, 'Merkez'),
(205, 17, 'Ayvacik'),
(206, 17, 'Bayramiç'),
(207, 17, 'Bozcaada'),
(208, 17, 'Biga'),
(209, 17, 'Çan'),
(210, 17, 'Eceabat'),
(211, 17, 'Ezine'),
(212, 17, 'Gelibolu'),
(213, 17, 'Gökçeada'),
(214, 17, 'Lapseki'),
(215, 17, 'Yenice'),
(216, 18, 'Merkez'),
(217, 18, 'Atkaracalar'),
(218, 18, 'Bayramören'),
(219, 18, 'Çerkes'),
(220, 18, 'Eldivan'),
(221, 18, 'Ilgaz'),
(222, 18, 'Kizilirmak'),
(223, 18, 'Korgun'),
(224, 18, 'Kursunlu'),
(225, 18, 'Orta'),
(226, 18, 'Ovacik'),
(227, 18, 'Sabanözü'),
(228, 18, 'Yaprakli'),
(229, 19, 'Merkez'),
(230, 19, 'Alaca'),
(231, 19, 'Bayat'),
(232, 19, 'Bogazkale'),
(233, 19, 'Dodurga'),
(234, 19, 'Iskilip'),
(235, 19, 'Kargi'),
(236, 19, 'Laçin'),
(237, 19, 'Mecitözü'),
(238, 19, 'Oguzlar'),
(239, 19, 'Ortaköy'),
(240, 19, 'Osmancik'),
(241, 19, 'Sungurlu'),
(242, 19, 'Ugurludag'),
(243, 20, 'Merkez'),
(244, 20, 'Acipayam'),
(245, 20, 'Akköy'),
(246, 20, 'Babadag'),
(247, 20, 'Baklan'),
(248, 20, 'Bekilli'),
(249, 20, 'Beyagaç'),
(250, 20, 'Buldan'),
(251, 20, 'Bozkurt'),
(252, 20, 'Çal'),
(253, 20, 'Çameli'),
(254, 20, 'Çardak'),
(255, 20, 'Çivril'),
(256, 20, 'Güney'),
(257, 20, 'Honaz'),
(258, 20, 'Kale'),
(259, 20, 'Sarayköy'),
(260, 20, 'Serinhisar'),
(261, 20, 'Tavas'),
(262, 21, 'Merkez'),
(263, 21, 'Bismil'),
(264, 21, 'Çermik'),
(265, 21, 'Çinar'),
(266, 21, 'Çüngüs'),
(267, 21, 'Dicle'),
(268, 21, 'Egil'),
(269, 21, 'Ergani'),
(270, 21, 'Hani'),
(271, 21, 'Hazro'),
(272, 21, 'Kocaköy'),
(273, 21, 'Kulp'),
(274, 21, 'Lice'),
(275, 21, 'Silvan'),
(276, 22, 'Merkez'),
(277, 22, 'Enez'),
(278, 22, 'Havsa'),
(279, 22, 'Ipsala'),
(280, 22, 'Kesan'),
(281, 22, 'Lalapasa'),
(282, 22, 'Meriç'),
(283, 22, 'Süloglu'),
(284, 22, 'Uzunköprü'),
(285, 23, 'Merkez'),
(286, 23, 'Agin'),
(287, 23, 'Alacakaya'),
(288, 23, 'Aricak'),
(289, 23, 'Baskil'),
(290, 23, 'Karakoçan'),
(291, 23, 'Keban'),
(292, 23, 'Kovancilar'),
(293, 23, 'Maden'),
(294, 23, 'Palu'),
(295, 23, 'Sivrice'),
(296, 24, 'Merkez'),
(297, 24, 'Çayirli'),
(298, 24, 'Iliç'),
(299, 24, 'Kemah'),
(300, 24, 'Kemaliye'),
(301, 24, 'Otlukbeli'),
(302, 24, 'Refahiye'),
(303, 24, 'Tercan'),
(304, 24, 'Üzümlü'),
(305, 25, 'Merkez'),
(306, 25, 'Askale'),
(307, 25, 'Çat'),
(308, 25, 'Hinis'),
(309, 25, 'Horasan'),
(310, 25, 'Ilica'),
(311, 25, 'Ispir'),
(312, 25, 'Karaçoban'),
(313, 25, 'Karayazi'),
(314, 25, 'Köprüköy'),
(315, 25, 'Narman'),
(316, 25, 'Oltu'),
(317, 25, 'Olur'),
(318, 25, 'Pasinler'),
(319, 25, 'Pazaryolu'),
(320, 25, 'Senkaya'),
(321, 25, 'Tekman'),
(322, 25, 'Tortum'),
(323, 25, 'Uzundere'),
(324, 26, 'Merkez'),
(325, 26, 'Alpu'),
(326, 26, 'Beylikova'),
(327, 26, 'Çifteler'),
(328, 26, 'Günyüzü'),
(329, 26, 'Han'),
(330, 26, 'Inönü'),
(331, 26, 'Mahmudiye'),
(332, 26, 'Mihalgazi'),
(333, 26, 'Mihaliççik'),
(334, 26, 'Saricakaya'),
(335, 26, 'Seyitgazi'),
(336, 26, 'Sivrihisar'),
(337, 27, 'Merkez'),
(338, 27, 'Araban'),
(339, 27, 'Islahiye'),
(340, 27, 'Kilis'),
(341, 27, 'Kargamis'),
(342, 27, 'Nizip'),
(343, 27, 'Nurdagi'),
(344, 27, 'Oguzeli'),
(345, 27, 'Sahinbey'),
(346, 27, 'Sehitkamil'),
(347, 27, 'Yavuzeli'),
(348, 28, 'Merkez'),
(349, 28, 'Alucra'),
(350, 28, 'Bulancak'),
(351, 28, 'Çamoluk'),
(352, 28, 'Çanakçi'),
(353, 28, 'Dereli'),
(354, 28, 'Dogankent'),
(355, 28, 'Espiye'),
(356, 28, 'Eynesil'),
(357, 28, 'Görele'),
(358, 28, 'Güce'),
(359, 28, 'Kesap'),
(360, 28, 'Piraziz'),
(361, 28, 'Sebinkarahisar'),
(362, 28, 'Tirebolu'),
(363, 28, 'Yaglidere'),
(364, 29, 'Merkez'),
(365, 29, 'Kelkit'),
(366, 29, 'Köse'),
(367, 29, 'Kürtün'),
(368, 29, 'Siran'),
(369, 29, 'Torul'),
(370, 30, 'Merkez'),
(371, 30, 'Çukurca'),
(372, 30, 'Semdinli'),
(373, 30, 'Yüksekova'),
(374, 31, 'Merkez'),
(375, 31, 'Altinözü'),
(376, 31, 'Belen'),
(377, 31, 'Dörtyol'),
(378, 31, 'Erzin'),
(379, 31, 'Hassa'),
(380, 31, 'Iskenderun'),
(381, 31, 'Kirikhan'),
(382, 31, 'Kumlu'),
(383, 31, 'Reyhanli'),
(384, 31, 'Samandagi'),
(385, 31, 'Yayladagi'),
(386, 32, 'Merkez'),
(387, 32, 'Aksu'),
(388, 32, 'Atabey'),
(389, 32, 'Egirdir'),
(390, 32, 'Gelendost'),
(391, 32, 'Gönen'),
(392, 32, 'Keçiborlu'),
(393, 32, 'Senirkent'),
(394, 32, 'Sütçüler'),
(395, 32, 'Sarkikaraag'),
(396, 32, 'Uluborlu'),
(397, 32, 'Yenisarbade'),
(398, 32, 'Yalvaç'),
(399, 33, 'Merkez'),
(400, 33, 'Anamur'),
(401, 33, 'Aydincik'),
(402, 33, 'Bozyazi'),
(403, 33, 'Çamliyayla'),
(404, 33, 'Erdemli'),
(405, 33, 'Gülnar'),
(406, 33, 'Mut'),
(407, 33, 'Silifke'),
(408, 33, 'Tarsus'),
(409, 34, 'Merkez'),
(410, 34, 'Adalar'),
(411, 34, 'Avcilar'),
(412, 34, 'Bagcilar'),
(413, 34, 'Bakirköy'),
(414, 34, 'Bahçelievler'),
(415, 34, 'Bayrampasa'),
(416, 34, 'Besiktas'),
(417, 34, 'Beykoz'),
(418, 34, 'Beyoglu'),
(419, 34, 'Büyükçekmece'),
(420, 34, 'Çatalca'),
(421, 34, 'Eminönü'),
(422, 34, 'Eyüp'),
(423, 34, 'Esenler'),
(424, 34, 'Fatih'),
(425, 34, 'Gaziosmanpasa'),
(426, 34, 'Güngören'),
(427, 34, 'Kadiköy'),
(428, 34, 'Kagithane'),
(429, 34, 'Kartal'),
(430, 34, 'Küçükçekmece'),
(431, 34, 'Maltepe'),
(432, 34, 'Pendik'),
(433, 34, 'Sariyer'),
(434, 34, 'Silivri'),
(435, 34, 'Sultanbeyli'),
(436, 34, 'Sile'),
(437, 34, 'Sisli'),
(438, 34, 'Tuzla'),
(439, 34, 'Ümraniye'),
(440, 34, 'Üsküdar'),
(441, 34, 'Yalova'),
(442, 34, 'Zeytinburnu'),
(443, 35, 'Merkez'),
(444, 35, 'Aliaga'),
(445, 35, 'Bayindir'),
(446, 35, 'Balçova'),
(447, 35, 'Bergama'),
(448, 35, 'Beydag'),
(449, 35, 'Bornova'),
(450, 35, 'Buca'),
(451, 35, 'Çesme'),
(452, 35, 'Çigli'),
(453, 35, 'Dikili'),
(454, 35, 'Foça'),
(455, 35, 'Gaziemir'),
(456, 35, 'Güzelbahçe'),
(457, 35, 'Karaburun'),
(458, 35, 'Karsiyaka'),
(459, 35, 'Kemalpasa'),
(460, 35, 'Kinik'),
(461, 35, 'Kiraz'),
(462, 35, 'Konak'),
(463, 35, 'Menderes'),
(464, 35, 'Menemen'),
(465, 35, 'Narlidere'),
(466, 35, 'Ödemis'),
(467, 35, 'Seferihisar'),
(468, 35, 'Selçuk'),
(469, 35, 'Tire'),
(470, 35, 'Torbali'),
(471, 35, 'Urla'),
(472, 36, 'Merkez'),
(473, 36, 'Akyaka'),
(474, 36, 'Arpaçay'),
(475, 36, 'Digor'),
(476, 36, 'Kagizman'),
(477, 36, 'Sarikamis'),
(478, 36, 'Selim'),
(479, 36, 'Susuz'),
(480, 37, 'Merkez'),
(481, 37, 'Abana'),
(482, 37, 'Agli'),
(483, 37, 'Araç'),
(484, 37, 'Azdavay'),
(485, 37, 'Bozkurt'),
(486, 37, 'Cide'),
(487, 37, 'Çatalzeytin'),
(488, 37, 'Daday'),
(489, 37, 'Devrekani'),
(490, 37, 'Doganyurt'),
(491, 37, 'Hanönü'),
(492, 37, 'Ihsangazi'),
(493, 37, 'Inebolu'),
(494, 37, 'Küre'),
(495, 37, 'Pinarbasi'),
(496, 37, 'Seydiler'),
(497, 37, 'Senpazar'),
(498, 37, 'Tasköprü'),
(499, 37, 'Tosya'),
(500, 38, 'Merkez'),
(501, 38, 'Akkisla'),
(502, 38, 'Bünyan'),
(503, 38, 'Develi'),
(504, 38, 'Felahiye'),
(505, 38, 'Hacilar'),
(506, 38, 'Incesu'),
(507, 38, 'Kocasinan'),
(508, 38, 'Melikgazi'),
(509, 38, 'Özvatan'),
(510, 38, 'Pinarbasi'),
(511, 38, 'Sarioglan'),
(512, 38, 'Sariz'),
(513, 38, 'Talas'),
(514, 38, 'Tomarza'),
(515, 38, 'Yahyali'),
(516, 38, 'Yesilhisar'),
(517, 39, 'Merkez'),
(518, 39, 'Babaeski'),
(519, 39, 'Demirköy'),
(520, 39, 'Kofçaz'),
(521, 39, 'Lüleburgaz'),
(522, 39, 'Pehlivanköy'),
(523, 39, 'Pinarhisar'),
(524, 39, 'Vize'),
(525, 40, 'Merkez'),
(526, 40, 'Akçakent'),
(527, 40, 'Akpinar'),
(528, 40, 'Boztepe'),
(529, 40, 'Çiçekdagi'),
(530, 40, 'Kaman'),
(531, 40, 'Mucur'),
(532, 41, 'Merkez'),
(533, 41, 'Darica'),
(534, 41, 'Gebze'),
(535, 41, 'Gölcük'),
(536, 41, 'Kandira'),
(537, 41, 'Karamürsel'),
(538, 41, 'Körfez'),
(539, 42, 'Merkez'),
(540, 42, 'Ahirli'),
(541, 42, 'Akören'),
(542, 42, 'Aksehir'),
(543, 42, 'Altinekin'),
(544, 42, 'Beysehir'),
(545, 42, 'Bozkir'),
(546, 42, 'Derebucak'),
(547, 42, 'Cihanbeyli'),
(548, 42, 'Çumra'),
(549, 42, 'Çeltik'),
(550, 42, 'Derbent'),
(551, 42, 'Doganhisar'),
(552, 42, 'Emirgazi'),
(553, 42, 'Eregli'),
(554, 42, 'Güneysinir'),
(555, 42, 'Halkapinar'),
(556, 42, 'Hadim'),
(557, 42, 'Hüyük'),
(558, 42, 'Ilgin'),
(559, 42, 'Kadinhani'),
(560, 42, 'Karapinar'),
(561, 42, 'Karatay'),
(562, 42, 'Kulu'),
(563, 42, 'Meram'),
(564, 42, 'Sarayönü'),
(565, 42, 'Selçuklu'),
(566, 42, 'Seydisehir'),
(567, 42, 'Taskent'),
(568, 42, 'Tuzlukçu'),
(569, 42, 'Yalihöyük'),
(570, 42, 'Yunak'),
(571, 43, 'Merkez'),
(572, 43, 'Altintas'),
(573, 43, 'Aslanapa'),
(574, 43, 'Cavdarhisar'),
(575, 43, 'Domaniç'),
(576, 43, 'Dumlupinar'),
(577, 43, 'Emet'),
(578, 43, 'Gediz'),
(579, 43, 'Hisarcik'),
(580, 43, 'Pazarlar'),
(581, 43, 'Simav'),
(582, 43, 'Saphane'),
(583, 43, 'Tavsanli'),
(584, 44, 'Merkez'),
(585, 44, 'Akçadag'),
(586, 44, 'Arapgir'),
(587, 44, 'Arguvan'),
(588, 44, 'Battalgazi'),
(589, 44, 'Darende'),
(590, 44, 'Dogansehir'),
(591, 44, 'Doganyol'),
(592, 44, 'Hekimhan'),
(593, 44, 'Kale'),
(594, 44, 'Kuluncak'),
(595, 44, 'Pötürge'),
(596, 44, 'Yazihan'),
(597, 44, 'Yesilyurt'),
(598, 45, 'Merkez'),
(599, 45, 'Ahmetli'),
(600, 45, 'Akhisar'),
(601, 45, 'Alasehir'),
(602, 45, 'Demirci'),
(603, 45, 'Gölmarmara'),
(604, 45, 'Gördes'),
(605, 45, 'Kirkagaç'),
(606, 45, 'Köprübasi'),
(607, 45, 'Kula'),
(608, 45, 'Salihli'),
(609, 45, 'Sarigöl'),
(610, 45, 'Saruhanli'),
(611, 45, 'Selendi'),
(612, 45, 'Soma'),
(613, 45, 'Turgutlu'),
(614, 46, 'Merkez'),
(615, 46, 'Afsin'),
(616, 46, 'Andirin'),
(617, 46, 'Çaglayancer'),
(618, 46, 'Ekinözü'),
(619, 46, 'Elbistan'),
(620, 46, 'Göksun'),
(621, 46, 'Nurhak'),
(622, 46, 'Pazarcik'),
(623, 46, 'Türkoglu'),
(624, 47, 'Merkez'),
(625, 47, 'Dargeçit'),
(626, 47, 'Derik'),
(627, 47, 'Kiziltepe'),
(628, 47, 'Mazidagi'),
(629, 47, 'Midyat'),
(630, 47, 'Nusaybin'),
(631, 47, 'Ömerli'),
(632, 47, 'Savur'),
(633, 47, 'Yesilli'),
(634, 48, 'Merkez'),
(635, 48, 'Bodrum'),
(636, 48, 'Dalaman'),
(637, 48, 'Datça'),
(638, 48, 'Fethiye'),
(639, 48, 'Kavaklidere'),
(640, 48, 'Köycegiz'),
(641, 48, 'Marmaris'),
(642, 48, 'Milas'),
(643, 48, 'Ortaca'),
(644, 48, 'Ula'),
(645, 48, 'Yatagan'),
(646, 49, 'Merkez'),
(647, 49, 'Bulanik'),
(648, 49, 'Hasköy'),
(649, 49, 'Korkut'),
(650, 49, 'Malazgirt'),
(651, 49, 'Varto'),
(652, 50, 'Merkez'),
(653, 50, 'Acigöl'),
(654, 50, 'Avanos'),
(655, 50, 'Derinkuyu'),
(656, 50, 'Gülsehir'),
(657, 50, 'Hacibektas'),
(658, 50, 'Kozakli'),
(659, 50, 'Ürgüp'),
(660, 51, 'Merkez'),
(661, 51, 'Altunhisar'),
(662, 51, 'Bor'),
(663, 51, 'Çamardi'),
(664, 51, 'Çiftlik'),
(665, 51, 'Ulukisla'),
(666, 52, 'Merkez'),
(667, 52, 'Akkus'),
(668, 52, 'Aybasti'),
(669, 52, 'Çamas'),
(670, 52, 'Çatalpinar'),
(671, 52, 'Çaybasi'),
(672, 52, 'Fatsa'),
(673, 52, 'Gölköy'),
(674, 52, 'Gölyali'),
(675, 52, 'Gürgentepe'),
(676, 52, 'Ikizce'),
(677, 52, 'Korgan'),
(678, 52, 'Kabadüz'),
(679, 52, 'Kabatas'),
(680, 52, 'Kumru'),
(681, 52, 'Mesudiye'),
(682, 52, 'Persembe'),
(683, 52, 'Ulubey'),
(684, 52, 'Ünye'),
(685, 53, 'Merkez'),
(686, 53, 'Ardesen'),
(687, 53, 'Çamlihemsin'),
(688, 53, 'Çayeli'),
(689, 53, 'Derepazari'),
(690, 53, 'Findikli'),
(691, 53, 'Güneysu'),
(692, 53, 'Hemsin'),
(693, 53, 'Ikizdere'),
(694, 53, 'Iyidere'),
(695, 53, 'Kalkandere'),
(696, 53, 'Pazar'),
(697, 54, 'Merkez'),
(698, 54, 'Akyazi'),
(699, 54, 'Ferizli'),
(700, 54, 'Geyve'),
(701, 54, 'Hendek'),
(702, 54, 'Karapürçek'),
(703, 54, 'Karasu'),
(704, 54, 'Kaynarca'),
(705, 54, 'Kocaali'),
(706, 54, 'Pamukova'),
(707, 54, 'Sapanca'),
(708, 54, 'Sögütlü'),
(709, 54, 'Tarakli'),
(710, 55, 'Merkez'),
(711, 55, 'Alaçam'),
(712, 55, 'Asarcik'),
(713, 55, 'Ayvacik'),
(714, 55, 'Bafra'),
(715, 55, 'Çarsamba'),
(716, 55, 'Havza'),
(717, 55, 'Kavak'),
(718, 55, 'Ladik'),
(719, 55, '19mayis'),
(720, 55, 'Salipazari'),
(721, 55, 'Tekkeköy'),
(722, 55, 'Terme'),
(723, 55, 'Vezirköprü'),
(724, 55, 'Yakakent'),
(725, 56, 'Merkez'),
(726, 56, 'Aydinlar'),
(727, 56, 'Baykan'),
(728, 56, 'Eruh'),
(729, 56, 'Kozluk'),
(730, 56, 'Kurtalan'),
(731, 56, 'Pervari'),
(732, 56, 'Sirvan'),
(733, 57, 'Merkez'),
(734, 57, 'Ayancik'),
(735, 57, 'Boyabat'),
(736, 57, 'Dikmen'),
(737, 57, 'Duragan'),
(738, 57, 'Erfelek'),
(739, 57, 'Gerze'),
(740, 57, 'Saraydüzü'),
(741, 57, 'Türkeli'),
(742, 58, 'Merkez'),
(743, 58, 'Akincilar'),
(744, 58, 'Altinyayla'),
(745, 58, 'Divrigi'),
(746, 58, 'Dogansar'),
(747, 58, 'Gemerek'),
(748, 58, 'Gölova'),
(749, 58, 'Gürün'),
(750, 58, 'Hafik'),
(751, 58, 'Imranli'),
(752, 58, 'Kangal'),
(753, 58, 'Koyulhisar'),
(754, 58, 'Susehri'),
(755, 58, 'Sarkisla'),
(756, 58, 'Ulas'),
(757, 58, 'Yildizeli'),
(758, 58, 'Zara'),
(759, 59, 'Merkez'),
(760, 59, 'Çerkezköy'),
(761, 59, 'Çorlu'),
(762, 59, 'Hayrabolu'),
(763, 59, 'Malkara'),
(764, 59, 'Marmaraeregli'),
(765, 59, 'Muratli'),
(766, 59, 'Saray'),
(767, 59, 'Sarköy'),
(768, 60, 'Merkez'),
(769, 60, 'Almus'),
(770, 60, 'Artova'),
(771, 60, 'Basçiftlik'),
(772, 60, 'Erbaa'),
(773, 60, 'Niksar'),
(774, 60, 'Pazar'),
(775, 60, 'Resadiye'),
(776, 60, 'Sulusaray'),
(777, 60, 'Turhal'),
(778, 60, 'Yesilyurt'),
(779, 60, 'Zile'),
(780, 61, 'Merkez'),
(781, 61, 'Akçaabat'),
(782, 61, 'Arakli'),
(783, 61, 'Arsin'),
(784, 61, 'Besikdüzü'),
(785, 61, 'Çarsibasi'),
(786, 61, 'Çaykara'),
(787, 61, 'Dernekpazar'),
(788, 61, 'Düzköy'),
(789, 61, 'Hayrat'),
(790, 61, 'Köprübasi'),
(791, 61, 'Maçka'),
(792, 61, 'Of'),
(793, 61, 'Sürmene'),
(794, 61, 'Salpazari'),
(795, 61, 'Tonya'),
(796, 61, 'Vakfikebir'),
(797, 61, 'Yomra'),
(798, 62, 'Merkez'),
(799, 62, 'Çemisgezek'),
(800, 62, 'Hozat'),
(801, 62, 'Mazgirt'),
(802, 62, 'Nazimiye'),
(803, 62, 'Ovacik'),
(804, 62, 'Pertek'),
(805, 62, 'Pülümür'),
(806, 63, 'Merkez'),
(807, 63, 'Akçakale'),
(808, 63, 'Birecik'),
(809, 63, 'Bozova'),
(810, 63, 'Ceylanpinar'),
(811, 63, 'Halfeti'),
(812, 63, 'Harran'),
(813, 63, 'Hilvan'),
(814, 63, 'Siverek'),
(815, 63, 'Suruç'),
(816, 63, 'Viransehir'),
(817, 64, 'Merkez'),
(818, 64, 'Banaz'),
(819, 64, 'Esme'),
(820, 64, 'Karahalli'),
(821, 64, 'Sivasli'),
(822, 64, 'Ulubey'),
(823, 65, 'Merkez'),
(824, 65, 'Bahçesaray'),
(825, 65, 'Baskale'),
(826, 65, 'Çaldiran'),
(827, 65, 'Çatak'),
(828, 65, 'Edremit'),
(829, 65, 'Ercis'),
(830, 65, 'Gevas'),
(831, 65, 'Gürpinar'),
(832, 65, 'Muradiye'),
(833, 65, 'Özalp'),
(834, 65, 'Saray'),
(835, 66, 'Merkez'),
(836, 66, 'Akdagmadeni'),
(837, 66, 'Aydincik'),
(838, 66, 'Bogazliyan'),
(839, 66, 'Çandir'),
(840, 66, 'Çayiralan'),
(841, 66, 'Çekerek'),
(842, 66, 'Kadisehri'),
(843, 66, 'Sarikaya'),
(844, 66, 'Saraykent'),
(845, 66, 'Sorgun'),
(846, 66, 'Sefaatli'),
(847, 66, 'Yenifakili'),
(848, 66, 'Yerköy'),
(849, 67, 'Merkez'),
(850, 67, 'Alapli'),
(851, 67, 'Çamoluk'),
(852, 67, 'Çaycuma'),
(853, 67, 'Devrek'),
(854, 67, 'Eflani'),
(855, 67, 'Eregli'),
(856, 67, 'Gökçebey'),
(857, 68, 'Merkez'),
(858, 68, 'Agaçören'),
(859, 68, 'Eskil'),
(860, 68, 'Gülagaç'),
(861, 68, 'Güzelyurt'),
(862, 68, 'Ortaköy'),
(863, 68, 'Sariyahsi'),
(864, 69, 'Merkez'),
(865, 69, 'Aydintepe'),
(866, 69, 'Demirözü'),
(867, 70, 'Merkez'),
(868, 70, 'Ayranci'),
(869, 70, 'Basyayla'),
(870, 70, 'Ermenek'),
(871, 70, 'Kazimkarabekir'),
(872, 70, 'Sariveliler'),
(873, 71, 'Merkez'),
(874, 71, 'Bahsili'),
(875, 71, 'Bagliseyh'),
(876, 71, 'Çelebi'),
(877, 71, 'Delice'),
(878, 71, 'Karakeçili'),
(879, 71, 'Keskin'),
(880, 71, 'Sulakyurt'),
(881, 71, 'Yahsihan'),
(882, 72, 'Merkez'),
(883, 72, 'Gercüs'),
(884, 72, 'Hasankeyf'),
(885, 72, 'Besiri'),
(886, 72, 'Kozluk'),
(887, 72, 'Sason'),
(888, 73, 'Merkez'),
(889, 73, 'Beytüsseba'),
(890, 73, 'Uludere'),
(891, 73, 'Cizre'),
(892, 73, 'Idil'),
(893, 73, 'Silopi'),
(894, 73, 'Güçlükonak'),
(895, 74, 'Merkez'),
(896, 74, 'Amasra'),
(897, 74, 'Kurucasile'),
(898, 74, 'Ulus'),
(899, 75, 'Merkez'),
(900, 75, 'Çildir'),
(901, 75, 'Damal'),
(902, 75, 'Göle'),
(903, 75, 'Hanak'),
(904, 75, 'Posof'),
(905, 76, 'Merkez'),
(906, 76, 'Aralik'),
(907, 76, 'Karakoyunlu'),
(908, 76, 'Tuzluca'),
(909, 77, 'Merkez'),
(910, 77, 'Altinova'),
(911, 77, 'Armutlu'),
(912, 77, 'Cinarcik'),
(913, 77, 'Ciftlikkoy'),
(914, 77, 'Termal'),
(915, 78, 'Merkez'),
(916, 78, 'Eflani'),
(917, 78, 'Eskipazar'),
(918, 78, 'Ovacik'),
(919, 78, 'Safranbolu'),
(920, 78, 'Yenice'),
(921, 79, 'Merkez'),
(922, 79, 'Elbeyli'),
(923, 79, 'Musabeyli'),
(924, 79, 'Polateli'),
(925, 80, 'Merkez'),
(926, 80, 'Bahçe'),
(927, 80, 'Hasanbeyli'),
(928, 80, 'Düziçi'),
(929, 80, 'Kadirli'),
(930, 80, 'Sunbas'),
(931, 80, 'Toprakkale'),
(932, 81, 'Merkez'),
(933, 81, 'Akçakoca'),
(934, 81, 'Cumayeri'),
(935, 81, 'Çilimli'),
(936, 81, 'Gölyaka'),
(937, 81, 'Gümüsova'),
(938, 81, 'Kaynasli'),
(939, 81, 'Yigilca'),
(940, 55, 'Atakum'),
(941, 34, 'Çekmeköy'),
(942, 34, 'Beylikdüzü'),
(943, 54, 'Adapazarı'),
(944, 54, 'Serdivan'),
(945, 55, 'Canik'),
(946, 33, 'Toroslar'),
(947, 33, 'Akdeniz'),
(948, 33, 'Yenişehir'),
(949, 33, 'Mezitli'),
(950, 34, 'Esenyurt'),
(951, 34, 'Sultangazi'),
(952, 34, 'Ataşehir'),
(953, 34, 'Sancaktepe'),
(954, 34, 'Başakşehir'),
(955, 34, 'Arnavutköy'),
(956, 1, 'Çukurova'),
(957, 1, 'Sarıçam'),
(958, 3, 'Sinanpaşa'),
(959, 6, 'Pursaklar'),
(960, 7, 'Kepez'),
(961, 7, 'Muratpaşa'),
(962, 7, 'Konyaaltı'),
(963, 7, 'Aksu'),
(964, 7, 'Döşemealtı'),
(965, 9, 'Efeler'),
(966, 9, 'Didim'),
(967, 10, 'Karesi'),
(968, 10, 'Altıeylül'),
(969, 20, 'Pamukkale'),
(970, 20, 'Merkezefendi'),
(971, 21, 'Bağlar'),
(972, 21, 'Kayapınar'),
(973, 21, 'Yenişehir'),
(974, 21, 'Sur'),
(975, 25, 'Yakutiye'),
(976, 25, 'Palandöken'),
(977, 25, 'Aziziye'),
(978, 26, 'Odunpazarı'),
(979, 26, 'Tepebaşı'),
(980, 31, 'Antakya'),
(981, 31, 'Defne'),
(982, 31, 'Arsuz'),
(983, 31, 'Payas'),
(984, 63, 'Eyyübiye'),
(985, 63, 'Haliliye'),
(986, 63, 'Karaköprü'),
(988, 54, 'Erenler'),
(989, 54, 'Arifiye'),
(990, 55, 'İlkadım'),
(991, 61, 'Ortahisar'),
(992, 41, 'İzmit'),
(993, 41, 'Derince'),
(994, 41, 'Çayırova'),
(995, 41, 'Kartepe'),
(996, 41, 'Başiskele'),
(997, 41, 'Dilovası'),
(998, 65, 'İpekyolu'),
(999, 65, 'Tuşba');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `kolaymenu`
--

CREATE TABLE `kolaymenu` (
  `id` int(11) NOT NULL,
  `menu_ust` int(11) DEFAULT '0',
  `menu_isim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `menu_url` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `link` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `sekme` int(11) DEFAULT '0',
  `menu_sira` int(2) DEFAULT '0',
  `menu_durum` int(1) DEFAULT '0',
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `kolaymenu`
--

INSERT INTO `kolaymenu` (`id`, `menu_ust`, `menu_isim`, `menu_url`, `link`, `sekme`, `menu_sira`, `menu_durum`, `dil`) VALUES
(1, 0, 'Haberler', 'haberler', ' ', 0, 1, 1, 1),
(2, 0, 'Güncel Duyurular', 'duyurular', ' ', 0, 2, 1, 1),
(3, 0, 'Etkinlikler', 'etkinlikler', ' ', 0, 5, 1, 1),
(4, 0, 'Fotoğraf Galerisi', 'foto-galeri', ' ', 0, 6, 1, 1),
(5, 0, 'İletişim Formu', 'iletisim', ' ', 0, 8, 1, 1),
(6, 0, 'Video Galeri', 'video-galeri', ' ', 0, 7, 1, 1),
(7, 0, 'Güncel İhaleler', 'ihaleler', '', 0, 3, 1, 1),
(8, 0, 'Güncel İlanlar', 'ilanlar', '', 0, 4, 1, 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `kullanici`
--

CREATE TABLE `kullanici` (
  `id` int(11) NOT NULL,
  `isim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `kadi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `sifre` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '0',
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `son_giris` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `rutbe` int(11) DEFAULT '0',
  `ktarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `kullanici`
--

INSERT INTO `kullanici` (`id`, `isim`, `kadi`, `sifre`, `email`, `durum`, `resim`, `tarih`, `son_giris`, `rutbe`, `ktarih`) VALUES
(6, 'Demo HESAP', 'admin', 'demo', 'demo@demo.com', 1, '', '2018-11-21 19:49:29', '2020-02-08 13:09:15', 0, '21-11-2018');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `limit_ayarlari`
--

CREATE TABLE `limit_ayarlari` (
  `id` int(11) NOT NULL,
  `limit_birim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_duyuru` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_etkinlik` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_faaliyet` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_haber` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_haberler` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_projeler` varchar(100) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_proje` varchar(100) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_foto` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_video` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_hizmet` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_ihale` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_ilan` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_karar` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_profil` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_profiller` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_anasayfa_haber` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `limit_sayfabirim` int(11) DEFAULT '0',
  `limit_sayfaduyuru` int(11) DEFAULT '0',
  `limit_sayfaetkinlik` int(11) DEFAULT '0',
  `limit_sayfafaaliyet` int(11) DEFAULT '0',
  `limit_sayfahaber` int(11) DEFAULT '0',
  `limit_sayfahaberler` int(11) DEFAULT '0',
  `limit_sayfaprojeler` int(11) DEFAULT '0',
  `limit_sayfaproje` int(11) DEFAULT '0',
  `limit_sayfafoto` int(11) DEFAULT '0',
  `limit_sayfavideo` int(11) DEFAULT '0',
  `limit_sayfahizmetler` int(11) DEFAULT '0',
  `limit_sayfaihale` int(11) DEFAULT '0',
  `limit_sayfailan` int(11) DEFAULT '0',
  `limit_sayfakarar` int(11) DEFAULT '0',
  `limit_sayfaprofil` int(11) DEFAULT '0',
  `limit_sayfaprofiller` int(11) DEFAULT '0',
  `limit_sayfaanasayfa_haber` int(11) DEFAULT '0',
  `limit_sayfaslider_haber` int(11) DEFAULT '0'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `limit_ayarlari`
--

INSERT INTO `limit_ayarlari` (`id`, `limit_birim`, `limit_duyuru`, `limit_etkinlik`, `limit_faaliyet`, `limit_haber`, `limit_haberler`, `limit_projeler`, `limit_proje`, `limit_foto`, `limit_video`, `limit_hizmet`, `limit_ihale`, `limit_ilan`, `limit_karar`, `limit_profil`, `limit_profiller`, `limit_anasayfa_haber`, `limit_sayfabirim`, `limit_sayfaduyuru`, `limit_sayfaetkinlik`, `limit_sayfafaaliyet`, `limit_sayfahaber`, `limit_sayfahaberler`, `limit_sayfaprojeler`, `limit_sayfaproje`, `limit_sayfafoto`, `limit_sayfavideo`, `limit_sayfahizmetler`, `limit_sayfaihale`, `limit_sayfailan`, `limit_sayfakarar`, `limit_sayfaprofil`, `limit_sayfaprofiller`, `limit_sayfaanasayfa_haber`, `limit_sayfaslider_haber`) VALUES
(1, '4', '12', '12', '12', '4', '4', '4', '4', '4', '4', '4', '12', '12', '12', '4', '6', '6', 24, 16, 16, 9, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 2, 4, 15);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `lisans`
--

CREATE TABLE `lisans` (
  `kod` varchar(555) COLLATE utf8_turkish_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `lisans`
--

INSERT INTO `lisans` (`kod`) VALUES
('3dc478b50cf74998ec5656eb65f64c17');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `mail_ayar`
--

CREATE TABLE `mail_ayar` (
  `id` int(11) NOT NULL,
  `m_server` varchar(255) CHARACTER SET utf8 COLLATE utf8_turkish_ci DEFAULT NULL,
  `m_port` varchar(50) CHARACTER SET utf8 COLLATE utf8_turkish_ci DEFAULT NULL,
  `m_adresi` varchar(255) CHARACTER SET utf8 COLLATE utf8_turkish_ci DEFAULT NULL,
  `m_parola` varchar(255) CHARACTER SET utf8 COLLATE utf8_turkish_ci DEFAULT NULL,
  `m_sertifika` varchar(255) DEFAULT NULL,
  `m_kime` varchar(255) CHARACTER SET utf8 COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Tablo döküm verisi `mail_ayar`
--

INSERT INTO `mail_ayar` (`id`, `m_server`, `m_port`, `m_adresi`, `m_parola`, `m_sertifika`, `m_kime`, `durum`) VALUES
(1, 'mail.siteadi.com', '587', 'test@siteadi.com', 'mailşifresi', 'tls', 'demo@hotmail.com', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `meclis_kararlari`
--

CREATE TABLE `meclis_kararlari` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `kararno` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `spot` text COLLATE utf8_turkish_ci,
  `aciklama` longtext COLLATE utf8_turkish_ci,
  `keywords` text COLLATE utf8_turkish_ci,
  `description` text COLLATE utf8_turkish_ci,
  `durum` int(11) DEFAULT '0',
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dosya` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `meclis_kararlari`
--

INSERT INTO `meclis_kararlari` (`id`, `sira`, `adi`, `kararno`, `seo`, `spot`, `aciklama`, `keywords`, `description`, `durum`, `resim`, `dosya`, `tarih`, `dil`) VALUES
(1, 0, '25 Ocak 2020 Tarihli Meclis Toplantısı ve Kararlar', '010203', '25-ocak-2020-tarihli-meclis-toplantisi-ve-kararlar', 'Türkçe Lorem İpsum. Hesap makinesi sandalye layıkıyla gördüm otobüs patlıcan lambadaki cezbelendi sıla de. Türemiş sıfat eve doğru şafak uzattı çobanın. Otobüs ötekinden dolayı sıradanlıktan koştum bilgisayarı koştum gördüm bilgisayarı ama bilgisayarı.', '<p>T&uuml;rk&ccedil;e Lorem İpsum. Hesap makinesi sandalye layıkıyla g&ouml;rd&uuml;m otob&uuml;s patlıcan lambadaki cezbelendi sıla de. T&uuml;remiş sıfat eve doğru şafak uzattı &ccedil;obanın. Otob&uuml;s &ouml;tekinden dolayı sıradanlıktan koştum bilgisayarı koştum g&ouml;rd&uuml;m bilgisayarı ama bilgisayarı.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl. Yapacakmış ve duyulmamış mutlu oldular koyun balıkhaneye g&ouml;rd&uuml;m koştum koşuyorlar g&uuml;l telefonu sıradanlıktan d&uuml;ş&uuml;n&uuml;yor. De g&ouml;rd&uuml;m &ccedil;&uuml;nk&uuml; sokaklarda ona doğru salladı eve doğru biber dışarı &ccedil;ıktılar anlamsız. Ve karşıdakine sinema sokaklarda &ouml;yle ki adresini gitti masaya doğru &ccedil;obanın bahar g&uuml;l sinema bilgiyasayarı. Umut tv mutlu oldular koyun patlıcan. Nedir ne demek T&uuml;rk&ccedil;e Lorem İpsum.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl.</p>', '25 Ocak 2020 Tarihli Meclis Toplantısı ve Kararlar', '25 Ocak 2020 Tarihli Meclis Toplantısı ve Kararlar', 1, 'dernek-kapak.jpg', 'ornek_3.pdf', '22-01-2020 11:31', 1),
(2, 1, '2020 Yılı Şubat Ayı Meclis Kararları', '01020304', '2020-yili-subat-ayi-meclis-kararlari', 'Belediye Başkanı Adınız SOYADINIZ; Bu günkü meclis gündeminin tüm maddelerinin yukarıda belirtildiği şekilde görüşüldüğünü izahla; meclis üyelerine bu toplantı içinde göstermiş oldukları çaba ve çalışmalardan dolayı teşekkür ederek, alınan kararların hayırlı ve uğurlu olması temennisiyle bu günkü meclis gündeminde görüşülecek başka madde olmadığından oturuma son verilmesine meclisimizce oybirliği ile karar verildi.', '<p>5393 Sayılı Belediye Kanununun 20. maddesi uyarınca Belediye Meclisi 2020/Şubat ayı aylık olağan toplantısı yapmak &uuml;zere Belediye Meclis Salonunda 10.01.2020 Pazartesi g&uuml;n&uuml; saat 16.00&rsquo;da 2018 toplantı d&ouml;neminin 23. birleşiminin 1. oturumunun yapılması i&ccedil;in toplandı.</p>\r\n<p>&nbsp;</p>\r\n<p>- Yoklama yapılarak Belediye Meclis &Uuml;yeleri&nbsp; Adınız Soyadınız&nbsp; ve Adınız SOYADINIZ&rsquo;ın mazeretli olarak&nbsp; toplantıya katılmadığı&nbsp; tespit edildi.</p>\r\n<p>- Toplantıya katılmayan Meclis &Uuml;yelerinin mazeret dilek&ccedil;eleri meclisimizce oybirliği ile kabul edildi. Bunların dışındaki diğer t&uuml;m meclis &uuml;yelerinin toplantıya katıldığı tespit edildi.</p>\r\n<p>&nbsp;</p>\r\n<p>KARAR:1</p>\r\n<p>İmar Komisyonu Raporunun g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Belediyemiz İmar ve Şehircilik M&uuml;d&uuml;rl&uuml;ğ&uuml; tarafından sunulan 30/10/2018 tarih 4247 sayılı yazısı</p>\r\n<p>Oylamaya ge&ccedil;ildi. İmar Komisyonunun almış olduğu karar meclisimizce oy birliği ile kabul edildi.</p>\r\n<p>&nbsp;</p>\r\n<p>KARAR:2</p>\r\n<p>İmar Komisyonu Raporunun g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Belediyemiz İmar ve Şehircilik&nbsp; M&uuml;d&uuml;rl&uuml;ğ&uuml; tarafından sunulan 27/11/2018 tarih 128232/4667 sayılı yazısının g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi.</p>\r\n<p>Oylamaya ge&ccedil;ildi. İmar Komisyonunun almış olduğu karar meclisimizce oy birliği ile kabul edildi.</p>\r\n<p>&nbsp;</p>\r\n<p>KARAR:3</p>\r\n<p>İmar Komisyonu Raporunun g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Belediyemiz İmar ve Şehircilik&nbsp; M&uuml;d&uuml;rl&uuml;ğ&uuml; tarafından sunulan 27/11/2018 tarih 122626/4668 sayılı yazısının g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Oylamaya ge&ccedil;ildi. İmar Komisyonunun almış olduğu karar meclisimizce oy birliği ile kabul edildi.</p>\r\n<p>&nbsp;</p>\r\n<p>KARAR:4</p>\r\n<p>İmar Komisyonu Raporunun g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Belediyemiz İmar ve Şehircilik&nbsp; M&uuml;d&uuml;rl&uuml;ğ&uuml; tarafından sunulan 27/11/2018 tarih 128348/4669 sayılı yazısının g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Oylamaya ge&ccedil;ildi. İmar Komisyonunun almış olduğu karar meclisimizce oy birliği ile kabul edildi.</p>\r\n<p>&nbsp;</p>\r\n<p>KARAR:5</p>\r\n<p>İmar Komisyonu Raporunun g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Belediye Meclis &uuml;yeleri Halil İbrahim ERKAN, Muzaffer YILDIRAN, Nalan &Ccedil;OLAK, Ender DUBAZ, Sami İKİZLER, B&uuml;lent ERES tarafından sunulan 06.12.2018 tarih 2018/21691 kayıt nolu park, tesis vb. yerlere isim verilmesi konulu &ouml;nergenin g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi.</p>\r\n<p>Oylamaya ge&ccedil;ildi. İmar Komisyonunun almış olduğu karar meclisimizce oy birliği ile kabul edildi.</p>\r\n<p>&nbsp;</p>\r\n<p>KARAR:6</p>\r\n<p>Plan ve B&uuml;t&ccedil;e Komisyonu Raporunun g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Belediyemiz Park ve Bah&ccedil;eler M&uuml;d&uuml;rl&uuml;ğ&uuml; tarafından sunulan 05.11.2018 tarih 714 sayılı yazısı nın g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi</p>\r\n<p>Oylamaya ge&ccedil;ildi. Plan ve B&uuml;t&ccedil;e Komisyonunun almış olduğu karar meclisimizce oy birliği ile kabul edildi.</p>\r\n<p>&nbsp;</p>\r\n<p>KARAR:7</p>\r\n<p>Plan ve B&uuml;t&ccedil;e Komisyonu Raporunun g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Belediyemiz Zabıta M&uuml;d&uuml;rl&uuml;ğ&uuml; tarafından sunulan 15/11/2018 tarih 127296/1522 sayılı yazısının g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi.</p>\r\n<p>Oylamaya ge&ccedil;ildi. Plan ve B&uuml;t&ccedil;e Komisyonunun almış olduğu karar meclisimizce oy birliği ile kabul edildi.</p>\r\n<p>&nbsp;</p>\r\n<p>KARAR:8</p>\r\n<p>Plan ve B&uuml;t&ccedil;e Komisyonu Raporunun g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Belediyemiz Basın Yayın ve Halkla İlişkiler M&uuml;d&uuml;rl&uuml;ğ&uuml; tarafından sunulan 29/11/2018 tarih 128189/590 sayılı&nbsp; yazısının g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi.</p>\r\n<p>Oylamaya ge&ccedil;ildi. Plan ve B&uuml;t&ccedil;e Komisyonunun almış olduğu karar meclisimizce oy birliği ile kabul edildi.</p>\r\n<p>&nbsp;</p>\r\n<p>KARAR:9</p>\r\n<p>Plan ve B&uuml;t&ccedil;e Komisyonu Raporunun g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. &nbsp;Belediyemiz Basın Yayın ve Halkla İlişkiler M&uuml;d&uuml;rl&uuml;ğ&uuml; tarafından sunulan 29/11/2018 tarih 128500/591 sayılı yazısının g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi.</p>\r\n<p>Oylamaya ge&ccedil;ildi. Plan ve B&uuml;t&ccedil;e Komisyonunun almış olduğu karar meclisimizce oy birliği ile kabul edildi.</p>\r\n<p>&nbsp;</p>\r\n<p>KARAR:10</p>\r\n<p>Plan ve B&uuml;t&ccedil;e Komisyonu Raporunun g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Belediyemiz Mali Hizmetler M&uuml;d&uuml;rl&uuml;ğ&uuml; tarafından sunulan 30/11/2018 tarih 128605/1098 sayılı yazının g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi</p>\r\n<p>Oylamaya ge&ccedil;ildi. Plan ve B&uuml;t&ccedil;e Komisyonunun almış olduğu karar meclisimizce oy birliği ile kabul edildi.</p>\r\n<p>&nbsp;</p>\r\n<p>KARAR:11</p>\r\n<p>Plan ve B&uuml;t&ccedil;e Komisyonu Raporunun g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Belediyemiz Emlak ve İstimlak M&uuml;d&uuml;rl&uuml;ğ&uuml; tarafından sunulan 04/12/2018 tarih 128999/1268 sayılı yazısının g&ouml;r&uuml;ş&uuml;lmesine ge&ccedil;ildi. Oylamaya ge&ccedil;ildi. Plan ve B&uuml;t&ccedil;e Komisyonunun almış olduğu karar meclisimizce oy &ccedil;okluğu ile&nbsp; kabul edildi. ( Meclis &Uuml;yeleri &nbsp;Harun CİHAN, İbrahim AKT&Uuml;RK, Mahir ARAS, Metin KANAT, Mustafa &Ccedil;ETİN, Turgut GEZER ve Ufuk BAYRAKTAR red oyu kullanmışlardır)</p>\r\n<p>&nbsp;</p>\r\n<p>BİLGİLENDİRME:</p>\r\n<p>Belediye Başkanı Adınız SOYADINIZ; Bu g&uuml;nk&uuml; meclis g&uuml;ndeminin t&uuml;m maddelerinin yukarıda belirtildiği şekilde g&ouml;r&uuml;ş&uuml;ld&uuml;ğ&uuml;n&uuml; izahla; meclis &uuml;yelerine bu toplantı i&ccedil;inde g&ouml;stermiş oldukları &ccedil;aba ve &ccedil;alışmalardan dolayı teşekk&uuml;r ederek, alınan kararların hayırlı ve uğurlu olması temennisiyle bu g&uuml;nk&uuml; meclis g&uuml;ndeminde g&ouml;r&uuml;ş&uuml;lecek başka madde olmadığından oturuma son verilmesine meclisimizce oybirliği ile karar verildi.</p>', '2020 Yılı Şubat Ayı Meclis Kararları', '2020 Yılı Şubat Ayı Meclis Kararları', 1, '', '', '25-02-2020 11:52', 1),
(3, 2, 'Dolu Kadro Derece Değişikliği', '030405', 'dolu-kadro-derece-degisikligi', 'Türkçe Lorem İpsum. Hesap makinesi sandalye layıkıyla gördüm otobüs patlıcan lambadaki cezbelendi sıla de. Türemiş sıfat eve doğru şafak uzattı çobanın. Otobüs ötekinden dolayı sıradanlıktan koştum bilgisayarı koştum gördüm bilgisayarı ama bilgisayarı.', '<p>T&uuml;rk&ccedil;e Lorem İpsum. Hesap makinesi sandalye layıkıyla g&ouml;rd&uuml;m otob&uuml;s patlıcan lambadaki cezbelendi sıla de. T&uuml;remiş sıfat eve doğru şafak uzattı &ccedil;obanın. Otob&uuml;s &ouml;tekinden dolayı sıradanlıktan koştum bilgisayarı koştum g&ouml;rd&uuml;m bilgisayarı ama bilgisayarı.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl. Yapacakmış ve duyulmamış mutlu oldular koyun balıkhaneye g&ouml;rd&uuml;m koştum koşuyorlar g&uuml;l telefonu sıradanlıktan d&uuml;ş&uuml;n&uuml;yor. De g&ouml;rd&uuml;m &ccedil;&uuml;nk&uuml; sokaklarda ona doğru salladı eve doğru biber dışarı &ccedil;ıktılar anlamsız. Ve karşıdakine sinema sokaklarda &ouml;yle ki adresini gitti masaya doğru &ccedil;obanın bahar g&uuml;l sinema bilgiyasayarı. Umut tv mutlu oldular koyun patlıcan. Nedir ne demek T&uuml;rk&ccedil;e Lorem İpsum.</p>\r\n<p>Bahar &ccedil;akıl adresini gidecekmiş kapının kulu yazın kalemi mutlu oldular eve doğru sandalye. Patlıcan lambadaki ışık dağılımı dışarı &ccedil;ıktılar batarya kutusu domates patlıcan mutlu oldular anlamsız d&uuml;ş&uuml;n&uuml;yor mutlu oldular mıknatıslı okuma sayfası &ccedil;akıl.</p>', 'Dolu Kadro Derece Değişikliği', 'Dolu Kadro Derece Değişikliği', 1, '', 'ornek_3_1.pdf', '25-01-2020 12:04', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `menu`
--

CREATE TABLE `menu` (
  `id` int(11) NOT NULL,
  `menu_ust` int(11) DEFAULT '0',
  `menu_isim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `menu_url` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `link` text COLLATE utf8_turkish_ci,
  `sekme` int(11) DEFAULT '0',
  `menu_sira` int(2) DEFAULT '0',
  `menu_durum` int(1) DEFAULT '0',
  `tip` int(11) DEFAULT '0',
  `tipkat` int(11) DEFAULT '0',
  `kategori` int(11) DEFAULT '0',
  `klimit` int(11) DEFAULT '0',
  `ilimit` int(11) DEFAULT '0',
  `tbuton` text COLLATE utf8_turkish_ci,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `menu`
--

INSERT INTO `menu` (`id`, `menu_ust`, `menu_isim`, `menu_url`, `link`, `sekme`, `menu_sira`, `menu_durum`, `tip`, `tipkat`, `kategori`, `klimit`, `ilimit`, `tbuton`, `dil`) VALUES
(1, 0, 'BAŞKAN', 'icerik/baskan-ozgecmis', ' ', 0, 1, 1, 0, 0, 0, 0, 0, '', 1),
(5, 0, 'KURUMSAL', '0', ' #', 0, 2, 1, 1, 0, 0, 0, 0, '', 1),
(8, 5, 'Meclis Kararları', 'meclis-kararlari', ' ', 0, 1, 1, 0, 0, 0, 0, 0, '', 1),
(9, 5, 'Faaliyet Raporları', 'faaliyet-raporlari', ' ', 0, 2, 1, 0, 0, 0, 0, 0, '', 1),
(10, 5, 'Meclis Üyeleri', 'profil-kategori/meclis-uyeleri', ' ', 0, 3, 1, 0, 0, 0, 0, 0, '', 1),
(11, 0, 'HİZMETLERİMİZ', 'hizmetler', ' ', 0, 3, 1, 1, 0, 0, 0, 0, 'hizmetler', 1),
(12, 11, 'İmar İşleri', 'hizmet/imar-isleri', ' ', 0, 1, 1, 0, 0, 0, 0, 0, '', 1),
(13, 11, 'Yapı Kullanım', 'hizmet/yapi-kullanim', ' ', 0, 2, 1, 0, 0, 0, 0, 0, '', 1),
(14, 11, 'İnşaat Ruhsatı', 'hizmet/insaat-ruhsati', ' ', 0, 3, 1, 0, 0, 0, 0, 0, '', 1),
(15, 11, 'Numarataj', 'hizmet/numarataj', ' ', 0, 4, 1, 0, 0, 0, 0, 0, '', 1),
(16, 11, 'Vergi İşlemleri', 'hizmet/vergi-islemleri', ' ', 0, 5, 1, 0, 0, 0, 0, 0, '', 1),
(17, 11, 'İşyeri Açma Ruhsatı', 'hizmet/isyeri-acma-ruhsati', ' ', 0, 6, 1, 0, 0, 0, 0, 0, '', 1),
(18, 11, 'Evlilik Hizmetleri', 'hizmet/evlilik-hizmetleri', ' ', 0, 7, 1, 0, 0, 0, 0, 0, '', 1),
(20, 0, 'BİRİMLER', 'birimler', ' ', 0, 4, 1, 1, 0, 0, 0, 0, 'birimler.html', 1),
(21, 20, 'Zabıta Amirliği', 'birim/zabita-amirligi', ' ', 0, 1, 1, 0, 0, 0, 0, 0, '', 1),
(22, 20, 'Yazı İşleri Müdürlüğü', 'birim/yazi-isleri-mudurlugu', ' ', 0, 2, 1, 0, 0, 0, 0, 0, '', 1),
(23, 20, 'Mali Hizmetler Müdürlüğü', 'birim/mali-hizmetler-mudurlugu', ' ', 0, 3, 1, 0, 0, 0, 0, 0, '', 1),
(24, 20, 'İnsan Kaynakları Ve Eğit.Müdürlüğü', 'birim/insan-kaynaklari-ve-egit-mudurlugu', ' ', 0, 4, 1, 0, 0, 0, 0, 0, '', 1),
(25, 20, 'Fen İşleri İmar Müdürlüğü', 'birim/fen-isleri-imar-mudurlugu', ' ', 0, 5, 1, 0, 0, 0, 0, 0, '', 1),
(26, 20, 'Muhtarlık İşleri Müdürlüğü', 'birim/muhtarlik-isleri-mudurlugu', ' ', 0, 6, 1, 0, 0, 0, 0, 0, '', 1),
(27, 0, 'PROJELER', 'projeler', ' ', 0, 5, 1, 2, 0, 1, 5, 12, '', 1),
(28, 0, 'HABERLER', 'haberler', ' ', 0, 6, 1, 2, 0, 0, 5, 12, '', 1),
(29, 0, 'KENT REHBERİ', '0', ' #', 0, 7, 1, 1, 0, 0, 0, 0, '', 1),
(30, 29, 'Tarihçe', 'icerik/tarihce', ' ', 0, 1, 1, 0, 0, 0, 0, 0, '', 1),
(31, 29, 'El Sanatları', 'icerik/el-sanatlari', ' ', 0, 2, 1, 0, 0, 0, 0, 0, '', 1),
(32, 29, 'Av Turizmi', 'icerik/av-turizmi', ' ', 0, 3, 1, 0, 0, 0, 0, 0, '', 1),
(33, 29, 'Kültürel Zenginlik', 'icerik/kulturel-zenginlik', ' ', 0, 4, 1, 0, 0, 0, 0, 0, '', 1),
(34, 29, 'Kentsel Doku', 'icerik/kentsel-doku', ' ', 0, 5, 1, 0, 0, 0, 0, 0, '', 1),
(35, 29, 'Doğal Güzellikler', 'icerik/dogal-guzellikler', ' ', 0, 6, 1, 0, 0, 0, 0, 0, '', 1),
(36, 0, 'İLETİŞİM', 'iletisim', ' ', 0, 8, 1, 0, 0, 0, 0, 0, '', 1),
(37, 5, 'Belediye Personeli', 'profil-kategori/belediye-personeli', ' ', 0, 4, 1, 0, 0, 0, 0, 0, '', 1),
(38, 5, 'Güncel Duyurular', 'duyurular', ' ', 0, 5, 1, 0, 0, 0, 0, 0, '', 1),
(39, 5, 'Güncel İhaleler', 'ihaleler', ' ', 0, 6, 1, 0, 0, 0, 0, 0, '', 1),
(40, 5, 'Güncel İlanlar', 'ilanlar', ' ', 0, 7, 1, 0, 0, 0, 0, 0, '', 1),
(41, 5, 'Etkinlikler', 'etkinlikler', ' ', 0, 8, 1, 0, 0, 0, 0, 0, '', 1),
(42, 5, 'Foto Galeri', 'foto-galeri', ' ', 0, 9, 1, 0, 0, 0, 0, 0, '', 1),
(43, 5, 'Video Galeri', 'video-galeri', ' ', 0, 10, 1, 0, 0, 0, 0, 0, '', 1),
(45, 5, 'Bağış Yap', 'bagis', '', 0, 11, 1, 0, 0, 0, 0, 0, '', 1),
(46, 5, 'Aidat Borcu Sorgulama ', 'aidat-sorgulama', '', 0, 12, 1, 0, 0, 0, 0, 0, '', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `mesajlar`
--

CREATE TABLE `mesajlar` (
  `id` int(11) NOT NULL,
  `isim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `konu` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `telefon` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '0',
  `mesaj` longtext COLLATE utf8_turkish_ci,
  `ip` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `buguntarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `mesajlar`
--

INSERT INTO `mesajlar` (`id`, `isim`, `konu`, `telefon`, `email`, `durum`, `mesaj`, `ip`, `tarih`, `buguntarih`) VALUES
(56, 'Örnek Müşteri 1', 'Site Demo Konu', '00000000000', 'demo@demo.com', 1, 'Site demosu için hazırlanmıştır.', '195.155.195.38', '2019-10-03 16:08:15', '1570050000');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `moduller`
--

CREATE TABLE `moduller` (
  `id` int(11) NOT NULL,
  `alan1` int(11) DEFAULT '0',
  `alan2` int(11) DEFAULT '0',
  `alan3` int(11) DEFAULT '0',
  `alan4` int(11) DEFAULT '0',
  `alan5` int(11) DEFAULT '0',
  `alan6` int(11) DEFAULT '0',
  `alan7` int(11) DEFAULT '0',
  `alan8` int(11) DEFAULT '0',
  `alan9` int(11) DEFAULT '0',
  `alan10` int(11) DEFAULT '0',
  `alan11` int(11) DEFAULT '0',
  `alan12` int(11) DEFAULT '0',
  `alan13` int(11) DEFAULT '0',
  `alan14` int(11) DEFAULT '0',
  `alan15` int(11) DEFAULT '0',
  `alan16` int(11) DEFAULT '0',
  `alan17` int(11) DEFAULT '0',
  `alan18` int(11) DEFAULT '0',
  `alan19` int(11) DEFAULT '0',
  `alan20` int(11) DEFAULT '0',
  `alan21` int(11) DEFAULT '0',
  `alan22` int(11) DEFAULT '0',
  `alan23` int(11) DEFAULT '0',
  `alan24` int(11) DEFAULT '0',
  `alan25` int(11) DEFAULT '0',
  `alan26` int(11) DEFAULT '0'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `moduller`
--

INSERT INTO `moduller` (`id`, `alan1`, `alan2`, `alan3`, `alan4`, `alan5`, `alan6`, `alan7`, `alan8`, `alan9`, `alan10`, `alan11`, `alan12`, `alan13`, `alan14`, `alan15`, `alan16`, `alan17`, `alan18`, `alan19`, `alan20`, `alan21`, `alan22`, `alan23`, `alan24`, `alan25`, `alan26`) VALUES
(1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `not_defteri`
--

CREATE TABLE `not_defteri` (
  `id` int(11) NOT NULL,
  `baslik` varchar(255) CHARACTER SET utf8 COLLATE utf8_turkish_ci DEFAULT NULL,
  `ekleyen` varchar(255) CHARACTER SET utf8 COLLATE utf8_turkish_ci DEFAULT NULL,
  `renk` varchar(7) CHARACTER SET utf8 COLLATE utf8_turkish_ci DEFAULT NULL,
  `baslangic` datetime DEFAULT NULL,
  `bitis` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Tablo döküm verisi `not_defteri`
--

INSERT INTO `not_defteri` (`id`, `baslik`, `ekleyen`, `renk`, `baslangic`, `bitis`) VALUES
(10, 'Dernek & Belediye V7 Yayın hayatına başlamıştır.', 'Demo HESAP', '#008000', '2020-02-08 00:00:00', '2020-02-08 00:00:00'),
(11, 'Site demosu için hazırlanmıştır.', 'Demo HESAP', '#0071c5', '2020-02-09 00:00:00', '2020-02-09 00:00:00');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `ortamenu`
--

CREATE TABLE `ortamenu` (
  `id` int(11) NOT NULL,
  `menu_ust` int(11) DEFAULT '0',
  `menu_isim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `menu_icon` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `menu_renk` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `menu_kisa` text COLLATE utf8_turkish_ci,
  `menu_url` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `link` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `sekme` int(11) DEFAULT '0',
  `menu_sira` int(2) DEFAULT '0',
  `menu_durum` int(1) DEFAULT '0',
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `ortamenu`
--

INSERT INTO `ortamenu` (`id`, `menu_ust`, `menu_isim`, `menu_icon`, `menu_renk`, `menu_kisa`, `menu_url`, `link`, `sekme`, `menu_sira`, `menu_durum`, `dil`) VALUES
(1, 0, 'HABERLER', 'far fa-newspaper', '#2e6876', 'Tüm Haberleri İnceleyin', 'haberler', ' ', 0, 1, 1, 1),
(2, 0, 'ETKİNLİKLER', 'far fa-calendar-alt', '#7d9e74', 'Tüm Etkinlikleri İnceleyin', 'etkinlikler', ' ', 0, 2, 1, 1),
(3, 0, 'PROJELER', 'fas fa-tasks', '#7585a1', 'Tüm Projeleri İnceleyin', 'projeler', ' ', 0, 3, 1, 1),
(4, 0, 'FOTOĞRAF GALERİ', 'fas fa-images', '#204f65', 'Tüm Fotoğrafları Görüntüle', 'foto-galeri', ' ', 0, 4, 1, 1),
(5, 0, 'VİDEO GALERİ', 'fas fa-video', '#846a7e', 'Tüm Videoları Görüntüle', 'video-galeri', ' ', 0, 5, 1, 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `paytr`
--

CREATE TABLE `paytr` (
  `id` int(11) NOT NULL,
  `magaza_no` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `magaza_parola` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `magaza_anahtar` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `hata_mesaj` int(11) DEFAULT '1',
  `test_modu` int(11) DEFAULT '1',
  `taksit` int(11) DEFAULT '0'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `paytr`
--

INSERT INTO `paytr` (`id`, `magaza_no`, `magaza_parola`, `magaza_anahtar`, `hata_mesaj`, `test_modu`, `taksit`) VALUES
(1, '000000', 'EjjjjjjjjjjjjjJ', 'aaaaaaaaaaaaaaaA', 1, 0, 0);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `popup_ayarlar`
--

CREATE TABLE `popup_ayarlar` (
  `id` int(11) NOT NULL,
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `url` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `sekme` int(11) DEFAULT '0',
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(255) DEFAULT '0',
  `dil` int(11) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `popup_ayarlar`
--

INSERT INTO `popup_ayarlar` (`id`, `adi`, `url`, `sekme`, `resim`, `durum`, `dil`) VALUES
(1, 'Dernek & Belediye V7', '#', 0, 'dernek_belediye_v7.png', 1, 0);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `profiller`
--

CREATE TABLE `profiller` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `kategori` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `gorevi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `description` text COLLATE utf8_turkish_ci,
  `keywords` text COLLATE utf8_turkish_ci,
  `aciklama` longtext COLLATE utf8_turkish_ci,
  `kapak` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '0',
  `facebook` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `twitter` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `instagram` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `linkedin` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `youtube` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `profiller`
--

INSERT INTO `profiller` (`id`, `sira`, `kategori`, `gorevi`, `adi`, `seo`, `description`, `keywords`, `aciklama`, `kapak`, `durum`, `facebook`, `twitter`, `instagram`, `linkedin`, `youtube`, `tarih`, `dil`) VALUES
(1, 0, '1', 'Başkan', 'İzzet Balcı', 'izzet-balci', 'İzzet Balcı', 'İzzet Balcı', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'baskan.png', 1, '', '', '', '', '', '2020-01-27 12:25:10', 1),
(2, 2, '1', 'A Parti', 'Ahmet Yılmaz', 'ahmet-yilmaz', 'Ahmet Yılmaz', 'Ahmet Yılmaz', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'team_12-540x600.jpg', 1, '', '', '', '', '', '2020-01-27 12:19:37', 1),
(3, 4, '1', 'B Parti', 'Erdal Zemin', 'erdal-zemin', 'Erdal Zemin', 'Erdal Zemin', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'team_02-540x600.jpg', 1, '', '', '', '', '', '2020-01-27 12:19:59', 1),
(4, 6, '1', 'C Parti', 'Selami Belhan', 'selami-belhan', 'Selami Belhan', 'Selami Belhan', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'team_05-540x600.jpg', 1, '', '', '', '', '', '2020-01-27 12:20:10', 1),
(5, 9, '1', 'A Parti', 'Hülya Banu AK', 'hulya-banu-ak', 'Hülya Banu AK', 'Hülya Banu AK', '<p>Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \'de Finibus Bonorum et Malorum\' (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \'Lorem ipsum dolor sit amet\' 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'team_03-540x600.jpg', 1, '', '', '', '', '', '2020-01-27 12:20:19', 1),
(6, 9, '1', 'B Parti', 'Elif ÖZTÜRK', 'elif-ozturk', 'Elif ÖZTÜRK', 'Elif ÖZTÜRK', '<p>Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \'de Finibus Bonorum et Malorum\' (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \'Lorem ipsum dolor sit amet\' 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'team_04-540x600.jpg', 1, '', '', '', '', '', '2020-01-27 12:20:32', 1),
(7, 7, '1', 'D Parti', 'Filiz KARABAŞ', 'filiz-karabas', 'Filiz KARABAŞ', 'Filiz KARABAŞ', '<p>Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \'de Finibus Bonorum et Malorum\' (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \'Lorem ipsum dolor sit amet\' 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'team_06-540x600.jpg', 1, '', '', '', '', '', '2020-01-27 12:20:46', 1),
(8, 1, '2', 'Başkan', 'İzzet Balcı', 'izzet-balci', 'İzzet Balcı', 'İzzet Balcı', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'baskan_1.png', 1, '', '', '', '', '', '2020-01-27 13:13:15', 1),
(9, 3, '2', 'Mali İşler Md.', 'Soner Dönmez', 'soner-donmez', 'Soner Dönmez', 'Soner Dönmez', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'team_02-540x600_1.jpg', 1, '', '', '', '', '', '2020-01-27 13:13:23', 1),
(10, 5, '2', 'Çevre Koruma ve Kontrol Md.', 'Faruk Erol', 'faruk-erol', 'Faruk Erol', 'Faruk Erol', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'team_05-540x600_1.jpg', 1, '', '', '', '', '', '2020-01-27 13:13:30', 1),
(11, 8, '2', 'Emlak Servis Şefi', 'Ali Nejat Kuru', 'ali-nejat-kuru', 'Ali Nejat Kuru', 'Ali Nejat Kuru', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'team_12-540x600_1.jpg', 1, '', '', '', '', '', '2020-01-27 13:13:37', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `profil_kategori`
--

CREATE TABLE `profil_kategori` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `keywords` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `description` text COLLATE utf8_turkish_ci,
  `kapak` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `profil_kategori`
--

INSERT INTO `profil_kategori` (`id`, `sira`, `adi`, `seo`, `keywords`, `description`, `kapak`, `durum`, `tarih`, `dil`) VALUES
(1, 0, 'Meclis Üyeleri', 'meclis-uyeleri', 'Meclis Üyeleri', 'Meclis Üyeleri', NULL, 1, '2020-01-25 15:24:58', 1),
(2, 1, 'Belediye Personeli', 'belediye-personeli', 'Belediye Personeli', 'Belediye Personeli', NULL, 1, '2020-01-25 15:25:08', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `projeler`
--

CREATE TABLE `projeler` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `kategori` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `description` text COLLATE utf8_turkish_ci,
  `keywords` text COLLATE utf8_turkish_ci,
  `aciklama` longtext COLLATE utf8_turkish_ci,
  `videoid` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `spot` text COLLATE utf8_turkish_ci,
  `kapak` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '0',
  `anasayfa` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `tarihg` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `projeler`
--

INSERT INTO `projeler` (`id`, `sira`, `kategori`, `adi`, `seo`, `description`, `keywords`, `aciklama`, `videoid`, `spot`, `kapak`, `durum`, `anasayfa`, `tarih`, `tarihg`, `dil`) VALUES
(16, 0, '2', 'Bilim Ve Teknoloji Merkezi Projesi', 'bilim-ve-teknoloji-merkezi-projesi', 'Bilim Ve Teknoloji Merkezi Projesi', 'Bilim Ve Teknoloji Merkezi Projesi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '80yhhveEQko', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', '15847_untitled_panorama1_20140125174545.jpg', 1, 1, '29-01-2020 12:37', '29-01-2020 12:37', 1),
(15, 1, '2', 'İstiklal Caddesi', 'istiklal-caddesi', 'İstiklal Caddesi', 'İstiklal Caddesi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', '18e41.png', 1, 1, '29-01-2020 12:46', '29-01-2020 12:46', 1),
(14, 2, '1', 'Katı Atık Yönetimi Projesi Gaz Yönetimi', 'kati-atik-yonetimi-projesi-gaz-yonetimi', 'Katı Atık Yönetimi Projesi Gaz Yönetimi', 'Katı Atık Yönetimi Projesi Gaz Yönetimi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'aktarma.jpg', 1, 1, '29-01-2020 12:47', '29-01-2020 12:47', 1),
(13, 3, '1', 'Açık Ve Kapalı Otopark Alan Yapımı', 'acik-ve-kapali-otopark-alan-yapimi', 'Açık Ve Kapalı Otopark Alan Yapımı', 'Açık Ve Kapalı Otopark Alan Yapımı', '<p>Halkımızın alım g&uuml;c&uuml;n&uuml;n artması ve refah seviyesinin y&uuml;kselmesi ile birlikte otopark sorunu şehrimizin en b&uuml;y&uuml;k problemlerinden biri olmuştur.</p>\r\n<p><br />Bu y&uuml;zden yoğun taşıt ve yaya trafiği olan yerleşim b&ouml;lgelerinde a&ccedil;ık ve kapalı otoparkların yapımı zorunlu bir g&ouml;rev haline gelmiştir. Bunun i&ccedil;in oyun bah&ccedil;eleri dahi olmayan ve ekonomik &Ouml;m&uuml;rlerini tamamlamış eski okulların yıkılarak bir kısmının yeniden bir kısmının ise eğitim kampus&uuml; projesi kapsamında başka yerlere taşınarak yeniden yapılması ve bu eski okulların yerlerine ise katlı otoparklar yapılması planlanmıştır. Ayrıca takas yoluyla bazı imar adaları boşaltılarak katlı otoparklar yapılacaktır.</p>', '', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', 'Otopark-yapimi-asfaltlama.png', 1, 1, '29-01-2020 12:47', '29-01-2020 12:47', 1),
(12, 4, '1', 'Cumhuriyet Meydanı Düzenlemesi', 'cumhuriyet-meydani-duzenlemesi', 'Cumhuriyet Meydanı Düzenlemesi', 'Cumhuriyet Meydanı Düzenlemesi', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', '', 'Yaygın inancın tersine, Lorem Ipsum rastgele sözcüklerden oluşmaz. Kökleri M.Ö. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir geçmişi vardır.', '4f8bf.png', 1, 1, '29-01-2020 12:47', '29-01-2020 12:47', 1),
(18, 5, '2', 'Şehrimize Yakışır Kent Meydanı', 'sehrimize-yakisir-kent-meydani', 'Şehrimize Yakışır Kent Meydanı', 'Şehrimize Yakışır Kent Meydanı', '<p>Şehrimize Yakışır Kent MeydanıBu kısma projeniz ile ilgili a&ccedil;ıklama yer alacaktır.Bu a&ccedil;ıklamaları dilerseniz y&ouml;netim paanelinden kendiniz değiştirebilmektesiniz.</p>', '', 'Şehrimize Yakışır Kent MeydanıBu kısma projeniz ile ilgili açıklama yer alacaktır.Bu açıklamaları dilerseniz yönetim paanelinden kendiniz değiştirebilmektesiniz.', 'sehrimize-yakisir-kent-meydani.jpg', 1, 1, '06-02-2020 17:53', '06-02-2020 17:53', 1),
(19, 6, '3', 'Belediyemize Yakışır Köprü Projesi', 'belediyemize-yakisir-kopru-projesi', 'Belediyemize Yakışır Köprü Projesi', 'Belediyemize Yakışır Köprü Projesi', '<p>Belediyemize Yakışır K&ouml;pr&uuml; ProjesiX mahallemizi Y mahallemize bağlayan yeni Belediye hizmet binamız &ouml;n&uuml;nde bulunan, yıllar &ouml;nce kıt imkanlarla yapılmış yaya k&ouml;pr&uuml;m&uuml;z hem beldemize yakışmıyor hem de burayı kullanan vatandaşlarımız i&ccedil;in tehlike arz ediyordu. Yaptığımız &ccedil;alışmalarla eski yaya k&ouml;pr&uuml;m&uuml;z&uuml; yıkıp yerine Belediyemize&nbsp;yakışır otuz beş metre uzunluğunda beş metre genişliğindeki&nbsp;k&ouml;pr&uuml;y&uuml; yakında hizmete a&ccedil;acağız.</p>', '', 'Belediyemize Yakışır Köprü ProjesiX mahallemizi Y mahallemize bağlayan yeni Belediye hizmet binamız önünde bulunan, yıllar önce kıt imkanlarla yapılmış yaya köprümüz hem beldemize yakışmıyor hem de burayı kullanan vatandaşlarımız için tehlike arz ediyordu.', '1200px-Dallas_-_Municipal_Building_01A.jpg', 1, 1, '06-02-2020 17:56', '06-02-2020 17:58', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `projeresim`
--

CREATE TABLE `projeresim` (
  `id` int(11) NOT NULL,
  `pid` int(11) DEFAULT '0',
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `projeresim`
--

INSERT INTO `projeresim` (`id`, `pid`, `resim`) VALUES
(69, 12, '4a045.png'),
(70, 12, 'ba47c.png'),
(71, 13, 'acik_otopark.jpg'),
(72, 13, 'depositphotos_143337935-stock-photo-outdoor-car-parking.jpg'),
(73, 14, 'BAYKAN_YAHYN_10.jpg'),
(74, 14, 'samsunlu-ogrenciler-yesil-enerjinin-izinde4eb6efc7b135d1d1b747.jpg'),
(75, 15, '16cb6.png'),
(76, 15, '45ac5.png'),
(77, 15, '66540.png'),
(78, 15, '89521.png'),
(79, 15, 'be88e.png'),
(80, 16, '20161016_155019_hdr.jpg'),
(81, 18, '16122014_meydan_3.jpg'),
(82, 18, 'sehrimize-yakisir-kent-meydani.jpg'),
(83, 19, '1200px-Dallas_-_Municipal_Building_01A.jpg'),
(84, 19, 'belediyemize-yakisir-kopru-projesi.jpg');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `proje_kategori`
--

CREATE TABLE `proje_kategori` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `keywords` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `description` text COLLATE utf8_turkish_ci,
  `kapak` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `proje_kategori`
--

INSERT INTO `proje_kategori` (`id`, `sira`, `adi`, `seo`, `keywords`, `description`, `kapak`, `durum`, `tarih`, `dil`) VALUES
(1, 2, 'DEVAM EDEN PROJELER', 'devam-eden-projeler', 'Devam Eden Projeler', 'Devam Eden Projeler', 'WP_027R-_nilufer-650x366.jpg', 1, '2020-01-29 17:33:32', 1),
(2, 0, 'TAMAMLANAN PROJELER', 'tamamlanan-projeler', 'Tamamlanan Projeler', 'Tamamlanan Projeler', 'Nurol-Life-Projesi-Fotograf-1-1-570x379_c.jpg', 1, '2020-01-29 17:32:03', 1),
(3, 1, 'PLANLANAN PROJELER', 'planlanan-projeler', 'Planlanan Projeler', 'Planlanan Projeler', 'OSMANYYE_KORKUT_ATA_UNYVERSYTESY_YYBF_14.jpg', 1, '2020-01-29 17:32:43', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `rehber`
--

CREATE TABLE `rehber` (
  `id` int(11) NOT NULL,
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `telefon` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `notunuz` longtext COLLATE utf8_turkish_ci,
  `durum` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `rehber`
--

INSERT INTO `rehber` (`id`, `adi`, `email`, `telefon`, `notunuz`, `durum`, `tarih`) VALUES
(1, 'Alican SERÇE', 'alican@demo.com', '05370000000', '<p>Site demosu i&ccedil;in eklenmiştir.</p>', 1, '2019-09-19 12:57:04');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `sabit_url`
--

CREATE TABLE `sabit_url` (
  `id` int(11) NOT NULL,
  `anaurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `haberkategoriurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `haberurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `haberdetayurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `iletisimurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `hizmeturl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `hizmetdetayurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `birimurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `birimdetayurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `sayfaurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `projekategoriurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `projelerurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `projedetayurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `fotourl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `fotodetayurl` varchar(250) COLLATE utf8_turkish_ci DEFAULT NULL,
  `videourl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `videodetayurl` varchar(250) COLLATE utf8_turkish_ci DEFAULT NULL,
  `etkinlikurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `etkinlikdetayurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `duyuruurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `duyurudetayurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `kararurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `karardetayurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `profilkategoriurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `profillerurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `profildetayurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `ihaleurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `ihaledetayurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `ilanurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `ilandetayurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `faaliyeturl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `faaliyetdetayurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `bagisurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `bagissepeturl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `bagisodemeurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `bagissonucurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aidaturl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aidatlisteurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aidatodemeurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aidatsonucurl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '0'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `sabit_url`
--

INSERT INTO `sabit_url` (`id`, `anaurl`, `haberkategoriurl`, `haberurl`, `haberdetayurl`, `iletisimurl`, `hizmeturl`, `hizmetdetayurl`, `birimurl`, `birimdetayurl`, `sayfaurl`, `projekategoriurl`, `projelerurl`, `projedetayurl`, `fotourl`, `fotodetayurl`, `videourl`, `videodetayurl`, `etkinlikurl`, `etkinlikdetayurl`, `duyuruurl`, `duyurudetayurl`, `kararurl`, `karardetayurl`, `profilkategoriurl`, `profillerurl`, `profildetayurl`, `ihaleurl`, `ihaledetayurl`, `ilanurl`, `ilandetayurl`, `faaliyeturl`, `faaliyetdetayurl`, `bagisurl`, `bagissepeturl`, `bagisodemeurl`, `bagissonucurl`, `aidaturl`, `aidatlisteurl`, `aidatodemeurl`, `aidatsonucurl`, `durum`) VALUES
(1, 'anasayfa', 'haber-kategori', 'haberler', 'haber', 'iletisim', 'hizmetler', 'hizmet', 'birimler', 'birim', 'icerik', 'proje-kategori', 'projeler', 'proje', 'foto-galeri', 'foto', 'video-galeri', 'video', 'etkinlikler', 'etkinlik', 'duyurular', 'duyuru', 'meclis-kararlari', 'karar', 'profil-kategori', 'profiller', 'profil', 'ihaleler', 'ihale', 'ilanlar', 'ilan', 'faaliyet-raporlari', 'rapor', 'bagis', 'bagis-sepet', 'bagis-odeme', 'bagis-sonuc', 'aidat-sorgulama', 'aidat-listesi', 'aidat-odeme', 'aidat-sonuc', 0);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `sayfalar`
--

CREATE TABLE `sayfalar` (
  `id` int(11) NOT NULL,
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` text COLLATE utf8_turkish_ci,
  `keywords` text COLLATE utf8_turkish_ci,
  `description` text COLLATE utf8_turkish_ci,
  `durum` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `sayfalar`
--

INSERT INTO `sayfalar` (`id`, `adi`, `seo`, `resim`, `aciklama`, `keywords`, `description`, `durum`, `tarih`, `dil`) VALUES
(1, 'Tarihçe', 'tarihce', '1472191235.jpg', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>\r\n<p>Yinelenen bir sayfa i&ccedil;eriğinin okuyucunun dikkatini dağıttığı bilinen bir ger&ccedil;ektir. Lorem Ipsum kullanmanın amacı, s&uuml;rekli \'buraya metin gelecek, buraya metin gelecek\' yazmaya kıyasla daha dengeli bir harf dağılımı sağlayarak okunurluğu artırmasıdır. Şu anda bir&ccedil;ok masa&uuml;st&uuml; yayıncılık paketi ve web sayfa d&uuml;zenleyicisi, varsayılan mıgır metinler olarak Lorem Ipsum kullanmaktadır. Ayrıca arama motorlarında \'lorem ipsum\' anahtar s&ouml;zc&uuml;kleri ile arama yapıldığında hen&uuml;z tasarım aşamasında olan &ccedil;ok sayıda site listelenir. Yıllar i&ccedil;inde, bazen kazara, bazen bilin&ccedil;li olarak (&ouml;rneğin mizah katılarak), &ccedil;eşitli s&uuml;r&uuml;mleri geliştirilmiştir.</p>\r\n<p>Lorem Ipsum pasajlarının bir&ccedil;ok &ccedil;eşitlemesi vardır. Ancak bunların b&uuml;y&uuml;k bir &ccedil;oğunluğu mizah katılarak veya rastgele s&ouml;zc&uuml;kler eklenerek değiştirilmişlerdir. Eğer bir Lorem Ipsum pasajı kullanacaksanız, metin aralarına utandırıcı s&ouml;zc&uuml;kler gizlenmediğinden emin olmanız gerekir. İnternet\'teki t&uuml;m Lorem Ipsum &uuml;rete&ccedil;leri &ouml;nceden belirlenmiş metin bloklarını yineler. Bu da, bu &uuml;reteci İnternet &uuml;zerindeki ger&ccedil;ek Lorem Ipsum &uuml;reteci yapar. Bu &uuml;rete&ccedil;, 200\'den fazla Latince s&ouml;zc&uuml;k ve onlara ait c&uuml;mle yapılarını i&ccedil;eren bir s&ouml;zl&uuml;k kullanır. Bu nedenle, &uuml;retilen Lorem Ipsum metinleri yinelemelerden, mizahtan ve karakteristik olmayan s&ouml;zc&uuml;klerden uzaktır.</p>', 'Tarihçe', 'Tarihçe', 1, '2020-01-22 14:21:10', 1),
(2, 'El Sanatları', 'el-sanatlari', '6.jpg', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>\r\n<p>Yinelenen bir sayfa i&ccedil;eriğinin okuyucunun dikkatini dağıttığı bilinen bir ger&ccedil;ektir. Lorem Ipsum kullanmanın amacı, s&uuml;rekli \'buraya metin gelecek, buraya metin gelecek\' yazmaya kıyasla daha dengeli bir harf dağılımı sağlayarak okunurluğu artırmasıdır. Şu anda bir&ccedil;ok masa&uuml;st&uuml; yayıncılık paketi ve web sayfa d&uuml;zenleyicisi, varsayılan mıgır metinler olarak Lorem Ipsum kullanmaktadır. Ayrıca arama motorlarında \'lorem ipsum\' anahtar s&ouml;zc&uuml;kleri ile arama yapıldığında hen&uuml;z tasarım aşamasında olan &ccedil;ok sayıda site listelenir. Yıllar i&ccedil;inde, bazen kazara, bazen bilin&ccedil;li olarak (&ouml;rneğin mizah katılarak), &ccedil;eşitli s&uuml;r&uuml;mleri geliştirilmiştir.</p>\r\n<p>Lorem Ipsum pasajlarının bir&ccedil;ok &ccedil;eşitlemesi vardır. Ancak bunların b&uuml;y&uuml;k bir &ccedil;oğunluğu mizah katılarak veya rastgele s&ouml;zc&uuml;kler eklenerek değiştirilmişlerdir. Eğer bir Lorem Ipsum pasajı kullanacaksanız, metin aralarına utandırıcı s&ouml;zc&uuml;kler gizlenmediğinden emin olmanız gerekir. İnternet\'teki t&uuml;m Lorem Ipsum &uuml;rete&ccedil;leri &ouml;nceden belirlenmiş metin bloklarını yineler. Bu da, bu &uuml;reteci İnternet &uuml;zerindeki ger&ccedil;ek Lorem Ipsum &uuml;reteci yapar. Bu &uuml;rete&ccedil;, 200\'den fazla Latince s&ouml;zc&uuml;k ve onlara ait c&uuml;mle yapılarını i&ccedil;eren bir s&ouml;zl&uuml;k kullanır. Bu nedenle, &uuml;retilen Lorem Ipsum metinleri yinelemelerden, mizahtan ve karakteristik olmayan s&ouml;zc&uuml;klerden uzaktır.</p>', 'El Sanatları', 'El Sanatları', 1, '2020-01-22 14:22:41', 1),
(3, 'Av Turizmi', 'av-turizmi', 'av_turizmi_16302_3766391.jpg', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>\r\n<p>Yinelenen bir sayfa i&ccedil;eriğinin okuyucunun dikkatini dağıttığı bilinen bir ger&ccedil;ektir. Lorem Ipsum kullanmanın amacı, s&uuml;rekli \'buraya metin gelecek, buraya metin gelecek\' yazmaya kıyasla daha dengeli bir harf dağılımı sağlayarak okunurluğu artırmasıdır. Şu anda bir&ccedil;ok masa&uuml;st&uuml; yayıncılık paketi ve web sayfa d&uuml;zenleyicisi, varsayılan mıgır metinler olarak Lorem Ipsum kullanmaktadır. Ayrıca arama motorlarında \'lorem ipsum\' anahtar s&ouml;zc&uuml;kleri ile arama yapıldığında hen&uuml;z tasarım aşamasında olan &ccedil;ok sayıda site listelenir. Yıllar i&ccedil;inde, bazen kazara, bazen bilin&ccedil;li olarak (&ouml;rneğin mizah katılarak), &ccedil;eşitli s&uuml;r&uuml;mleri geliştirilmiştir.</p>\r\n<p>Lorem Ipsum pasajlarının bir&ccedil;ok &ccedil;eşitlemesi vardır. Ancak bunların b&uuml;y&uuml;k bir &ccedil;oğunluğu mizah katılarak veya rastgele s&ouml;zc&uuml;kler eklenerek değiştirilmişlerdir. Eğer bir Lorem Ipsum pasajı kullanacaksanız, metin aralarına utandırıcı s&ouml;zc&uuml;kler gizlenmediğinden emin olmanız gerekir. İnternet\'teki t&uuml;m Lorem Ipsum &uuml;rete&ccedil;leri &ouml;nceden belirlenmiş metin bloklarını yineler. Bu da, bu &uuml;reteci İnternet &uuml;zerindeki ger&ccedil;ek Lorem Ipsum &uuml;reteci yapar. Bu &uuml;rete&ccedil;, 200\'den fazla Latince s&ouml;zc&uuml;k ve onlara ait c&uuml;mle yapılarını i&ccedil;eren bir s&ouml;zl&uuml;k kullanır. Bu nedenle, &uuml;retilen Lorem Ipsum metinleri yinelemelerden, mizahtan ve karakteristik olmayan s&ouml;zc&uuml;klerden uzaktır.</p>', 'Av Turizmi', 'Av Turizmi', 1, '2020-01-22 14:24:08', 1),
(4, 'Kültürel Zenginlik', 'kulturel-zenginlik', 'malatya-haber-1995575355.png', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>\r\n<p>Yinelenen bir sayfa i&ccedil;eriğinin okuyucunun dikkatini dağıttığı bilinen bir ger&ccedil;ektir. Lorem Ipsum kullanmanın amacı, s&uuml;rekli \'buraya metin gelecek, buraya metin gelecek\' yazmaya kıyasla daha dengeli bir harf dağılımı sağlayarak okunurluğu artırmasıdır. Şu anda bir&ccedil;ok masa&uuml;st&uuml; yayıncılık paketi ve web sayfa d&uuml;zenleyicisi, varsayılan mıgır metinler olarak Lorem Ipsum kullanmaktadır. Ayrıca arama motorlarında \'lorem ipsum\' anahtar s&ouml;zc&uuml;kleri ile arama yapıldığında hen&uuml;z tasarım aşamasında olan &ccedil;ok sayıda site listelenir. Yıllar i&ccedil;inde, bazen kazara, bazen bilin&ccedil;li olarak (&ouml;rneğin mizah katılarak), &ccedil;eşitli s&uuml;r&uuml;mleri geliştirilmiştir.</p>\r\n<p>Lorem Ipsum pasajlarının bir&ccedil;ok &ccedil;eşitlemesi vardır. Ancak bunların b&uuml;y&uuml;k bir &ccedil;oğunluğu mizah katılarak veya rastgele s&ouml;zc&uuml;kler eklenerek değiştirilmişlerdir. Eğer bir Lorem Ipsum pasajı kullanacaksanız, metin aralarına utandırıcı s&ouml;zc&uuml;kler gizlenmediğinden emin olmanız gerekir. İnternet\'teki t&uuml;m Lorem Ipsum &uuml;rete&ccedil;leri &ouml;nceden belirlenmiş metin bloklarını yineler. Bu da, bu &uuml;reteci İnternet &uuml;zerindeki ger&ccedil;ek Lorem Ipsum &uuml;reteci yapar. Bu &uuml;rete&ccedil;, 200\'den fazla Latince s&ouml;zc&uuml;k ve onlara ait c&uuml;mle yapılarını i&ccedil;eren bir s&ouml;zl&uuml;k kullanır. Bu nedenle, &uuml;retilen Lorem Ipsum metinleri yinelemelerden, mizahtan ve karakteristik olmayan s&ouml;zc&uuml;klerden uzaktır.</p>', 'Kültürel Zenginlik', 'Kültürel Zenginlik', 1, '2020-01-22 14:26:41', 1),
(5, 'Kentsel Doku', 'kentsel-doku', '130620131223069282806.jpg', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>\r\n<p>Yinelenen bir sayfa i&ccedil;eriğinin okuyucunun dikkatini dağıttığı bilinen bir ger&ccedil;ektir. Lorem Ipsum kullanmanın amacı, s&uuml;rekli \'buraya metin gelecek, buraya metin gelecek\' yazmaya kıyasla daha dengeli bir harf dağılımı sağlayarak okunurluğu artırmasıdır. Şu anda bir&ccedil;ok masa&uuml;st&uuml; yayıncılık paketi ve web sayfa d&uuml;zenleyicisi, varsayılan mıgır metinler olarak Lorem Ipsum kullanmaktadır. Ayrıca arama motorlarında \'lorem ipsum\' anahtar s&ouml;zc&uuml;kleri ile arama yapıldığında hen&uuml;z tasarım aşamasında olan &ccedil;ok sayıda site listelenir. Yıllar i&ccedil;inde, bazen kazara, bazen bilin&ccedil;li olarak (&ouml;rneğin mizah katılarak), &ccedil;eşitli s&uuml;r&uuml;mleri geliştirilmiştir.</p>\r\n<p>Lorem Ipsum pasajlarının bir&ccedil;ok &ccedil;eşitlemesi vardır. Ancak bunların b&uuml;y&uuml;k bir &ccedil;oğunluğu mizah katılarak veya rastgele s&ouml;zc&uuml;kler eklenerek değiştirilmişlerdir. Eğer bir Lorem Ipsum pasajı kullanacaksanız, metin aralarına utandırıcı s&ouml;zc&uuml;kler gizlenmediğinden emin olmanız gerekir. İnternet\'teki t&uuml;m Lorem Ipsum &uuml;rete&ccedil;leri &ouml;nceden belirlenmiş metin bloklarını yineler. Bu da, bu &uuml;reteci İnternet &uuml;zerindeki ger&ccedil;ek Lorem Ipsum &uuml;reteci yapar. Bu &uuml;rete&ccedil;, 200\'den fazla Latince s&ouml;zc&uuml;k ve onlara ait c&uuml;mle yapılarını i&ccedil;eren bir s&ouml;zl&uuml;k kullanır. Bu nedenle, &uuml;retilen Lorem Ipsum metinleri yinelemelerden, mizahtan ve karakteristik olmayan s&ouml;zc&uuml;klerden uzaktır.</p>', 'Kentsel Doku', 'Kentsel Doku', 1, '2020-01-22 14:29:03', 1),
(6, 'Doğal Güzellikler', 'dogal-guzellikler', 'sadagi-4.jpg', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>\r\n<p>Yinelenen bir sayfa i&ccedil;eriğinin okuyucunun dikkatini dağıttığı bilinen bir ger&ccedil;ektir. Lorem Ipsum kullanmanın amacı, s&uuml;rekli \'buraya metin gelecek, buraya metin gelecek\' yazmaya kıyasla daha dengeli bir harf dağılımı sağlayarak okunurluğu artırmasıdır. Şu anda bir&ccedil;ok masa&uuml;st&uuml; yayıncılık paketi ve web sayfa d&uuml;zenleyicisi, varsayılan mıgır metinler olarak Lorem Ipsum kullanmaktadır. Ayrıca arama motorlarında \'lorem ipsum\' anahtar s&ouml;zc&uuml;kleri ile arama yapıldığında hen&uuml;z tasarım aşamasında olan &ccedil;ok sayıda site listelenir. Yıllar i&ccedil;inde, bazen kazara, bazen bilin&ccedil;li olarak (&ouml;rneğin mizah katılarak), &ccedil;eşitli s&uuml;r&uuml;mleri geliştirilmiştir.</p>\r\n<p>Lorem Ipsum pasajlarının bir&ccedil;ok &ccedil;eşitlemesi vardır. Ancak bunların b&uuml;y&uuml;k bir &ccedil;oğunluğu mizah katılarak veya rastgele s&ouml;zc&uuml;kler eklenerek değiştirilmişlerdir. Eğer bir Lorem Ipsum pasajı kullanacaksanız, metin aralarına utandırıcı s&ouml;zc&uuml;kler gizlenmediğinden emin olmanız gerekir. İnternet\'teki t&uuml;m Lorem Ipsum &uuml;rete&ccedil;leri &ouml;nceden belirlenmiş metin bloklarını yineler. Bu da, bu &uuml;reteci İnternet &uuml;zerindeki ger&ccedil;ek Lorem Ipsum &uuml;reteci yapar. Bu &uuml;rete&ccedil;, 200\'den fazla Latince s&ouml;zc&uuml;k ve onlara ait c&uuml;mle yapılarını i&ccedil;eren bir s&ouml;zl&uuml;k kullanır. Bu nedenle, &uuml;retilen Lorem Ipsum metinleri yinelemelerden, mizahtan ve karakteristik olmayan s&ouml;zc&uuml;klerden uzaktır.</p>', 'Doğal Güzellikler', 'Doğal Güzellikler', 1, '2020-01-22 14:29:56', 1),
(7, 'Başkan Özgeçmiş', 'baskan-ozgecmis', '1.png', '<p>1968 yılında Sizin şehirde&nbsp;doğdu.İlkokul tahsilini Sizin il&ccedil;e&nbsp;K&ouml;y&uuml; İlk Okulunda, Orta &Ouml;ğretimi Sizin Kent&nbsp;&nbsp;Lisesi`nde, Lise tahsilini ise Sizin Şehir&nbsp;Lisesi`nde tamamladı. Anadolu &Uuml;niversitesi Sosyal Bilimler ve Halkla İlişkiler B&ouml;l&uuml;m&uuml;n&uuml; bitirerek &uuml;niversiteden mezun oldu.</p>\r\n<p>Bir m&uuml;ddet devlet memurluğu g&ouml;revinde bulunduktan sonra, 1998 yılında aktif olarak X&nbsp;Partisi nde siyasete başladı. X Partisi&rsquo;nde İl&ccedil;e Başkan Yardımcılığı, Y Partisi&rsquo;nde İl&ccedil;e Başkan Yardımcılığı, Z Partisi&rsquo;nde İl ve İl&ccedil;e Başkan Yardımcılığı g&ouml;revlerinde bulundu.</p>\r\n<p>2004 yılında yapılan mahalli idareler se&ccedil;imlerinde başkan se&ccedil;ildi. Başkanlık&nbsp;g&ouml;revi s&uuml;resi i&ccedil;erisinde 2004 ve 2009 yıllarında Şehir`de, &ldquo;Faal Muhtarlar Derneği`ni&rdquo; kurduktan sonra burada 5 yıl Başkanlık yaptı.Bu d&ouml;nem i&ccedil;erisinde &ldquo;K&ouml;ylere Hizmet G&ouml;t&uuml;rme Birliği&rdquo; Başkan vekilliği ve Enc&uuml;menlik g&ouml;revlerini y&uuml;r&uuml;tt&uuml;. 2009 yılında yapılan Mahalli se&ccedil;imlerde Sizin Beldesi`ne Belediye Başkanı se&ccedil;ildi. 5 yıl bu g&ouml;revi y&uuml;r&uuml;tt&uuml;kten sonra 2014 Mahalli idareler se&ccedil;imlerinde Sizin Belediye Başkanlığına aday oldu ve tekrar Belediye Başkanı olarak se&ccedil;ildi.</p>\r\n<p>Halen &nbsp;Belediye Başkanı olarak g&ouml;revini s&uuml;rd&uuml;rmektedir. Adınız SOYADINIZ&nbsp;Evli, 1&nbsp;kız ve 1 erkek evlat Babası dır.</p>', 'Başkan Özgeçmiş', 'Başkan Özgeçmiş', 1, '2020-02-06 12:12:47', 1),
(8, 'Başkan Görev ve Yetkileri', 'baskan-gorev-ve-yetkileri', '', '<p>Yaygın inancın tersine, Lorem Ipsum rastgele s&ouml;zc&uuml;klerden oluşmaz. K&ouml;kleri M.&Ouml;. 45 tarihinden bu yana klasik Latin edebiyatına kadar uzanan 2000 yıllık bir ge&ccedil;mişi vardır. Virginia\'daki Hampden-Sydney College\'dan Latince profes&ouml;r&uuml; Richard McClintock, bir Lorem Ipsum pasajında ge&ccedil;en ve anlaşılması en g&uuml;&ccedil; s&ouml;zc&uuml;klerden biri olan \'consectetur\' s&ouml;zc&uuml;ğ&uuml;n&uuml;n klasik edebiyattaki &ouml;rneklerini incelediğinde kesin bir kaynağa ulaşmıştır. Lorm Ipsum, &Ccedil;i&ccedil;ero tarafından M.&Ouml;. 45 tarihinde kaleme alınan \"de Finibus Bonorum et Malorum\" (İyi ve K&ouml;t&uuml;n&uuml;n U&ccedil; Sınırları) eserinin 1.10.32 ve 1.10.33 sayılı b&ouml;l&uuml;mlerinden gelmektedir. Bu kitap, ahlak kuramı &uuml;zerine bir tezdir ve R&ouml;nesans d&ouml;neminde &ccedil;ok pop&uuml;ler olmuştur. Lorem Ipsum pasajının ilk satırı olan \"Lorem ipsum dolor sit amet\" 1.10.32 sayılı b&ouml;l&uuml;mdeki bir satırdan gelmektedir.</p>\r\n<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Başkan Görev ve Yetkileri', 'Başkan Görev ve Yetkileri', 1, '2020-02-06 17:25:30', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `slider`
--

CREATE TABLE `slider` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `url` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `sekme` int(11) DEFAULT '0',
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` text COLLATE utf8_turkish_ci,
  `durum` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `slider`
--

INSERT INTO `slider` (`id`, `sira`, `adi`, `url`, `sekme`, `resim`, `aciklama`, `durum`, `tarih`, `dil`) VALUES
(23, 0, 'Tarih, Doğa ve Kültür Kenti', 'icerik/dogal-guzellikler', 0, 'corum-belediye_21.jpg', 'DERNEK BELEDİYE V7', 1, '2020-02-06 17:20:56', 1),
(24, 1, 'Çevreye Saygılı Şehir', '', 0, '5.jpg', 'DERNEK BELEDİYE V7', 1, '2020-02-06 17:22:02', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `slidermenu`
--

CREATE TABLE `slidermenu` (
  `id` int(11) NOT NULL,
  `menu_ust` int(11) DEFAULT '0',
  `menu_isim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `menu_icon` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `menu_renk` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `menu_kisa` text COLLATE utf8_turkish_ci,
  `menu_url` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `link` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `sekme` int(11) DEFAULT '0',
  `menu_sira` int(2) DEFAULT '0',
  `menu_durum` int(1) DEFAULT '0',
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `slidermenu`
--

INSERT INTO `slidermenu` (`id`, `menu_ust`, `menu_isim`, `menu_icon`, `menu_renk`, `menu_kisa`, `menu_url`, `link`, `sekme`, `menu_sira`, `menu_durum`, `dil`) VALUES
(1, 0, 'VİDEO GALERİ', 'fas fa-video', '#83bfd3', 'Dernek & Belediye V7 Yazılımı', 'video-galeri', ' ', 0, 1, 1, 1),
(2, 0, 'ETKİNLİKLER', 'far fa-calendar-alt', '#e9bb71', 'Dernek & Belediye V7 Yazılımı', 'etkinlikler', ' ', 0, 2, 1, 1),
(3, 0, 'GÜNCEL DUYURULAR', 'far fa-bullhorn', '#da8472', 'Temek Meslek Edindirme Kursları', 'duyurular', ' ', 0, 3, 1, 1),
(4, 0, 'GÜNCEL İHALELER', 'far fa-book', '#bfa0c4', 'T.C. Sağlık Bakanlığı Yüzme Suyu Takip Sistemi', 'ihaleler', ' ', 0, 4, 1, 1),
(5, 0, 'GÜNCEL İLANLAR', 'far fa-bell', '#92cbdc', 'Tekirdağ Büyükşehir Belediyesi Kent Rehberi', 'ilanlar', ' ', 0, 5, 1, 1),
(6, 0, 'FOTO GALERİ', 'fas fa-images', '#5d90c7', 'Dernek & Belediye V7 Yazılımı', 'foto-galeri', ' ', 0, 6, 1, 1),
(7, 0, 'TAMAMLANAN PROJELER', 'fas fa-tasks', '#9883a9', 'Tamamlanan Projeleri İnceleyin', 'proje-kategori/tamamlanan-projeler', ' ', 0, 7, 1, 1),
(8, 0, 'DEVAM EDEN PROJELER', 'fas fa-tasks', '#dfc2b7', 'Devam Eden Projeleri İnceleyin', 'proje-kategori/devam-eden-projeler', ' ', 0, 8, 1, 1),
(9, 0, 'GENEL HABERLER', 'far fa-newspaper', '#c2adcd', 'Genel Haberleri İnceleyin', 'haber-kategori/genel-haberler', ' ', 0, 9, 1, 1),
(10, 0, 'BAĞIŞ YAP', 'fas fa-hand-holding-usd', '#b0c7cf', 'Bağışlarınız ile gençlerin eğitimine umut olabilirsiniz.', 'bagis', ' ', 0, 10, 1, 1),
(11, 0, 'AİDAT SORGULAMA', 'fas fa-credit-card-front', '#7a92c6', 'Online kredi kartı ile ödeme yapabilrisiniz.', 'aidat-sorgulama', ' ', 0, 11, 1, 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `sms`
--

CREATE TABLE `sms` (
  `id` int(11) NOT NULL,
  `postUrl` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `KULLANICIADI` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `SIFRE` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `ORGINATOR` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `m_kime` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `sms`
--

INSERT INTO `sms` (`id`, `postUrl`, `KULLANICIADI`, `SIFRE`, `ORGINATOR`, `m_kime`) VALUES
(1, 'http://sms.bizimsms.mobi:8080/api/smspost/v1', 'kullanıcıadı', 'Api Secret key', 'DEMO', '0000000000');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `topmenu`
--

CREATE TABLE `topmenu` (
  `id` int(11) NOT NULL,
  `menu_ust` int(11) DEFAULT '0',
  `menu_isim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `menu_url` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `link` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `sekme` int(11) DEFAULT '0',
  `menu_sira` int(2) DEFAULT '0',
  `menu_durum` int(1) DEFAULT '0',
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `topmenu`
--

INSERT INTO `topmenu` (`id`, `menu_ust`, `menu_isim`, `menu_url`, `link`, `sekme`, `menu_sira`, `menu_durum`, `dil`) VALUES
(1, 0, 'Anasayfa', 'anasayfa', ' ', 0, 1, 1, 1),
(2, 0, 'Duyurular', 'duyurular', ' ', 0, 2, 1, 1),
(3, 0, 'Etkinlikler', 'etkinlikler', ' ', 0, 3, 1, 1),
(4, 0, 'Bağış Yap', 'bagis', ' ', 0, 4, 1, 1),
(5, 0, 'Fotoğraf Galerisi', 'foto-galeri', ' ', 0, 6, 1, 1),
(6, 0, 'İletişim Formu', 'iletisim', ' ', 0, 7, 1, 1),
(7, 0, 'Aidat Borcu Sorgulama', 'aidat-sorgulama', '', 0, 5, 1, 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `video_galeri`
--

CREATE TABLE `video_galeri` (
  `id` int(11) NOT NULL,
  `sira` int(11) DEFAULT '0',
  `adi` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `seo` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `kod` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `resim` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `aciklama` longtext COLLATE utf8_turkish_ci,
  `description` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `keywords` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `durum` int(11) DEFAULT '0',
  `tarih` varchar(255) COLLATE utf8_turkish_ci DEFAULT NULL,
  `dil` int(11) DEFAULT '1'
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `video_galeri`
--

INSERT INTO `video_galeri` (`id`, `sira`, `adi`, `seo`, `kod`, `resim`, `aciklama`, `description`, `keywords`, `durum`, `tarih`, `dil`) VALUES
(3, 0, 'Dernek & Belediye V7 2019 Tanıtım Videosu', 'dernek-belediye-v7-2019-tanitim-videosu', '80yhhveEQko', 'dernek-kapak.jpg', '<p>1500\'lerden beri kullanılmakta olan standard Lorem Ipsum metinleri ilgilenenler i&ccedil;in yeniden &uuml;retilmiştir. &Ccedil;i&ccedil;ero tarafından yazılan 1.10.32 ve 1.10.33 b&ouml;l&uuml;mleri de 1914 H. Rackham &ccedil;evirisinden alınan İngilizce s&uuml;r&uuml;mleri eşliğinde &ouml;zg&uuml;n bi&ccedil;iminden yeniden &uuml;retilmiştir.</p>', 'Dernek & Belediye V7 2019 Tanıtım Videosu', 'Dernek & Belediye V7 2019 Tanıtım Videosu', 1, '2020-02-07 21:35:49', 1),
(4, 0, 'Dernek & Belediye V7 Tanıtım (Türkçe)', 'dernek-belediye-v7-tanitim-turkce', '80yhhveEQko', 'dernek-kapak_1.jpg', '', 'Dernek & Belediye V7 Tanıtım (Türkçe)', 'Dernek & Belediye V7 Tanıtım (Türkçe)', 1, '2020-02-07 21:36:12', 1),
(5, 0, 'Dernek & Belediye V7 Tanıtım (English)', 'dernek-belediye-v7-tanitim-english', 'iExzRqcvhsE', 'dernek-kapak_2.jpg', '', 'Dernek & Belediye V7 Tanıtım (English)', 'Dernek & Belediye V7 Tanıtım (English)', 1, '2020-02-07 21:36:39', 1),
(6, 0, '2019 Fuar Tanıtım', '2019-fuar-tanitim', 'LomiiE28TV0', 'dernek-kapak_3.jpg', '', '2019 Fuar Tanıtım', '2019 Fuar Tanıtım', 1, '2020-01-23 11:52:31', 1),
(7, 0, '2019 Yeni Ürün Tanıtımı', '2019-yeni-urun-tanitimi', 'gz1quf5zuFo', 'dernek-kapak_4.jpg', '', '2019 Yeni Ürün Tanıtımı', '2019 Yeni Ürün Tanıtımı', 1, '2020-01-23 11:52:41', 1);

--
-- Dökümü yapılmış tablolar için indeksler
--

--
-- Tablo için indeksler `aidatlar`
--
ALTER TABLE `aidatlar`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `aidat_odemeler`
--
ALTER TABLE `aidat_odemeler`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `arka_plan`
--
ALTER TABLE `arka_plan`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `ayarlar`
--
ALTER TABLE `ayarlar`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `bagislar`
--
ALTER TABLE `bagislar`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `bagis_kategori`
--
ALTER TABLE `bagis_kategori`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `bagis_odeme`
--
ALTER TABLE `bagis_odeme`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `bakim_modu`
--
ALTER TABLE `bakim_modu`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `baskanmenu`
--
ALTER TABLE `baskanmenu`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `baskan_ayarlar`
--
ALTER TABLE `baskan_ayarlar`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `bildirimler`
--
ALTER TABLE `bildirimler`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `bildirim_sablonu`
--
ALTER TABLE `bildirim_sablonu`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `birimler`
--
ALTER TABLE `birimler`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `diller`
--
ALTER TABLE `diller`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `duyurular`
--
ALTER TABLE `duyurular`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `etkinlikler`
--
ALTER TABLE `etkinlikler`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `faaliyet_raporlari`
--
ALTER TABLE `faaliyet_raporlari`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `footermenu`
--
ALTER TABLE `footermenu`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `fotograflar`
--
ALTER TABLE `fotograflar`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `foto_galeri`
--
ALTER TABLE `foto_galeri`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `haberfoto`
--
ALTER TABLE `haberfoto`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `haberler`
--
ALTER TABLE `haberler`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `haber_kategori`
--
ALTER TABLE `haber_kategori`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `hit`
--
ALTER TABLE `hit`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `hizmetler`
--
ALTER TABLE `hizmetler`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `ihaleler`
--
ALTER TABLE `ihaleler`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `il`
--
ALTER TABLE `il`
  ADD PRIMARY KEY (`ID`);

--
-- Tablo için indeksler `ilanlar`
--
ALTER TABLE `ilanlar`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `ilce`
--
ALTER TABLE `ilce`
  ADD PRIMARY KEY (`ID`);

--
-- Tablo için indeksler `kolaymenu`
--
ALTER TABLE `kolaymenu`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `kullanici`
--
ALTER TABLE `kullanici`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `limit_ayarlari`
--
ALTER TABLE `limit_ayarlari`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `mail_ayar`
--
ALTER TABLE `mail_ayar`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `meclis_kararlari`
--
ALTER TABLE `meclis_kararlari`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `menu`
--
ALTER TABLE `menu`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `mesajlar`
--
ALTER TABLE `mesajlar`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `moduller`
--
ALTER TABLE `moduller`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `not_defteri`
--
ALTER TABLE `not_defteri`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `ortamenu`
--
ALTER TABLE `ortamenu`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `popup_ayarlar`
--
ALTER TABLE `popup_ayarlar`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `profiller`
--
ALTER TABLE `profiller`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `profil_kategori`
--
ALTER TABLE `profil_kategori`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `projeler`
--
ALTER TABLE `projeler`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `projeresim`
--
ALTER TABLE `projeresim`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `proje_kategori`
--
ALTER TABLE `proje_kategori`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `rehber`
--
ALTER TABLE `rehber`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `sabit_url`
--
ALTER TABLE `sabit_url`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `sayfalar`
--
ALTER TABLE `sayfalar`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `slider`
--
ALTER TABLE `slider`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `slidermenu`
--
ALTER TABLE `slidermenu`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `sms`
--
ALTER TABLE `sms`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `topmenu`
--
ALTER TABLE `topmenu`
  ADD PRIMARY KEY (`id`);

--
-- Tablo için indeksler `video_galeri`
--
ALTER TABLE `video_galeri`
  ADD PRIMARY KEY (`id`);

--
-- Dökümü yapılmış tablolar için AUTO_INCREMENT değeri
--

--
-- Tablo için AUTO_INCREMENT değeri `aidatlar`
--
ALTER TABLE `aidatlar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Tablo için AUTO_INCREMENT değeri `aidat_odemeler`
--
ALTER TABLE `aidat_odemeler`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Tablo için AUTO_INCREMENT değeri `arka_plan`
--
ALTER TABLE `arka_plan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `ayarlar`
--
ALTER TABLE `ayarlar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `bagislar`
--
ALTER TABLE `bagislar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- Tablo için AUTO_INCREMENT değeri `bagis_kategori`
--
ALTER TABLE `bagis_kategori`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Tablo için AUTO_INCREMENT değeri `bagis_odeme`
--
ALTER TABLE `bagis_odeme`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Tablo için AUTO_INCREMENT değeri `bakim_modu`
--
ALTER TABLE `bakim_modu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `baskanmenu`
--
ALTER TABLE `baskanmenu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Tablo için AUTO_INCREMENT değeri `baskan_ayarlar`
--
ALTER TABLE `baskan_ayarlar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `bildirimler`
--
ALTER TABLE `bildirimler`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `bildirim_sablonu`
--
ALTER TABLE `bildirim_sablonu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- Tablo için AUTO_INCREMENT değeri `birimler`
--
ALTER TABLE `birimler`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Tablo için AUTO_INCREMENT değeri `diller`
--
ALTER TABLE `diller`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- Tablo için AUTO_INCREMENT değeri `duyurular`
--
ALTER TABLE `duyurular`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Tablo için AUTO_INCREMENT değeri `etkinlikler`
--
ALTER TABLE `etkinlikler`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Tablo için AUTO_INCREMENT değeri `faaliyet_raporlari`
--
ALTER TABLE `faaliyet_raporlari`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Tablo için AUTO_INCREMENT değeri `footermenu`
--
ALTER TABLE `footermenu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- Tablo için AUTO_INCREMENT değeri `fotograflar`
--
ALTER TABLE `fotograflar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=183;

--
-- Tablo için AUTO_INCREMENT değeri `foto_galeri`
--
ALTER TABLE `foto_galeri`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Tablo için AUTO_INCREMENT değeri `haberfoto`
--
ALTER TABLE `haberfoto`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- Tablo için AUTO_INCREMENT değeri `haberler`
--
ALTER TABLE `haberler`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- Tablo için AUTO_INCREMENT değeri `haber_kategori`
--
ALTER TABLE `haber_kategori`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Tablo için AUTO_INCREMENT değeri `hit`
--
ALTER TABLE `hit`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `hizmetler`
--
ALTER TABLE `hizmetler`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Tablo için AUTO_INCREMENT değeri `ihaleler`
--
ALTER TABLE `ihaleler`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Tablo için AUTO_INCREMENT değeri `il`
--
ALTER TABLE `il`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=82;

--
-- Tablo için AUTO_INCREMENT değeri `ilanlar`
--
ALTER TABLE `ilanlar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Tablo için AUTO_INCREMENT değeri `ilce`
--
ALTER TABLE `ilce`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1000;

--
-- Tablo için AUTO_INCREMENT değeri `kolaymenu`
--
ALTER TABLE `kolaymenu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Tablo için AUTO_INCREMENT değeri `kullanici`
--
ALTER TABLE `kullanici`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- Tablo için AUTO_INCREMENT değeri `limit_ayarlari`
--
ALTER TABLE `limit_ayarlari`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `mail_ayar`
--
ALTER TABLE `mail_ayar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `meclis_kararlari`
--
ALTER TABLE `meclis_kararlari`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Tablo için AUTO_INCREMENT değeri `menu`
--
ALTER TABLE `menu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- Tablo için AUTO_INCREMENT değeri `mesajlar`
--
ALTER TABLE `mesajlar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- Tablo için AUTO_INCREMENT değeri `moduller`
--
ALTER TABLE `moduller`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `not_defteri`
--
ALTER TABLE `not_defteri`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Tablo için AUTO_INCREMENT değeri `ortamenu`
--
ALTER TABLE `ortamenu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Tablo için AUTO_INCREMENT değeri `popup_ayarlar`
--
ALTER TABLE `popup_ayarlar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `profiller`
--
ALTER TABLE `profiller`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Tablo için AUTO_INCREMENT değeri `profil_kategori`
--
ALTER TABLE `profil_kategori`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Tablo için AUTO_INCREMENT değeri `projeler`
--
ALTER TABLE `projeler`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- Tablo için AUTO_INCREMENT değeri `projeresim`
--
ALTER TABLE `projeresim`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=85;

--
-- Tablo için AUTO_INCREMENT değeri `proje_kategori`
--
ALTER TABLE `proje_kategori`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Tablo için AUTO_INCREMENT değeri `rehber`
--
ALTER TABLE `rehber`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `sabit_url`
--
ALTER TABLE `sabit_url`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `sayfalar`
--
ALTER TABLE `sayfalar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Tablo için AUTO_INCREMENT değeri `slider`
--
ALTER TABLE `slider`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- Tablo için AUTO_INCREMENT değeri `slidermenu`
--
ALTER TABLE `slidermenu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Tablo için AUTO_INCREMENT değeri `sms`
--
ALTER TABLE `sms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `topmenu`
--
ALTER TABLE `topmenu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Tablo için AUTO_INCREMENT değeri `video_galeri`
--
ALTER TABLE `video_galeri`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
