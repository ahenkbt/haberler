<?php
	date_default_timezone_set('Europe/Istanbul');
	error_reporting(E_ALL);
	ini_set('display_errors', E_ALL);

	$host = 'localhost'; // Linux sunucularda değiştirmeyiniz
	$data = 'vtadi'; // Veri tabanı Adını Yazın.
	$user = 'kladi'; // Veri tabanı Kullanıcı adını yazın
	$pass = 'sifre'; // Veri tabanı Şifrenizi Yazın
	
	try
	{
		$db = new PDO('mysql:host='.$host.';dbname='.$data.';charset=UTF8;', $user, $pass);
	}
	catch(PDOException $e)
	{
		echo 'Hata: '.$e->getMessage();
	}
	
	if(is_numeric(@$_GET['dil']))
	{
		$_SESSION['k_dil'] = $_GET['dil'];
	}	
	if(!isset($_SESSION['k_dil']))
	{
		$anadil = $db->prepare("SELECT * FROM diller WHERE anadil = ?");
		$anadil->execute([1]);
		if($anadil->rowCount() == 0) die("Lütfen bir anadil seçiniz !!");
		$anadil = $anadil->fetch(PDO::FETCH_ASSOC);
		$_SESSION['k_dil'] = @$anadil['id'];
	}
	else
	{
		$mevcutDil = $db->prepare("SELECT * FROM diller WHERE id = ?");
		$mevcutDil->execute([(int) $_SESSION['k_dil']]);
		if($mevcutDil->rowCount() == 0)
		{
			$anadil = $db->prepare("SELECT * FROM diller WHERE anadil = ?");
			$anadil->execute([1]);
			if($anadil->rowCount() == 0) die("Lütfen bir anadil seçiniz !!");
			$anadil = $anadil->fetch(PDO::FETCH_ASSOC);
			$_SESSION['k_dil'] = @$anadil['id'];
		}
		else
		{
			$mevcutDil = $mevcutDil->fetch(PDO::FETCH_ASSOC);
			$_SESSION['k_dil'] = @$mevcutDil['id'];
		}
	}
	$ayar 		= $db->query("SELECT * FROM ayarlar")->fetch();
	$baskan 		= $db->query("SELECT * FROM baskan_ayarlar")->fetch();
	$popup 		= $db->query("SELECT * FROM popup_ayarlar")->fetch();
	$htc 		= $db->query("SELECT * FROM sabit_url")->fetch();
	$bakim_modu = $db->query("SELECT * FROM bakim_modu")->fetch(); 
	$moduller 	= $db->query("SELECT * FROM moduller WHERE id = '1' ORDER BY id ASC LIMIT 1")->fetch();
	$mailayar 	= $db->query("SELECT * FROM mail_ayar")->fetch();
	$smsayar 	= $db->query("SELECT * FROM sms")->fetch();
	$arkaplan 	= $db->query("SELECT * FROM arka_plan WHERE id = '1' ORDER BY id ASC LIMIT 1")->fetch();
	$kart 		= $db->query("SELECT * FROM paytr WHERE id = '1' ORDER BY id ASC LIMIT 1")->fetch();
	$limitayar 	= $db->query("SELECT * FROM limit_ayarlari WHERE id = '1' ORDER BY id ASC LIMIT 1")->fetch();
	
	define("baslik", $ayar["site_baslik"]);
	define("url", $ayar["site_url"]);
	define("tema_dir", $ayar["site_tema"]);
	define("tema","tema/".$ayar["site_tema"]);
	define("tema_url", $ayar["site_url"]."tema/".$ayar["site_tema"]);	
	define("logo", $ayar["firma_logo"]);
	define("footerlogo", $ayar["firma_footerlogo"]);
	define("fav", $ayar["favicon"]);
	define("firma_adi", $ayar["firma_adi"]);
	define("telefon", $ayar["firma_telefon"]);
	define("fax", $ayar["firma_fax"]);
	define("email", $ayar["firma_email"]);
	define("adres", $ayar["firma_adres"]);
	define("maps", $ayar["google_maps"]);
	define("analytics", $ayar["google_analytics"]);
	define("dogrulama", $ayar["dogrulama_kodu"]);
	define("canli_destek", $ayar["canli_destek"]);
	define("whatsapp", $ayar["whatsapp"]);
	define("facebook", $ayar["facebook"]);
	define("twitter", $ayar["twitter"]);
	define("instagram", $ayar["instagram"]);
	define("linkedin", $ayar["linkedin"]);
	define("youtube", $ayar["youtube"]);
	define("copyright", $ayar["copyright"]);
	define("site_desc", $ayar["site_desc"]);
	define("site_keyw", $ayar["site_keyw"]);
	define("durum", $moduller["alan9"]);
	define("altklasor", $moduller["alan8"]);
	define("renk1", $ayar["renk1"]);
	define("renk2", $ayar["renk2"]);
	define("renk3", $ayar["renk3"]);
	define("yonetim", $ayar["yonetim"]);
	
	// Kredi Kartı Sabitler
	define("magaza_no", $kart["magaza_no"]);
	define("magaza_parola", $kart["magaza_parola"]);
	define("magaza_anahtar", $kart["magaza_anahtar"]);
	define("hata_mesaj", $kart["hata_mesaj"]);
	define("test_modu", $kart["test_modu"]);
	define("taksit", $kart["taksit"]);
	
	
	// Mail Sabitler
	define("m_server", 	$mailayar["m_server"]);
	define("m_adresi", 	$mailayar["m_adresi"]);
	define("m_parola", 	$mailayar["m_parola"]);
	define("m_port", 	$mailayar["m_port"]);
	define("m_sertifika", 	$mailayar["m_sertifika"]);
	define("m_kime", 	$mailayar["m_kime"]);
	
	// SMS Sabitler
	define("postUrl", 	$smsayar["postUrl"]);
	define("sms_kadi", 	$smsayar["KULLANICIADI"]);
	define("sms_sifre", 	$smsayar["SIFRE"]);
	define("sms_baslik", $smsayar["ORGINATOR"]);
	define("sms_kime", $smsayar["m_kime"]);
	
	
	function mailgonder($gelendegisken,$gidendegisken,$mailsablon,$kullanici_mail,$mailKonu,$mesaj) 
	{
		$mail = new PHPMailer();
		$mail->IsSMTP(true);
		$mail->SMTPSecure = m_sertifika;
		$mail->From     = m_adresi;
		$mail->Sender   = m_adresi;
		$mail->AddAddress($kullanici_mail, firma_adi); 
		$mail->AddReplyTo=(m_adresi);
		$mail->FromName = firma_adi;
		$mail->Host     = m_server;
		$mail->SMTPAuth = true;
		$mail->Port     = m_port;
		$mail->CharSet = 'UTF-8';
		$mail->Username = m_adresi;
		$mail->Password = m_parola;
		$mail->Subject  = $mailKonu;
		$gelen 	= $gelendegisken;
		$giden 	= $gidendegisken;
		$mesaj = str_replace($gelen,$giden,$mailsablon);
		$mail->IsHTML(true);
		$mail->Body = $mesaj;
		$mail->Send();
	}
	
	function smsgonder($gelendegisken,$gidendegisken,$smssablon,$sms_telefon,$sms_mesaj) 
	{
		$postUrl	= postUrl;
		$username	= sms_kadi;
		$password	= sms_sifre;
		$header		= sms_baslik;
		$gelen 		= $gelendegisken;
		$giden 		= $gidendegisken;
		$sms_mesaj 	= str_replace($gelen,$giden,$smssablon);
		$postData=''.
		'<sms>'.
		'<username>'.$username.'</username>'.
		'<password>'.$password.'</password>'.
		'<header><meta http-equiv="Content-Type" content="text/html; charset=utf-8">'.$header.'</header>'.
		'<validity>2880</validity>'.
		'<message>'.
		'<gsm>'.
		'<no>'.$sms_telefon.'</no>'.
		'</gsm>'.
		'<msg><![CDATA['.$sms_mesaj.']]></msg>'.
		'</message>'.
		'</sms>';
		$ch=curl_init();
		curl_setopt($ch,CURLOPT_URL,$postUrl);
		curl_setopt($ch,CURLOPT_POSTFIELDS,$postData);
		curl_setopt($ch,CURLOPT_POST,1);
		curl_setopt($ch,CURLOPT_TIMEOUT,5);
		curl_setopt($ch,CURLOPT_RETURNTRANSFER,1);
		curl_setopt($ch,CURLOPT_HTTPHEADER,Array('Content-Type: text/xml; charset=UTF-8'));
		$response=curl_exec($ch);
		curl_close($ch);
	}
	
	function toplusmsgonder($sms_telefon,$sms_mesaj) 
	{
		$postUrl	= postUrl;
		$username	= sms_kadi;
		$password	= sms_sifre;
		$header		= sms_baslik;
		$postData="".
		"<sms>".
		"<username>$username</username>".
		"<password>$password</password>".
		"<header>$header</header>".
		"<validity>2880</validity>".
		"<message>".
		"<gsm>".
		"<no>$sms_telefon</no>".
		"</gsm>".
		"<msg><![CDATA[$sms_mesaj]]></msg>".
		"</message>".
		"</sms>";
		$ch=curl_init();
		curl_setopt($ch,CURLOPT_URL,$postUrl);
		curl_setopt($ch,CURLOPT_POSTFIELDS,$postData);
		curl_setopt($ch,CURLOPT_POST,1);
		curl_setopt($ch,CURLOPT_TIMEOUT,5);
		curl_setopt($ch,CURLOPT_RETURNTRANSFER,1);
		curl_setopt($ch,CURLOPT_HTTPHEADER,Array('Content-Type: text/xml; charset=UTF-8'));
		$response=curl_exec($ch);
		curl_close($ch);
	}
	

?>