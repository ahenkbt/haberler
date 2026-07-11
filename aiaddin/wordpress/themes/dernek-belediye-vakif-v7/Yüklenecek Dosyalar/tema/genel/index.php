<?php define("GUVENLIK",true);?>
<html lang="tr">
<head>
	<?php 
	if($moduller['alan21'] == "1"){
		if(empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] == "off")
		{
			$redirect = 'https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
			header('HTTP/1.1 301 Moved Permanently');
			header('Location: ' . $redirect);
			exit();
		}
	}
	?>
	<?php $protocol = strtolower(substr($_SERVER["SERVER_PROTOCOL"],0,5))=='https'?'https':'http';
	$protocol = isset($_SERVER["HTTPS"]) ? 'https://' : 'http://';
	$url=$protocol.$_SERVER["HTTP_HOST"].dirname($_SERVER['PHP_SELF']); 
	$sayfalink = $protocol.$_SERVER['SERVER_NAME'].$_SERVER['REQUEST_URI'];
	$dilsay		= $db->query("SELECT * FROM  diller")->rowCount();
	$dilyaz  	= $db->query("SELECT * FROM diller WHERE id = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
	?>
	<?php require_once('pages/sayac.php');?>
	<base href="<?php echo $url;?><?php echo(altklasor == "1" ? '/' : '');?>">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
	
	<title><?php echo $title;?></title>
	<meta name="description" content="<?php echo $description;?>" />
	<meta name="keywords" content="<?php echo $keywords;?>" />
	
	<!-- Facebook Metadata Start -->
	<meta property="og:image:height" content="300" />
	<meta property="og:image:width" content="573" />
	<meta property="og:title" content="<?php echo $title;?>" />
	<meta property="og:description" content="<?php echo $description;?>" />
	<meta property="og:url" content="<?php echo $sayfalink;?>" />
	<meta property="og:image" content="<?php echo $url;?><?php echo(altklasor == "1" ? '/' : '');?><?php echo $paylasim;?>" />
	<?php echo dogrulama;?>
	<link rel="shortcut icon" href="<?php echo tema;?>/uploads/favicon/<?php echo fav;?>">

    <link rel="stylesheet" type="text/css" href="<?php echo tema;?>/assets/css/normalize.css">
    <link rel="stylesheet" href="<?php echo tema;?>/assets/bower_components/bootstrap/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="<?php echo tema;?>/assets/bower_components/owl.carousel/dist/assets/owl.carousel.min.css">
    <link rel="stylesheet" href="<?php echo tema;?>/assets/bower_components/components-font-awesome/css/all.css">

    <link href="https://fonts.googleapis.com/css?family=Montserrat:400,500,700,800,900|Roboto:400,500,700,900&display=swap" rel="stylesheet">
	<link href="https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900&subset=latin-ext" rel="stylesheet">
	
    <link rel="stylesheet" href="<?php echo tema;?>/assets/css/style.php">
	<link rel="stylesheet" href="<?php echo tema;?>/assets/css/iziModal.min.css" type="text/css">
	<link rel="stylesheet" href="<?php echo $url;?><?php echo(altklasor == "1" ? '/' : '');?>yonetim/vendors/iconfonts/flag-icon-css/css/flag-icon.min.css" />
    <link rel="stylesheet" href="<?php echo tema;?>/assets/css/search.css">
    <link rel="stylesheet" href="<?php echo tema;?>/assets/bower_components/plyr-master/dist/plyr.css">
    <link rel="stylesheet" href="<?php echo tema;?>/assets/css/loader.css">
	<link rel="stylesheet" href="<?php echo tema;?>/assets/css/fancybox.css" />
	
	<!-- Font Awesome CSS -->
    <link rel="stylesheet" href="<?php echo tema;?>/assets/css/font-awesome5.min.css" />
    <link rel="stylesheet" href="<?php echo tema;?>/assets/css/all.css" />
	<?php 
	if($moduller['alan22'] == "1")
	{
		$Filename = 'havadurumu.txt';
		$dosya = fopen($Filename, 'r');
		$tarih = strtotime(fread($dosya, filesize($Filename)));
		$Bugun = strtotime(date('Y-m-d H:i:s'));
		$BTarih = date('Y-m-d H:i:s');
		$fark  = abs($tarih - $Bugun);
		$Dakika = $fark/60;
	
		if($Dakika > 300)
		{
			set_time_limit(0);
			$date = date('Y-m-d');
			$db->query("DELETE FROM havadurumu WHERE tarih LIKE '%{$date}%' ");



            $curl = curl_init();

            curl_setopt_array($curl, array(
                CURLOPT_URL => "https://www.ntvhava.com/".seo($ayar['havadurumu'])."-hava-durumu",
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => '',
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 0,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => 'GET',
                CURLOPT_HTTPHEADER => array(
                    'Connection: keep-alive',
                    'Cache-Control: max-age=0',
                    'sec-ch-ua: "Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
                    'sec-ch-ua-mobile: ?0',
                    'Upgrade-Insecure-Requests: 1',
                    'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
                    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'Sec-Fetch-Site: none',
                    'Sec-Fetch-Mode: navigate',
                    'Sec-Fetch-User: ?1',
                    'Sec-Fetch-Dest: document',
                    'Accept-Language: tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Cookie: ARRAffinity=243f00316f8b3d2dc20f56e21bf2af02b70961694164415ba4fd25af196238b4; ai_user=aVQhs|2021-04-15T06:15:00.988Z; ai_session=TmgSk|1618467306998.605|1618467306998.605; __utma=199725425.418725167.1618467307.1618467307.1618467307.1; __utmc=199725425; __utmz=199725425.1618467307.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); __utmt=1; __utmb=199725425.1.10.1618467307'
                ),
            ));

            $response = curl_exec($curl);

            curl_close($curl);

			$havadurumu = str_get_html($response);
		
			// Find all article blocks
			foreach($havadurumu->find('ul.daily-report-tab-content-pane-items li') as $article) {
				$item['tahmin']     = $article->find('.daily-report-tab-content-pane-item-text', 0)->plaintext;
				$item['derece']    = $article->find('.daily-report-tab-content-pane-item-box-bottom-degree-big', 0)->plaintext;
				$item['img'] = 'https://www.ntvhava.com/'.$article->find('img', 0)->src;
				$hava[] = $item;
				$query = $db->prepare("INSERT INTO havadurumu SET tarih = ? , tahmin = ?, derece = ?, img = ?");
				$query->execute(array(
					$BTarih,$item['tahmin'],$item['derece'],$item['img']
				));
			}
			$dosya = fopen($Filename, 'w');
			fwrite($dosya, date('Y-m-d H:i:s'));
			fclose($dosya);
		}
	}
	?>
	<script src="<?php echo tema;?>/assets/bower_components/jquery/dist/jquery.min.js"></script>
	<script src="<?php echo tema;?>/assets/js/sweetalert2.all.min.js"></script>
	<script src="<?php echo tema;?>/assets/js/sweetalert2.min.js"></script>
	<?php echo analytics;?>
	<?php echo canli_destek;?>
	<?php
	if($moduller['alan20'] == "1"){
		$html = ".html";
	}
	else
	{
		$html = "";
	}	
	?>
</head>
<body>
	<?php echo whatsapp;?>
    <!-- MAİN BAŞLANGIÇ-->
    <main class="main-wrap">

        <!-- HEADER BAŞLANGIÇ -->
        <section class="header">

            <!-- HEADER-TOP BAŞLANGIÇ -->
            <div class="header-top">
                <div class="container">

                    <div>
                        <ul class="navs">
						<?php $Sorgu = $db->prepare("SELECT * FROM topmenu WHERE menu_durum = ? AND dil = ? ORDER BY menu_sira ASC");
						$Sorgu->execute(array("1",$_SESSION['k_dil']));
						$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
							<?php foreach ( $islem as $Sonuc ){?>
                            <li class="hover-bar"> <a <?php echo($Sonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo($Sonuc['menu_url'] == "0" ? $Sonuc['link'] : $Sonuc['menu_url']); ?>"> <?php echo $Sonuc['menu_isim']?> </a></li>
							<?php }?>
                        </ul>
                        <span class="h-border"></span>
						<?php if($dilsay > 1){?>
						<a href="javascript:;" class="trigger-link"><i class="fad fa-globe"></i> <?=@$dil['txt1'];?></a></li>
						<div id="modal-demo" class="iziModal text-center">
							<div class="p-4">
								<div class="lang">
									<h4><?=@$dil['txt2'];?></h4>
									<?php 
									$DILSorgu = $db->prepare("SELECT * FROM diller ORDER BY sira ASC");
									$DILSorgu->execute();
									$DILislem 	= $DILSorgu->fetchALL(PDO::FETCH_ASSOC);?>						
									<?php foreach ( $DILislem as $DILSonuc ){?> 
										<a data-id="<?=@$DILSonuc['id'];?>" href="javascript:;" class="<?php echo($dilyaz['id'] == $DILSonuc['id'] ? 'activelang' : '');?> dildegis"><i class="flag-icon <?php echo $DILSonuc['bayrak'];?>"></i> <?php echo $DILSonuc['adi'];?></a>				
									<?php }?>								
									<div class="clear"></div>
								</div>
								<div class="clear"></div>
							</div>						
						</div>
						<?php }?>
                        <ul class="social">
							<?php if(facebook){?><li><a title="facebook" href="<?php echo facebook;?>"><i class="fab fa-facebook-f"></i></a></li><?php }?>
							<?php if(twitter){?><li><a title="telegram" href="<?php echo twitter;?>"><i class="fab fa-twitter"></i></a></li><?php }?>
							<?php if(instagram){?><li><a title="instagram" href="<?php echo instagram;?>"><i class="fab fa-instagram"></i></a></li><?php }?>
							<?php if(linkedin){?><li><a title="linkedin" href="<?php echo linkedin;?>"><i class="fab fa-linkedin-in"></i></a></li><?php }?>
							<?php if(youtube){?><li><a title="youtube" href="<?php echo youtube;?>"><i class="fab fa-youtube"></i></a></li><?php }?>
                        </ul>
                    </div>


                </div>
            </div>
            <!-- HEADER-TOP BİTİŞ -->

            <!-- HEADER-BOTTOM BAŞLANGIÇ -->
            <div class="header-bottom">
                <div class="container">

                    <div class="row">

                        <div class="col-xl-2 col-lg-4 col-md-4 logo-box">
                            <a href="<?php echo $htc['anaurl'];?><?php echo $html;?>"><img class="logo z-index-9" src="<?php echo tema;?>/uploads/logo/<?php echo logo;?>" alt="<?php echo firma_adi;?>"></a>
                        </div>
                        <div class="col-xl-9 col-lg-7 col-md-4 p-0 position-static">
                            <ul class="navs">							
							<?php $MENUSorgu = $db->prepare("SELECT * FROM menu WHERE menu_durum = ? AND menu_ust = ? AND dil = ? ORDER BY menu_sira ASC");
							$MENUSorgu->execute(array("1","0",$_SESSION['k_dil']));
							$MENUislem = $MENUSorgu->fetchALL(PDO::FETCH_ASSOC);?>
							<?php foreach ( $MENUislem as $MENUSonuc ){?>
							<?php $altvarmi	= $db->query("SELECT * FROM menu WHERE menu_durum = '1' AND menu_ust = '{$MENUSonuc['id']}' ORDER BY id DESC")->rowCount();?>
							<?php if($MENUSonuc['tip']==0){?>
							<!-- alt menü yok BAŞLANGIÇ -->
                                <li class="header-item">
                                    <a class="hover-bar" href="<?php echo($MENUSonuc['menu_url'] == "0" ? $MENUSonuc['link'] : $MENUSonuc['menu_url'].$html); ?>"><?php echo $MENUSonuc['menu_isim']; ?></a>
                                </li>
								<!-- alt menü yok BİTİŞ -->
								<?php } else { ?>
								<?php if($MENUSonuc['tip']==1){?>
								<!-- MENÜ TİP 1  BAŞLANGIÇ -->
                                <li class="header-item">
                                    <a <?php echo($MENUSonuc['sekme'] == 1 ? 'target="_blank"' : '');?> class="hover-bar" href="<?php echo($MENUSonuc['menu_url'] == "0" ? $MENUSonuc['link'] : $MENUSonuc['menu_url']); ?>"><?php echo $MENUSonuc['menu_isim']; ?></a>
                                    <div class="header-dropdown bg-red">
                                        <img src="<?php echo tema;?>/uploads/arkaplan/arkaplan21/<?php echo $arkaplan['arkaplan21'];?>" class="bg-image">
										<?php $ALTMENUSorgu = $db->prepare("SELECT * FROM menu WHERE menu_durum = ? AND menu_ust = ? AND dil = ? ORDER BY menu_sira ASC");
										$ALTMENUSorgu->execute(array("1",$MENUSonuc['id'],$_SESSION['k_dil']));
										$ALTMENUislem = $ALTMENUSorgu->fetchALL(PDO::FETCH_ASSOC);?>
										<?php if($ALTMENUSorgu->rowCount()){?>
                                        <div class="container">
                                            <div class="row py-5">
											<?php foreach ( $ALTMENUislem as $ALTMENUSonuc ){?>
											<div class="col-3 py-3">
                                                    <div class="link-box">
                                                        <a <?php echo($ALTMENUSonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo($ALTMENUSonuc['menu_url'] == "0" ? $ALTMENUSonuc['link'] : $ALTMENUSonuc['menu_url'].$html); ?>">
                                                            <?php echo $ALTMENUSonuc['menu_isim']; ?>
                                                        </a>
                                                    </div>
                                                </div>
                                             <?php }?>
											 <?php if($MENUSonuc['tbuton']==""){?>
											 <?php }else{?>
												<div class="col-3 py-3">
                                                    <div class="link-box tumunu-gor">
                                                        <a href="<?php echo $MENUSonuc['tbuton']; ?>">
                                                            <?=@$dil['txt3'];?> <i class="far fa-arrow-right ml-2"></i>
                                                        </a>
                                                    </div>
                                                </div>
											 <?php } ?>
											</div>
                                        </div>
										<?php }?>
                                    </div>

                                </li>
								<!-- MENÜ TİP 1 BİTİŞ -->
								<?php } else { ?>
								
							   <?php if($MENUSonuc['tip']==2){?>
								<!-- MENÜ TİP 2 BAŞLANGIÇ -->
                                <li class="header-item">
                                    <a <?php echo($MENUSonuc['sekme'] == 1 ? 'target="_blank"' : '');?> class="hover-bar" href="<?php echo($MENUSonuc['menu_url'] == "0" ? $MENUSonuc['link'] : $MENUSonuc['menu_url']); ?>"><?php echo $MENUSonuc['menu_isim']; ?></a>
                                    <!-- MENÜ TİP 2 haber ve haber kategorisi açık isteniyorsa BAŞLANGIÇ-->
								    <?php if($MENUSonuc['tipkat']==0){?>
									<?php if($MENUSonuc['kategori']==0){?>
									 <div class="header-dropdown bg-white">
                                        <div class="container-fluid">
                                            <div class="row">
                                                <div class="col-4 py-5 pr-0 right-shadow">
                                                    <ul class="header-tabs">
														<?php $HKSorgu = $db->prepare("SELECT * FROM haber_kategori WHERE durum = ? AND dil = ? ORDER BY sira ASC LIMIT ".$MENUSonuc['klimit']."");
														$HKSorgu->execute(array("1",$_SESSION['k_dil']));
														$HKislem = $HKSorgu->fetchALL(PDO::FETCH_ASSOC);
														$HKmansetsay = 1;?>
														<?php foreach ( $HKislem as $HKSonuc ){?>
                                                        <li class="<?php echo($HKmansetsay++ == 1 ? 'active' : '');?> mb-2 tab-link" datatarget="#<?php echo $HKSonuc['seo'];?>">
                                                            <i class="fal fa-chevron-right mr-2"></i> <?php echo $HKSonuc['adi'];?>
                                                        </li>
														<?php }?>
                                                      </ul>
                                                </div>
                                                <div class="col-8 py-4">
                                                    <img src="<?php echo tema;?>/uploads/arkaplan/arkaplan21/<?php echo $arkaplan['arkaplan21'];?>" class="bg-image">
													<?php $HKASorgu = $db->prepare("SELECT * FROM haber_kategori WHERE durum = ? AND dil = ? ORDER BY sira ASC LIMIT ".$MENUSonuc['klimit']."");
													$HKASorgu->execute(array("1",$_SESSION['k_dil']));
													$HKAislem = $HKASorgu->fetchALL(PDO::FETCH_ASSOC);
													$HKAmansetsay = 1;?>
													<?php foreach ( $HKAislem as $HKASonuc ){?>
                                                    <div class="tab-panel <?php echo($HKAmansetsay++ == 1 ? 'active' : '');?>" id="<?php echo $HKASonuc['seo'];?>">
                                                        <div class="row">
                                                            <div class="col-12">
                                                                <h3 class="g-title">
                                                                   <?php echo $HKASonuc['adi'];?>
                                                                    <a class="drp-tumunu-gor hover-bar" href="<?php echo $htc['haberkategoriurl']; ?>/<?php echo $HKASonuc['seo']; ?><?php echo $html;?>">
                                                                        <?=@$dil['txt3'];?>
                                                                    </a>
                                                                </h3>
                                                            </div>
															<?php $HSorgu = $db->prepare("SELECT * FROM haberler WHERE durum = ? AND dil = ? and kategori = ? ORDER BY sira ASC LIMIT ".$MENUSonuc['ilimit']."");
															$HSorgu->execute(array("1",$_SESSION['k_dil'],$HKASonuc['id']));
															$Hislem = $HSorgu->fetchALL(PDO::FETCH_ASSOC);?>
															<?php foreach ( $Hislem as $HSonuc ){?>
															   <div class="col-4 my-3">
                                                                <div class="drp-haber-box">
                                                                    <a href="<?php echo $htc['haberdetayurl']; ?>/<?php echo $HSonuc['seo']; ?><?php echo $html;?>">
                                                                        <div class="row m-0">
                                                                            <div class="col-4 p-0">
                                                                                <img src="<?php echo tema;?>/uploads/haberler/<?php echo $HSonuc['resim'];?>" onerror="imgError(this);">
                                                                            </div>
                                                                            <div class="col-8 p-0 content">
                                                                                <div>
                                                                                    <h4>
                                                                                       <?php echo $HSonuc['adi'];?>
                                                                                    </h4>
                                                                                    <p><?php echo tarih2($HSonuc['tarih']);?></p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </a>
                                                                </div>
                                                            </div>
															<?php }?>
															</div>
                                                    </div>
													<?php }?>
                                                  </div>
                                            </div>
                                        </div>
                                    </div>
									<!-- MENÜ TİP 2 haber ve haber kategorisi açık isteniyorsa BİTİŞ-->
									<?php } else if($MENUSonuc['kategori']==1) { ?>
									<!-- MENÜ TİP 2 PROJELER ve PROJE kategorisi açık isteniyorsa BAŞLANGIÇ-->
									<div class="header-dropdown bg-white">
                                        <div class="container-fluid">
                                            <div class="row">
                                                <div class="col-4 py-5 pr-0 right-shadow">
                                                    <ul class="header-tabs">
														<?php $PKSorgu = $db->prepare("SELECT * FROM proje_kategori WHERE durum = ? AND dil = ? ORDER BY sira ASC LIMIT ".$MENUSonuc['klimit']."");
														$PKSorgu->execute(array("1",$_SESSION['k_dil']));
														$PKislem = $PKSorgu->fetchALL(PDO::FETCH_ASSOC);
														$PKmansetsay = 1;?>
														<?php foreach ( $PKislem as $PKSonuc ){?>
                                                        <li class="<?php echo($PKmansetsay++ == 1 ? 'active' : '');?> mb-2 tab-link" datatarget="#<?php echo $PKSonuc['seo'];?>">
                                                            <i class="fal fa-chevron-right mr-2"></i> <?php echo $PKSonuc['adi'];?>
                                                        </li>
														<?php }?>
                                                      </ul>
                                                </div>
                                                <div class="col-8 py-4">
                                                    <img src="<?php echo tema;?>/uploads/arkaplan/arkaplan21/<?php echo $arkaplan['arkaplan21'];?>" class="bg-image">
													<?php $PKASorgu = $db->prepare("SELECT * FROM proje_kategori WHERE durum = ? AND dil = ? ORDER BY sira ASC LIMIT ".$MENUSonuc['klimit']."");
													$PKASorgu->execute(array("1",$_SESSION['k_dil']));
													$PKAislem = $PKASorgu->fetchALL(PDO::FETCH_ASSOC);
													$PKAmansetsay = 1;?>
													<?php foreach ( $PKAislem as $PKASonuc ){?>
                                                    <div class="tab-panel <?php echo($PKAmansetsay++ == 1 ? 'active' : '');?>" id="<?php echo $PKASonuc['seo'];?>">
                                                        <div class="row">
                                                            <div class="col-12">
                                                                <h3 class="g-title">
                                                                   <?php echo $PKASonuc['adi'];?>
                                                                    <a class="drp-tumunu-gor hover-bar" href="<?php echo $htc['projekategoriurl']; ?>/<?php echo $PKASonuc['seo']; ?><?php echo $html;?>">
                                                                        <?=@$dil['txt3'];?>
                                                                    </a>
                                                                </h3>
                                                            </div>
															<?php $PSorgu = $db->prepare("SELECT * FROM projeler WHERE durum = ? AND dil = ? and kategori = ? ORDER BY sira ASC LIMIT ".$MENUSonuc['ilimit']."");
															$PSorgu->execute(array("1",$_SESSION['k_dil'],$PKASonuc['id']));
															$Pislem = $PSorgu->fetchALL(PDO::FETCH_ASSOC);?>
															<?php foreach ( $Pislem as $PSonuc ){?>
															<div class="col-4 my-3">
                                                                <div class="drp-haber-box">
                                                                    <a href="<?php echo $htc['projedetayurl']; ?>/<?php echo $PSonuc['seo']; ?><?php echo $html;?>">
                                                                        <div class="row m-0">
                                                                            <div class="col-4 p-0">
                                                                                <img src="<?php echo tema;?>/uploads/projeler/<?php echo $PSonuc['kapak'];?>" onerror="imgError(this);">
                                                                            </div>
                                                                            <div class="col-8 p-0 content">
                                                                                <div>
                                                                                    <h4>
                                                                                       <?php echo $PSonuc['adi'];?>
                                                                                    </h4>
                                                                                    <p><?php echo tarih2($PSonuc['tarih']);?></p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </a>
                                                                </div>
                                                            </div>
															<?php }?>
														 </div>
                                                       </div>
													<?php }?>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
									<!-- MENÜ TİP 2 PROJELER ve PROJE kategorisi açık isteniyorsa BİTİŞ-->	
									<?php }else{?>
									<!-- MENÜ TİP 2 PROFİLLER ve PROFİL kategorisi açık isteniyorsa BAŞLANGIÇ-->
									<div class="header-dropdown bg-white">
                                        <div class="container-fluid">
                                            <div class="row">
                                                <div class="col-4 py-5 pr-0 right-shadow">
                                                    <ul class="header-tabs">
														<?php $PKSorgu = $db->prepare("SELECT * FROM profil_kategori WHERE durum = ? AND dil = ? ORDER BY id ASC LIMIT ".$MENUSonuc['klimit']."");
														$PKSorgu->execute(array("1",$_SESSION['k_dil']));
														$PKislem = $PKSorgu->fetchALL(PDO::FETCH_ASSOC);
														$PRFKmansetsay = 1;?>
														<?php foreach ( $PKislem as $PKSonuc ){?>
                                                        <li class="<?php echo($PRFKmansetsay++ == 1 ? 'active' : '');?> mb-2 tab-link" datatarget="#<?php echo $PKSonuc['seo'];?>">
                                                            <i class="fal fa-chevron-right mr-2"></i> <?php echo $PKSonuc['adi'];?>
                                                        </li>
														<?php }?>
                                                      </ul>
                                                </div>
                                                <div class="col-8 py-4">
                                                    <img src="<?php echo tema;?>/uploads/arkaplan/arkaplan21/<?php echo $arkaplan['arkaplan21'];?>" class="bg-image">
													<?php $PKASorgu = $db->prepare("SELECT * FROM profil_kategori WHERE durum = ? AND dil = ? ORDER BY id ASC LIMIT ".$MENUSonuc['klimit']."");
													$PKASorgu->execute(array("1",$_SESSION['k_dil']));
													$PKAislem = $PKASorgu->fetchALL(PDO::FETCH_ASSOC);
													$PRFKAmansetsay = 1;?>
													<?php foreach ( $PKAislem as $PKASonuc ){?>
                                                    <div class="tab-panel <?php echo($PRFKAmansetsay++ == 1 ? 'active' : '');?>" id="<?php echo $PKASonuc['seo'];?>">
                                                        <div class="row">
                                                            <div class="col-12">
                                                                <h3 class="g-title">
                                                                   <?php echo $PKASonuc['adi'];?>
                                                                    <a class="drp-tumunu-gor hover-bar" href="<?php echo $htc['profilkategoriurl']; ?>/<?php echo $PKASonuc['seo']; ?><?php echo $html;?>">
                                                                        Tümünü Gör
                                                                    </a>
                                                                </h3>
                                                            </div>
															<?php $PSorgu = $db->prepare("SELECT * FROM profiller WHERE durum = ? AND dil = ? and kategori = ? ORDER BY sira ASC LIMIT ".$MENUSonuc['ilimit']."");
															$PSorgu->execute(array("1",$_SESSION['k_dil'],$PKASonuc['id']));
															$Pislem = $PSorgu->fetchALL(PDO::FETCH_ASSOC);?>
															<?php foreach ( $Pislem as $PSonuc ){?>
															<div class="col-4 my-3">
                                                                <div class="drp-haber-box">
                                                                    <a href="<?php echo $htc['profildetayurl']; ?>/<?php echo $PSonuc['seo']; ?><?php echo $html;?>">
                                                                        <div class="row m-0">
                                                                            <div class="col-4 p-0">
                                                                                <img src="<?php echo tema;?>/uploads/profiller/<?php echo $PSonuc['kapak'];?>" onerror="imgError(this);">
                                                                            </div>
                                                                            <div class="col-8 p-0 content">
                                                                                <div>
                                                                                    <h4>
                                                                                       <?php echo $PSonuc['adi'];?>
                                                                                    </h4>
                                                                                    <p><?php echo tarih2($PSonuc['tarih']);?></p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </a>
                                                                </div>
                                                            </div>
															<?php }?>
														 </div>
                                                       </div>
													<?php }?>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
									<?php }?>
									<!-- MENÜ TİP 2 PROFİLLER ve PROFİL kategorisi açık isteniyorsa BİTİŞ-->		
									<?php } else { ?>									
									<!-- MENÜ TİP 2 HABERLER ve HABER kategorisi KAPALI isteniyorsa BAŞLANGIÇ-->
									<?php if($MENUSonuc['kategori']==0){?>
									 <div class="header-dropdown bg-white">
                                        <div class="container">
                                            <div class="row">											
												<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan21/<?php echo $arkaplan['arkaplan21'];?>" class="bg-image">													
												<div class="tab-panel active full py-5" id="haberler">
													<div class="row">
														<div class="col-12">
															<h3 class="g-title">
															   <?php echo $MENUSonuc['menu_isim']; ?>
																<a class="drp-tumunu-gor hover-bar" href="<?php echo $htc['haberlerurl']; ?><?php echo $html;?>">
																	<?=@$dil['txt3'];?>
																</a>
															</h3>
														</div>
														<?php $HSorgu = $db->prepare("SELECT * FROM haberler WHERE durum = ? AND dil = ? ORDER BY sira ASC LIMIT ".$MENUSonuc['ilimit']."");
														$HSorgu->execute(array("1",$_SESSION['k_dil']));
														$Hislem = $HSorgu->fetchALL(PDO::FETCH_ASSOC);?>
														<?php foreach ( $Hislem as $HSonuc ){?>
														   <div class="col-4 my-3">
															<div class="drp-haber-box">
																<a href="<?php echo $htc['haberdetayurl']; ?>/<?php echo $HSonuc['seo']; ?><?php echo $html;?>">
																	<div class="row m-0">
																		<div class="col-4 p-0">
																			<img src="<?php echo tema;?>/uploads/haberler/<?php echo $HSonuc['resim'];?>" onerror="imgError(this);">
																		</div>
																		<div class="col-8 p-0 content">
																			<div>
																				<h4>
																				   <?php echo $HSonuc['adi'];?>
																				</h4>
																				<p><?php echo tarih2($HSonuc['tarih']);?></p>
																			</div>
																		</div>
																	</div>
																</a>
															</div>
														</div>
														<?php }?>
														</div>
													</div>												
                                                 
                                            </div>
                                        </div>
                                    </div>
									<!-- MENÜ TİP 2 HABERLER ve HABER kategorisi KAPALI isteniyorsa BİTİŞ-->
									<?php } else if($MENUSonuc['kategori']==1) { ?>
									<!-- MENÜ TİP 2 PROJELER ve PROJELER kategorisi KAPALI isteniyorsa BAŞLANGIÇ-->
									<div class="header-dropdown bg-white">
                                        <div class="container">
										<div class="row">
                                              <img src="<?php echo tema;?>/uploads/arkaplan/arkaplan21/<?php echo $arkaplan['arkaplan21'];?>" class="bg-image">
													<div class="tab-panel active full py-5" id="projeler">
                                                        <div class="row">
                                                            <div class="col-12">
                                                                <h3 class="g-title">
                                                                <?php echo $MENUSonuc['menu_isim']; ?>
                                                                    <a class="drp-tumunu-gor hover-bar" href="<?php echo $htc['projelerurl']; ?><?php echo $html;?>">
                                                                        <?=@$dil['txt3'];?>
                                                                    </a>
                                                                </h3>
                                                            </div>
															<?php $PSorgu = $db->prepare("SELECT * FROM projeler WHERE durum = ? AND dil = ? ORDER BY sira ASC LIMIT ".$MENUSonuc['ilimit']."");
															$PSorgu->execute(array("1",$_SESSION['k_dil']));
															$Pislem = $PSorgu->fetchALL(PDO::FETCH_ASSOC);?>
															<?php foreach ( $Pislem as $PSonuc ){?>
															   <div class="col-3 my-3">
                                                                <div class="drp-haber-box">
                                                                    <a href="<?php echo $htc['projedetayurl']; ?>/<?php echo $PSonuc['seo']; ?><?php echo $html;?>">
                                                                        <div class="row m-0">
                                                                            <div class="col-4 p-0">
                                                                                <img src="<?php echo tema;?>/uploads/projeler/<?php echo $PSonuc['kapak'];?>" onerror="imgError(this);">
                                                                            </div>
                                                                            <div class="col-8 p-0 content">
                                                                                <div>
                                                                                    <h4>
                                                                                       <?php echo $PSonuc['adi'];?>
                                                                                    </h4>
                                                                                    <p><?php echo tarih2($PSonuc['tarih']);?></p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </a>
                                                                </div>
                                                            </div>
															<?php }?>
														 </div>
                                                   </div>
                                            </div>
                                        </div>
                                     </div>
									 <!-- MENÜ TİP 2 PROJELER ve PROJELER kategorisi KAPALI isteniyorsa BİTİŞ-->
									<?php }else{?>
									<!-- MENÜ TİP 2 PROFİLLER ve PROFİL kategorisi KAPALI isteniyorsa BAŞLANGIÇ-->
									<div class="header-dropdown bg-white">
                                        <div class="container">
										<div class="row">
											<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan21/<?php echo $arkaplan['arkaplan21'];?>" class="bg-image">
											<div class="tab-panel active full py-5" id="profiller">
												<div class="row">
													<div class="col-12">
														<h3 class="g-title">
														<?php echo $MENUSonuc['menu_isim']; ?>
															<a class="drp-tumunu-gor hover-bar" href="<?php echo $htc['profillerurl']; ?><?php echo $html;?>">
																<?=@$dil['txt3'];?>
															</a>
														</h3>
													</div>
													<?php $PSorgu = $db->prepare("SELECT * FROM profiller WHERE durum = ? AND dil = ? ORDER BY sira ASC LIMIT ".$MENUSonuc['ilimit']."");
													$PSorgu->execute(array("1",$_SESSION['k_dil']));
													$Pislem = $PSorgu->fetchALL(PDO::FETCH_ASSOC);?>
													<?php foreach ( $Pislem as $PSonuc ){?>
													   <div class="col-3 my-3">
														<div class="drp-haber-box">
															<a href="<?php echo $htc['profildetayurl']; ?>/<?php echo $PSonuc['seo']; ?><?php echo $html;?>">
																<div class="row m-0">
																	<div class="col-4 p-0">
																		<img src="<?php echo tema;?>/uploads/profiller/<?php echo $PSonuc['kapak'];?>" onerror="imgError(this);">
																	</div>
																	<div class="col-8 p-0 content">
																		<div>
																			<h4>
																			   <?php echo $PSonuc['adi'];?>
																			</h4>
																			<p><?php echo $PSonuc['tarih'];?></p>
																		</div>
																	</div>
																</div>
															</a>
														</div>
													</div>
													<?php }?>
												 </div>
											</div>
                                           </div>
                                        </div>
                                     </div>
									 <!-- MENÜ TİP 2 PROFİLLER ve PROFİL kategorisi KAPALI isteniyorsa BİTİŞ-->
									<?php }?>
								<?php }?>								
								</li>
								<?php } else { ?>
								<!-- MENÜ TİP 2 BİTİŞ -->
								
								<!-- MENÜ TİP 3 BAŞLANGIÇ -->
                                <li class="header-item2 position-relative">
                                    <a <?php echo($MENUSonuc['sekme'] == 1 ? 'target="_blank"' : '');?> class="hover-bar" href="<?php echo($MENUSonuc['menu_url'] == "0" ? $MENUSonuc['link'] : $MENUSonuc['menu_url']); ?>"><?php echo $MENUSonuc['menu_isim']; ?></a>
									<?php $ALTMENUSorgu = $db->prepare("SELECT * FROM menu WHERE menu_durum = ? AND menu_ust = ? AND dil = ? ORDER BY menu_sira ASC");
									$ALTMENUSorgu->execute(array("1",$MENUSonuc['id'],$_SESSION['k_dil']));
									$ALTMENUislem = $ALTMENUSorgu->fetchALL(PDO::FETCH_ASSOC);?>
									<?php if($ALTMENUSorgu->rowCount()){?>	
								   <ul class="header-dropdown-small">
									<?php foreach ( $ALTMENUislem as $ALTMENUSonuc ){?>
                                        <li><a <?php echo($ALTMENUSonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo($ALTMENUSonuc['menu_url'] == "0" ? $ALTMENUSonuc['link'] : $ALTMENUSonuc['menu_url'].$html); ?>"><?php echo $ALTMENUSonuc['menu_isim']; ?></a></li>
                                      <?php }?>  
                                    </ul>
									<?php }?>
                                </li>
								    <!-- MENÜ TİP 3 BİTŞ -->
								<?php } } }?>
									
                                <?php }?>
                            </ul>
                        </div>
                        <div class="col-md-1">
                            <div class="search-box">
                                <a href="javascript:void(0)" id="btn-search">
                                    <i class="fas fa-search"></i>
                                </a>
                            </div>
                        </div>

                    </div>


                </div>
            </div>
            <!-- HEADER-BOTTOM BİTİŞ -->

            <!-- HEADER-MOBİLE BAŞLANGIÇ -->
            <div class="header-mobile">
                <div class="container">

                    <div class="row">

                        <div class="col-4 hamburger-box">
                            <div id="sidebarCollapse" class="icon">
                                <div class="hamburger">
                                </div>
                            </div>
                        </div>
                        <div class="col-4 logo-box">
                            <a href="<?php echo $htc['anaurl'];?><?php echo $html;?>"><img class="logo" src="<?php echo tema;?>/uploads/logo/<?php echo logo;?>" alt="<?php echo firma_adi;?>"></a>
                        </div>
                        <div class="col-4">
                            <div class="search-box">
                                <a href="javascript:void(0)" id="btn-search2">
                                    <i class="fas fa-search"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- HEADER-MOBİLE BİTİŞ -->

        </section>
        <!-- HEADER BİTİŞ -->

        <!-- MOBİLE MENU BAŞLANGIÇ -->
        <nav id="mobile-menu">
            <div id="dismiss">
                <i class="fas fa-arrow-left"></i>
            </div>

            <div class="sidebar-header">
                <h3><?php echo firma_adi;?></h3>
            </div>

            <ul class="list-unstyled components">			
			<?php $MENUSorgu = $db->prepare("SELECT * FROM menu WHERE menu_durum = ? AND menu_ust = ? AND dil = ? ORDER BY menu_sira ASC");
			$MENUSorgu->execute(array("1","0",$_SESSION['k_dil']));
			$MENUislem = $MENUSorgu->fetchALL(PDO::FETCH_ASSOC);?>
			<?php foreach ( $MENUislem as $MENUSonuc ){?>
			<?php $altvarmi	= $db->query("SELECT * FROM menu WHERE menu_durum = '1' AND menu_ust = '{$MENUSonuc['id']}' ORDER BY id DESC LIMIT 1")->rowCount();?>
				<li>
				<a <?php echo($MENUSonuc['sekme'] == 1 ? 'target="_blank"' : '');?> <?php echo($altvarmi > 0 ? 'href="#'.seo($MENUSonuc['menu_isim']).'" class="drp-mobile-link"' : 'href="'.($MENUSonuc['menu_url'] == "0" ? $MENUSonuc['link'] : $MENUSonuc['menu_url'].$html).'"');?>><?php echo $MENUSonuc['menu_isim']; ?> <?php echo($altvarmi > 0 ? ' <i class="fa fa-chevron-right float-right"></i>' : '');?></a>
				<?php $ALTMENUSorgu = $db->prepare("SELECT * FROM menu WHERE menu_durum = ? AND menu_ust = ? AND dil = ? ORDER BY menu_sira ASC");
				$ALTMENUSorgu->execute(array("1",$MENUSonuc['id'],$_SESSION['k_dil']));
				$ALTMENUislem = $ALTMENUSorgu->fetchALL(PDO::FETCH_ASSOC);?>
				<?php if($ALTMENUSorgu->rowCount()){?>
					 <ul class="drp-mobile list-unstyled" id="<?php echo seo($MENUSonuc['menu_isim']); ?>">
					  <?php foreach ( $ALTMENUislem as $ALTMENUSonuc ){?>
					   <li><a <?php echo($ALTMENUSonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo($ALTMENUSonuc['menu_url'] == "0" ? $ALTMENUSonuc['link'] : $ALTMENUSonuc['menu_url'].$html); ?>"><?php echo $ALTMENUSonuc['menu_isim']; ?></a></li>
					   <?php }?>
					</ul>
					<?php }?>
				</li>
				<?php }?> 
            </ul>
        </nav>
        <!-- MOBİLE MENU BİTİŞ -->
		<?php 
		if(isset($_GET['sayfa'])){
			$s = $_GET['sayfa'];
			switch($s){
				
			case ''.$htc['anaurl'].'';
			require_once("pages/anasayfa.php");
			break;
			
			case ''.$htc['sayfaurl'].'';
			require_once("pages/sayfalar.php");
			break;
			
			case ''.$htc['projekategoriurl'].'';
			require_once("pages/proje_kategori.php");
			break;
			
			case ''.$htc['projelerurl'].'';
			require_once("pages/projeler.php");
			break;
			
			case ''.$htc['projedetayurl'].'';
			require_once("pages/proje_detay.php");
			break;
			
			case ''.$htc['haberurl'].'';
			require_once("pages/haberler.php");
			break;
			
			case ''.$htc['haberkategoriurl'].'';
			require_once("pages/haber_kategori.php");
			break;
			
			case ''.$htc['haberdetayurl'].'';
			require_once("pages/haber_detay.php");
			break;				
			
			case ''.$htc['hizmeturl'].'';
			require_once("pages/hizmetler.php");
			break;
			
			case ''.$htc['hizmetdetayurl'].'';
			require_once("pages/hizmet_detay.php");
			break;

			case ''.$htc['birimurl'].'';
			require_once("pages/birimler.php");
			break;
			
			case ''.$htc['birimdetayurl'].'';
			require_once("pages/birim_detay.php");
			break;	
						
			case ''.$htc['fotourl'].'';
			require_once("pages/foto_galeri.php");
			break;
			
			case ''.$htc['fotodetayurl'].'';
			require_once("pages/foto.php");
			break;
			
			case ''.$htc['videourl'].'';
			require_once("pages/video_galeri.php");
			break;
			
			case ''.$htc['videodetayurl'].'';
			require_once("pages/video.php");
			break;
			
			case ''.$htc['etkinlikurl'].'';
			require_once("pages/etkinlikler.php");
			break;
			
			case ''.$htc['etkinlikdetayurl'].'';
			require_once("pages/etkinlik_detay.php");
			break;
			
			case ''.$htc['duyuruurl'].'';
			require_once("pages/duyurular.php");
			break;
			
			case ''.$htc['duyurudetayurl'].'';
			require_once("pages/duyuru_detay.php");
			break;
			
			case ''.$htc['ihaleurl'].'';
			require_once("pages/ihaleler.php");
			break;
			
			case ''.$htc['ihaledetayurl'].'';
			require_once("pages/ihale_detay.php");
			break;
			
			case ''.$htc['ilanurl'].'';
			require_once("pages/ilanlar.php");
			break;
			
			case ''.$htc['ilandetayurl'].'';
			require_once("pages/ilan_detay.php");
			break;
			
			case ''.$htc['kararurl'].'';
			require_once("pages/meclis_kararlari.php");
			break;
			
			case ''.$htc['karardetayurl'].'';
			require_once("pages/meclis_kararlari_detay.php");
			break;
			
			case ''.$htc['faaliyeturl'].'';
			require_once("pages/faaliyet_raporlari.php");
			break;
			
			case ''.$htc['faaliyetdetayurl'].'';
			require_once("pages/faaliyet_raporlari_detay.php");
			break;
			
			case ''.$htc['profillerurl'].'';
			require_once("pages/profiller.php");
			break;
			
			case ''.$htc['profilkategoriurl'].'';
			require_once("pages/profil_kategori.php");
			break;
			
			case ''.$htc['profildetayurl'].'';
			require_once("pages/profil_detay.php");
			break;
			
			case ''.$htc['bagisurl'].'';
			require_once("pages/bagis.php");
			break;
			
			case ''.$htc['bagissepeturl'].'';
			require_once("pages/bagis_sepet.php");
			break;
			
			case ''.$htc['bagisodemeurl'].'';
			require_once("pages/bagis_odeme.php");
			break;
			
			case ''.$htc['bagissonucurl'].'';
			require_once("pages/bagis_sonuc.php");
			break;
			
			case ''.$htc['aidaturl'].'';
			require_once("pages/aidat.php");
			break;
			
			case ''.$htc['aidatlisteurl'].'';
			require_once("pages/aidat_listesi.php");
			break;
			
			case ''.$htc['aidatodemeurl'].'';
			require_once("pages/aidat_odeme.php");
			break;
			
			case ''.$htc['aidatsonucurl'].'';
			require_once("pages/aidat_sonuc.php");
			break;
			
			case '404';
			require_once("pages/404.php");
			break;
			
			case 'ara';
			require_once("pages/ara.php");
			break;
			
			case ''.$htc['iletisimurl'].'';
			require_once("pages/iletisim.php");
			break;
						
			default:
			require_once("pages/anasayfa.php");
			}
		}else{
		require_once("pages/anasayfa.php");
		}
		?>
        <!-- FOOTER SECTİON BAŞLANGIÇ -->
        <footer class="footer">
			<div class="footer-ust">
				<div class="container">
					<div class="footer-row row">
						<div class="footer-col col-lg-9">
							<div class="row">
							<?php $FMENUSorgu = $db->prepare("SELECT * FROM footermenu WHERE menu_durum = ? AND menu_ust = ? AND dil = ? ORDER BY menu_sira ASC");
							$FMENUSorgu->execute(array("1","0",$_SESSION['k_dil']));
							$FMENUislem = $FMENUSorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php foreach ( $FMENUislem as $FMENUSonuc ){?>
								<div class="footer-dbv7">
									<div class="footer-baslik"><?php echo $FMENUSonuc['menu_isim']; ?></div>
									<ul>
									<?php $FALTMENUSorgu = $db->prepare("SELECT * FROM footermenu WHERE menu_durum = ? AND menu_ust = ? AND dil = ? ORDER BY menu_sira ASC");
									$FALTMENUSorgu->execute(array("1",$FMENUSonuc['id'],$_SESSION['k_dil']));
									$FALTMENUislem = $FALTMENUSorgu->fetchALL(PDO::FETCH_ASSOC);?>
										<?php foreach ( $FALTMENUislem as $FALTMENUSonuc ){?>
										<li>
											<a <?php echo($FALTMENUSonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo($FALTMENUSonuc['menu_url'] == "0" ? $FALTMENUSonuc['link'] : $FALTMENUSonuc['menu_url'].$html); ?>"><?php echo $FALTMENUSonuc['menu_isim']; ?></a>
										</li>
										<?php }?>
									</ul>
								</div>
								<?php }?>
							</div>
						</div>
						<div class="footer-col footer-son col-lg-3">
							<div class="footer-logo"><a href="<?php echo $htc['anaurl'];?><?php echo $html;?>"><img src="<?php echo tema;?>/uploads/logo/footer/<?php echo footerlogo;?>" alt="Logo"></a></div>
							<div class="footer-alan">
								<div class="footerkutu align-center">									
									<div class="description">										
										<div class="text"><?=@$dil['txt4'];?></div>
										<div class="title"><?php echo telefon;?></div>
									</div>
								</div>
							</div>
							<?php if($moduller['alan22'] == "1"){?>
							<div class="mt-3 hava-kutular">								
							<?php 
							$Tarih = date('Y-m-d');
							$query = $db->query("SELECT * FROM havadurumu WHERE tarih LIKE '%{$Tarih}%' ORDER BY tarih DESC LIMIT 3", PDO::FETCH_ASSOC);
							if ( $query->rowCount() ){
							echo '<div class="mt-3 hava-kutular">';
							foreach ($query as $hava){ ?>
								<div class="hava-kutu">
									<h1><?php echo $hava['derece'];?> <img src="<?php echo $hava['img'];?>"></h1>
									<p class="gun"><?php echo $hava['gun'];?></p>
									<p><?php echo $hava['tahmin'];?></p>
								</div>
							<?php  }
							echo '</div>';
							}
							?>
							</div>
							<?php }?>
							<div class="footer-social">
								<?php if(facebook){?><a title="facebook" href="<?php echo facebook;?>"><i class="fab fa-facebook-f"></i></a><?php }?>
								<?php if(twitter){?><a title="telegram" href="<?php echo twitter;?>"><i class="fab fa-twitter"></i></a><?php }?>
								<?php if(instagram){?><a title="instagram" href="<?php echo instagram;?>"><i class="fab fa-instagram"></i></a><?php }?>
								<?php if(linkedin){?><a title="linkedin" href="<?php echo linkedin;?>"><i class="fab fa-linkedin-in"></i></a><?php }?>
								<?php if(youtube){?><a title="youtube" href="<?php echo youtube;?>"><i class="fab fa-youtube"></i></a><?php }?>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="footer-bottom">
				<div class="container footerkutu align-center justify-between">
					<div class="text copyright"><?php echo copyright;?></div>
					<a class="text design" href="" target="_blank"></a>
				</div>
			</div>
		</footer>
        <!-- FOOTER SECTİON BİTİŞ -->

    </main>
    <!-- MAİN BİTİŞ -->

    <!-- SEARCH MODAL BAŞLANGIÇ -->
    <div class="search">
        <button id="btn-search-close" class="btn btn--search-close" aria-label="Close search form"><svg class="icon icon--cross">
                <use xlink:href="#icon-cross"></use>
            </svg>
		</button>
        <form class="search__form" action="ara<?php echo $html;?>">
            <input class="search__input" name="kelime" type="search" placeholder="" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
            <span class="search__info"><?=@$dil['txt5'];?></span>
        </form>
    </div>
    <!-- SEARCH MODAL BİTİŞ -->

    <!-- UP BUTON BAŞLANGIÇ -->

    <button id="page-up"> <i class="fa fa-chevron-up"></i> </button>

    <!-- UP BUTON BİTİŞ -->

    <!-- PAGE LOADER BAŞLANGIÇ -->
	<?php if($moduller['alan19'] == "1"){?>
    <div class="loader">
        <div class="la-square-loader">
            <div></div>
        </div>
    </div>
	<?php }?>
    <!-- PAGE LOADER BİTİŞ -->


    <!-- SEARCH MODAL SVG BAŞLANGIÇ -->
    <!-- bu svg kodları arama kısmındaki icon vs için kullanıldı silmeyin -->
    <svg class="hidden">
        <defs>
            <symbol id="icon-arrow" viewBox="0 0 24 24">
                <title>arrow</title>
                <polygon points="6.3,12.8 20.9,12.8 20.9,11.2 6.3,11.2 10.2,7.2 9,6 3.1,12 9,18 10.2,16.8 " />
            </symbol>
            <symbol id="icon-drop" viewBox="0 0 24 24">
                <title>drop</title>
                <path d="M12,21c-3.6,0-6.6-3-6.6-6.6C5.4,11,10.8,4,11.4,3.2C11.6,3.1,11.8,3,12,3s0.4,0.1,0.6,0.3c0.6,0.8,6.1,7.8,6.1,11.2C18.6,18.1,15.6,21,12,21zM12,4.8c-1.8,2.4-5.2,7.4-5.2,9.6c0,2.9,2.3,5.2,5.2,5.2s5.2-2.3,5.2-5.2C17.2,12.2,13.8,7.3,12,4.8z" />
                <path d="M12,18.2c-0.4,0-0.7-0.3-0.7-0.7s0.3-0.7,0.7-0.7c1.3,0,2.4-1.1,2.4-2.4c0-0.4,0.3-0.7,0.7-0.7c0.4,0,0.7,0.3,0.7,0.7C15.8,16.5,14.1,18.2,12,18.2z" />
            </symbol>
            <symbol id="icon-search" viewBox="0 0 24 24">
                <title>search</title>
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </symbol>
            <symbol id="icon-cross" viewBox="0 0 24 24">
                <title>cross</title>
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </symbol>
        </defs>
    </svg>
    <!-- SEARCH MODAL SVG BİTİŞ -->
    <div class="overlay"></div>    
    <script src="<?php echo tema;?>/assets/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
    <script src="<?php echo tema;?>/assets/bower_components/owl.carousel/dist/owl.carousel.min.js"></script>
    <script src="<?php echo tema;?>/assets/js/jquery.mCustomScrollbar.concat.min.js"></script>
    <script src="<?php echo tema;?>/assets/bower_components/jquery.nicescroll/dist/jquery.nicescroll.min.js"></script>
    <script src="<?php echo tema;?>/assets/bower_components/plyr-master/dist/plyr.js"></script>
	<script src="<?php echo tema;?>/assets/js/fancybox.js"></script>
	<script src="<?php echo tema;?>/assets/js/iziModal.min.js"></script>
    <script src="<?php echo tema;?>/assets/js/main.js"></script>
	<script>
	$(document).on('click', '.dildegis', function () {
		var dilID = $(this).data("id");
		$.ajax({
			url: 'dildegis.php',
			dataType: 'JSON',
			data: {id: dilID},
		})
		.done(function(msg) {
			if(msg.hata){
				alert("Bir hata oluştu");
			}else{
				window.location = "index.html";
			}
		})
		.fail(function(err) {
			console.log(err);
		});
	});
	</script>
	
	<script type="text/javascript">
	$("#modal-demo").iziModal({
        title: "",
        subtitle: "",
        iconClass: '',
		background:null,
		theme:'light',
		closeButton:true,
		overlay:true,
		overlayClose:true,
		transitionInOverlay:'fadeIn',
		transitionOutOverlay:'fadeOut',
        overlayColor: 'rgba(0, 0, 0, 0.85)',
        width: 500,
        padding: 20
    });
    $(document).on('click', '.trigger-link', function (event) {
        event.preventDefault();
        $('#modal-demo').iziModal('open');
    });
	</script>
	<script>
	$(document).ready(function(){
	  $(".col-kolaymenu").click(function(){
		$(".kolay-menu > ul").toggle();
	  });
	});
	function addBasket(itemID = 0){
		if(isNaN(itemID) || itemID <= 0){
			swal({
				type: 'warning',
				title: '<?=@$dil['txt6'];?>',
				text: '<?=@$dil['txt7'];?>',
				confirmButtonText: '<?=@$dil['txt8'];?>',
				timer: 5000
			})
			return
		}
		var priceDom = $("input[data-id='"+itemID+"']");
		if($(priceDom).length == 0){
			swal({
				type: 'warning',
				title: '<?=@$dil['txt6'];?>',
				text: '<?=@$dil['txt7'];?>',
				confirmButtonText: '<?=@$dil['txt8'];?>',
				timer: 5000
			})
			return
		}
		var price = parseFloat(($(priceDom).val()).replace(",","."));
		if(isNaN(price)){
			swal({
				type: 'warning',
				title: '<?=@$dil['txt6'];?>',
				text: '<?=@$dil['txt9'];?>',
				confirmButtonText: '<?=@$dil['txt8'];?>',
				timer: 5000
			})
			return
		}
		if(price <= 0.99){
			swal({
				type: 'warning',
				title: '<?=@$dil['txt6'];?>',
				text: '<?=@$dil['txt10'];?>',
				confirmButtonText: '<?=@$dil['txt8'];?>',
				timer: 5000
			})
			return
		}
		$.ajax({
			url: 'sepete-ekle.php',
			type: 'POST',
			dataType: 'json',
			data: {id: itemID,price: price},
		})
		.done(function(msg) {
			basketReload();			
		})
		.fail(function(err) {
			basketReload();
			swal({
				type: 'success',
				title: '<?=@$dil['txt11'];?>',
				text: '<?=@$dil['txt12'];?>',
				confirmButtonText: '<?=@$dil['txt8'];?>',
				timer: 5000
			})
		});
	}

	function basketReload(){
		var domCheck = $("div[name='sepetdiv']");
		if($(domCheck).length == 0) return
		$.ajax({
			url: 'sepete-ekle.php',
			dataType: 'html',
		})
		.done(function(html) {
			$(domCheck).html(html);
		})
		.fail(function() {
			console.log("error");
		});
	}

	$(document).on('click', '[data-sil]', function(event) {
		event.preventDefault();
		var sesID = $(this).data('sil');
		$.ajax({
			url: 'sepete-ekle.php',
			type: 'POST',
			dataType: 'json',
			data: {sil: sesID},
		})
		.always(function() {
			var domCheck = $("div[name='sepetdiv']");
			if($(domCheck).length == 0){
				window.location.reload()
			}else{
				basketReload();
			}
		});
		
	});

	$(document).ready(function() {
		basketReload();
	});
	
	function imgError(image) {
		image.onerror = "";
		image.src = "<?php echo tema;?>/assets/images/no-image.png";
		return true;
	}
	$(document).ready(function() {
		$(window).scroll(function() {
			$('.lazy').each(function() {
				if ($(this).offset().top < ($(window).scrollTop() + $(window).height() + 100)) {
					$(this).attr('src', $(this).attr('data-src'));
				}
			});
		});
	});
	</script>
	<?php 
	site_mesaj("mesajbtn",1,"yes",@$dil['txt11'],@$dil['txt13'],@$dil['txt8']);
	site_mesaj("mesajbtn",2,"no",@$dil['txt14'],@$dil['txt15'],@$dil['txt8']);
	site_mesaj("mesajbtn",3,"bos",@$dil['txt16'],@$dil['txt17'],@$dil['txt8']);
	site_mesaj("sitedemo",3,"no",@$dil['txt6'],@$dil['txt18'],@$dil['txt8']);
	?>
</body>

</html>