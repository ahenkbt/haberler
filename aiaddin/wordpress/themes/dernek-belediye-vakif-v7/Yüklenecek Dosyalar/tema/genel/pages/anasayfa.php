<script src="//cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js"></script>
<script type="text/javascript">
	$(document).ready(function() {
		var my_cookie = $.cookie($('.modal-check').attr('name'));
		if (my_cookie && my_cookie == "true") {
			$(this).prop('checked', my_cookie);
			console.log('checked checkbox');
		} else {
			$('#actionsModal').modal('show');
			console.log('uncheck checkbox');
		}
		$(".modal-check").change(function() {
			$.cookie($(this).attr("name"), $(this).prop('checked'), {
				path: '/',
				expires: 1
			});
		});
	});
</script>
<?php if($popup['durum'] == 1){?>
<!-- Modal -->
<div class="modal fade" id="actionsModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body p-1">
				<div class="row">
					<div class="col-md-12 text-center">
						<a href="<?php echo $popup['url']?>" <?php echo($popup['sekme'] == 1 ? 'target="_blank"' : '');?> title="<?php echo $popup['adi']?>">
							<img src="<?php echo tema;?>/uploads/popup/<?php echo $popup['resim']?>" class="img-responsive" alt="<?php echo $popup['adi']?>" title="<?php echo $popup['adi']?>" style="margin: 0 auto;">
						</a>
					</div>
				</div>
			</div>
			<div class="modal-footer">
				<div class="checkbox pull-right">
					<label>
						<input class="modal-check" name="modal-check" type="checkbox"> <?=@$dil['txt55'];?>
					</label>
				</div>
			</div>
        </div>
    </div>
</div>
<?php }?>

<!-- SLİDER BAŞLANGIÇ -->
<section class="position-relative">
	<div id="carouselExampleControls" class="carousel slide" data-ride="carousel">
		<div class="carousel-inner">
		<?php $Sorgu = $db->prepare("SELECT * FROM slider WHERE durum = ? AND dil = ? ORDER BY sira ASC");
		$Sorgu->execute(array("1",$_SESSION['k_dil']));
		$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);
		$say = 1;?>
			<?php foreach ( $islem as $Sonuc ){?>
			<div class="carousel-item <?php echo($say++ == 1 ? 'active' : '');?> ustslider" >
				<div class="slider-overlay"></div>
				<img src="<?php echo tema;?>/uploads/slider/<?php echo $Sonuc['resim']?>" class="d-block w-100">
				<?php if($moduller['alan1'] == "1"){?>
				<div class="slider-text z-index-9">
					<h3 class="slide-title z-index-9">
						<?php echo $Sonuc['adi']?>
					</h3>
					<?php if($Sonuc['aciklama']){?><div class="text"><?php echo $Sonuc['aciklama']?></div><?php }?>
					<?php if($Sonuc['url']){?>
					<div class="buttons-container">
						<a class="button-border" <?php echo($Sonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo $Sonuc['url'];?>"><?=@$dil['txt56'];?> <i class="far fa-arrow-right ml-2"></i></a>
					</div>
					<?php }?>
				</div>
				<?php }?>				
			</div>
			<?php }?>
		</div>
		<a class="carousel-control-prev" href="#carouselExampleControls" role="button" data-slide="prev">
			<i class="fal fa-chevron-left fa-3x"></i>
			<span class="sr-only"><?=@$dil['txt57'];?></span>
		</a>
		<a class="carousel-control-next" href="#carouselExampleControls" role="button" data-slide="next">
			<i class="fal fa-chevron-right fa-3x"></i>
			<span class="sr-only"><?=@$dil['txt58'];?></span>
		</a>
		<div class="header-down"></div>
	</div>
	<?php if($moduller['alan2'] == "1"){?>
	<div class="container slide-menu z-index-9">
		<div class="row">
		<?php $Sorgu = $db->prepare("SELECT * FROM ortamenu WHERE menu_durum = ? AND dil = ? ORDER BY menu_sira ASC");
		$Sorgu->execute(array("1",$_SESSION['k_dil']));
		$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
			<?php foreach ( $islem as $Sonuc ){?>
			<div class="col-lg col-md-4 col-6 bg-blue-1 ortamenu" style="background:<?php echo $Sonuc['menu_renk'];?>e8">
				<a <?php echo($Sonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo($Sonuc['menu_url'] == "0" ? $Sonuc['link'] : $Sonuc['menu_url']); ?>">
					<div class="row">
						<div class="col-3 flex-center">
							<i class="<?php echo $Sonuc['menu_icon']?>"></i>
						</div>
						<div class="col-9 flex-center">
							<div>
								<h6><?php echo $Sonuc['menu_isim']?></h6>
								<p><?php echo $Sonuc['menu_kisa']?></p>
							</div>
						</div>

					</div>
				</a>
			</div>
			<?php }?>
		</div>
	</div>
	<?php }?>

</section>
<!-- SLİDER BİTİŞ -->

<!-- HABERLER BAŞLANGIÇ -->
<?php if($moduller['alan3'] == "1" || $moduller['alan4'] == "1" ){?>
<section class="main" role="main">
	<div class="container-fluid">
		<div class="row haber-section">

			<!-- HABER SLİDER BAŞLANGIÇ -->
			<?php if($moduller['alan3'] == "1"){?>
			<div class="col-lg-<?php echo($moduller['alan4'] == "1" ? '6' : '12');?> p-0">
				<div id="haberSlide" class="carousel slide" data-ride="carousel">
					<div class="carousel-inner">
					<?php $Sorgu = $db->prepare("SELECT * FROM haberler WHERE durum = ? AND manset = ? AND dil = ? ORDER BY sira ASC LIMIT ".$limitayar['limit_sayfaslider_haber']);
					$Sorgu->execute(array("1","1",$_SESSION['k_dil']));
					$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);
					$mansetsay = 1;?>
						<?php foreach ( $islem as $Sonuc ){?>
						<div class="carousel-item <?php echo($mansetsay++ == 1 ? 'active' : '');?>">
							<a href="<?php echo $htc['haberdetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
								<img src="" data-src="<?php echo tema;?>/uploads/haberler/<?php echo $Sonuc['resim']; ?>" class="d-block w-100 lazy">
								<div class="slide-overlay"></div>

								<div class="content col-10 mx-auto">
									<h3 class="font-weight-bold"><?php echo $Sonuc['adi'];?></h3>
									<p class="context">
										<?php echo $Sonuc['spot'];?>
									</p>
									<p class="text-right"><?php echo tarih2($Sonuc['tarih']);?></p>
								</div>
							</a>
						</div>
						<?php }?>
					</div>
					<a class="carousel-control-prev" href="#haberSlide" role="button" data-slide="prev">
						<i class="fal fa-chevron-left fa-2x"></i>
						<span class="sr-only"><?=@$dil['txt57'];?></span>
					</a>
					<a class="carousel-control-next" href="#haberSlide" role="button" data-slide="next">
						<i class="fal fa-chevron-right fa-2x"></i>
						<span class="sr-only"><?=@$dil['txt58'];?></span>
					</a>
					<ol class="carousel-indicators">
					<?php $Sorgu = $db->prepare("SELECT * FROM haberler WHERE durum = ? AND manset = ? AND dil = ? ORDER BY sira ASC LIMIT ".$limitayar['limit_sayfaslider_haber']);
					$Sorgu->execute(array("1","1",$_SESSION['k_dil']));
					$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);
					$mansetsayy = 1;$manset_say = 0;$manset_sayy = 1;?>
						<?php foreach ( $islem as $Sonuc ){?>
						<li data-target="#haberSlide" data-slide-to="<?php echo $manset_say++;?>" <?php echo($mansetsayy++ == 1 ? 'class="active"' : '');?>><?php echo $manset_sayy++;?></li>
						<?php }?>
					</ol>

				</div>
			</div>
			<?php }?>
			<!-- HABER SLİDER BİTİŞ -->

			<!-- DİĞER HABERLER BAŞLANGIÇ -->
			<?php if($moduller['alan4'] == "1"){?>
			<div class="col-lg-<?php echo($moduller['alan3'] == "1" ? '6' : '12');?> diger-haberler position-relative">
				<div class="row">
				<?php $Sorgu = $db->prepare("SELECT * FROM haberler WHERE durum = ? AND manset_yani = ? AND dil = ? ORDER BY sira ASC LIMIT ".$limitayar['limit_sayfaanasayfa_haber']);
				$Sorgu->execute(array("1","1",$_SESSION['k_dil']));
				$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
					<?php foreach ( $islem as $Sonuc ){?>
					<div class="col-6 col-md-<?php echo $limitayar['limit_anasayfa_haber'];?> col-lg-<?php echo $limitayar['limit_anasayfa_haber'];?> p-0">
						<a href="<?php echo $htc['haberdetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
							<div class="slide-overlay"></div>
							<img src="" data-src="<?php echo tema;?>/uploads/haberler/<?php echo $Sonuc['resim']; ?>" class="lazy">
							<div class="content">
								<p><?php echo tarih2($Sonuc['tarih']);?></p>
								<h3><?php echo $Sonuc['adi'];?></h3>
							</div>
						</a>
					</div>
					<?php }?>
				</div>

				<div class="haber-nav">
					<ul>
					<?php $Sorgu = $db->prepare("SELECT * FROM haber_kategori WHERE durum = ? AND dil = ? ORDER BY id ASC");
					$Sorgu->execute(array("1",$_SESSION['k_dil']));
					$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
						<?php foreach ( $islem as $Sonuc ){?>
						<li><a href="<?php echo $htc['haberkategoriurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>"><?php echo ilkbuyuk($Sonuc['adi']);?></a></li>
						<?php }?>
						<li><a href="<?php echo $htc['haberurl']; ?><?php echo $html;?>"><?=@$dil['txt59'];?></a></li>
					</ul>
				</div>
			</div>
			<?php }?>
			<!-- DİĞER HABERLER BİTİŞ -->
		</div>
	</div>
</section>
<?php }?>
<!-- HABERLER BİTİŞ -->

<!-- ETKİNLİK BAŞLANGIÇ -->
<?php if($moduller['alan5'] == "1" || $moduller['alan6'] == "1" || $moduller['alan7'] == "1" || $moduller['alan16'] == "1" || $moduller['alan10'] == "1"  ){?>
<section class="position-relative mt-4 cover-1 bg-cover" >
	<div class="container-fluid px-lg-3">
		<div class="row etkinlik-section">
		
			<!-- GÜNCEL DUYURULAR- GÜNCEL İHALELER - GÜNCEL İLANLAR TAB KISMI BAŞLANGIÇ -->
			<?php if($moduller['alan5'] == "1" || $moduller['alan6'] == "1" || $moduller['alan7'] == "1"){?>
			<div class="col-lg-4">
				<div class="tab-component">
					<div class="tab-head">
						<div class="row m-0">
							<?php if($moduller['alan5'] == "1"){?>
							<div datatarget="#guncel-duyurular" class="tab-link pl-0 active"><?=@$dil['txt60'];?></div>
							<?php }?>
							<?php if($moduller['alan6'] == "1"){?>
							<div datatarget="#guncel-ihaleler" class="tab-link <?php echo($moduller['alan5'] == "0" ? 'active' : '');?>"><?=@$dil['txt61'];?></div>
							<?php }?>
							<?php if($moduller['alan7'] == "1"){?>
							<div datatarget="#guncel-ilanlar" class="tab-link <?php echo($moduller['alan6'] == "0" ? 'active' : '');?> pr-0"><?=@$dil['txt62'];?></div>
							<?php }?>
						</div>
					</div>
					<div class="tab-body">
						<div class="row m-0">
							<?php if($moduller['alan5'] == "1"){?>
							<div id="guncel-duyurular" class="tab-panel active">
								<div class="do-nicescroll3 active">
								<?php $Sorgu = $db->prepare("SELECT * FROM duyurular WHERE durum = ? AND anasayfa = ? AND dil = ? ORDER BY id DESC");
								$Sorgu->execute(array("1","1",$_SESSION['k_dil']));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
									<?php foreach ( $islem as $Sonuc ){?>
									<div class="etkinlik-list-box">
										<a href="<?php echo $htc['duyurudetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
											<p><?php echo $Sonuc['adi'];?></p>
											<p><?php echo tarih2($Sonuc['tarih']);?></p>
										</a>
									</div>
									<?php }?>
								</div>
								<a class="tab-tum-buton hover-bar" href="<?php echo $htc['duyuruurl']; ?><?php echo $html;?>"><?=@$dil['txt63'];?> <i class="far fa-arrow-right ml-1"></i></a>
							</div>
							<?php }?>
							<?php if($moduller['alan6'] == "1"){?>
							<div id="guncel-ihaleler" class="tab-panel <?php echo($moduller['alan5'] == "0" ? 'active' : '');?>">
								<div class="do-nicescroll3 <?php echo($moduller['alan5'] == "0" ? 'active' : '');?>">
								<?php $Sorgu = $db->prepare("SELECT * FROM ihaleler WHERE durum = ? AND anasayfa = ? AND dil = ? ORDER BY id DESC");
								$Sorgu->execute(array("1","1",$_SESSION['k_dil']));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
									<?php foreach ( $islem as $Sonuc ){?>
									<div class="etkinlik-list-box">
										<a href="<?php echo $htc['ihaledetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
											<p><?php echo $Sonuc['adi'];?></p>
											<p><?php echo tarih2($Sonuc['baslama_tarih']." ".$Sonuc['baslatma_saat']);?></p>
										</a>
									</div>
									<?php }?>
								</div>
								<a class="tab-tum-buton hover-bar" href="<?php echo $htc['ihaleurl']; ?><?php echo $html;?>"><?=@$dil['txt64'];?> <i class="far fa-arrow-right ml-1"></i></a>
							</div>
							<?php }?>
							<?php if($moduller['alan7'] == "1"){?>
							<div id="guncel-ilanlar" class="tab-panel <?php echo($moduller['alan6'] == "0" ? 'active' : '');?>">
								<div class="do-nicescroll3 <?php echo($moduller['alan6'] == "0" ? 'active' : '');?>">
								<?php $Sorgu = $db->prepare("SELECT * FROM ilanlar WHERE durum = ? AND anasayfa = ? AND dil = ? ORDER BY id DESC");
								$Sorgu->execute(array("1","1",$_SESSION['k_dil']));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
									<?php foreach ( $islem as $Sonuc ){?>
									<div class="etkinlik-list-box">
										<a href="<?php echo $htc['ilandetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
											<p><?php echo $Sonuc['adi'];?></p>
											<p><?php echo tarih($Sonuc['tarih']);?></p>
										</a>
									</div>
									<?php }?>
								</div>
								<a class="tab-tum-buton hover-bar" href="<?php echo $htc['ilanurl']; ?><?php echo $html;?>"><?=@$dil['txt65'];?> <i class="far fa-arrow-right ml-1"></i></a>
							</div>
							<?php }?>
						</div>
					</div>
				</div>
			</div>
			<?php }?>
			<!-- GÜNCEL DUYURULAR- GÜNCEL İHALELER - GÜNCEL İLANLAR TAB KISMI BİTİŞ -->
			
			<!-- ETKİNLİK BAŞLANGIÇ -->
			<?php if($moduller['alan16'] == "1"){?>
			<div class="col-lg-<?php if($moduller['alan5'] == "1" || $moduller['alan6'] == "1" || $moduller['alan7'] == "1"){?>4<?php }else{?>6<?php }?> mt-5 mt-lg-0">
				<div class="etkinlik-kutucuk">
					<div class="row">
						<div class="col-12">
							<h5><?=@$dil['txt66'];?></h5>
							<a class="tab-tum-buton hover-bar m-0" href="<?php echo $htc['etkinlikurl']; ?><?php echo $html;?>"><?=@$dil['txt67'];?> </a>
						</div>
					</div>
					<?php $Sorgu = $db->prepare("SELECT * FROM etkinlikler WHERE durum = ? AND bitis_tarih > ? AND dil = ? ORDER BY bitis_tarih ASC LIMIT 1");
					$Sorgu->execute(array("1",strtotime(date("d-m-Y H:i")),$_SESSION['k_dil']));
					$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
					<?php foreach ( $islem as $Sonuc ){?>
					<?php $tarihler = explode(" ",unixtarih($Sonuc['baslama_tarih'])); ?>
					<div class="row mt-3">
						<div class="col-12 col-lg-5 col-xxl-4 pl-0">
							<img src="<?php echo tema;?>/uploads/etkinlikler/<?php echo $Sonuc['resim']; ?>" onerror="imgError(this);" alt="<?php echo $Sonuc['adi'];?>">
						</div>
						<div class="col-12 col-lg-7 col-xxl-8 p-0 etkinlik-detay-kutu">						
							<div class="w-100">
								<h5 class="g-title" style="font-size: 15px;"> <?php echo $Sonuc['adi'];?></h5>
								<ul>
									<li>
										<a href="javascript:void(0)">
											<span><i class="fa fa-calendar-alt"></i></span>
											<span class="text-side"><?php echo $tarihler[0];?></span>
										</a>
									</li>
									<li>
										<a href="javascript:void(0)">
											<span><i class="fa fa-clock"></i></span>
											<span class="text-side"><?php echo $tarihler[1];?></span>
										</a>
									</li>
									<li>
										<a href="javascript:void(0)">
											<span><i class="fas fa-map-marker-alt"></i></span>
											<span class="text-side"><?php echo kisa(strip_tags($Sonuc['yer']),25);?></span>
										</a>
									</li>
									<li>
										<a href="<?php echo $htc['etkinlikdetayurl']; ?>/<?php echo $Sonuc['seo'];?><?php echo $html;?>">
											<span><i class="fa fa-share"></i></span>
											<span class="text-side"><?=@$dil['txt68'];?></span>
										</a>
									</li>
								</ul>
							</div>							
						</div>
					</div>
					<?php }?>
					<div class="row mt-4">
						<div class="col-12 p-0">
							<h5 class="g-title" style="font-size: 15px;"> <?=@$dil['txt69'];?></h5>
							<?php $Sorgu = $db->prepare("SELECT * FROM etkinlikler WHERE durum = ? AND bitis_tarih < ? AND dil = ? ORDER BY bitis_tarih DESC LIMIT 2");
							$Sorgu->execute(array("1",strtotime(date("d-m-Y H:i")),$_SESSION['k_dil']));
							$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
							<?php foreach ( $islem as $Sonuc ){?>
							<div class="gecmis-etkinlik-box">
								<a href="<?php echo $htc['etkinlikdetayurl']; ?>/<?php echo $Sonuc['seo'];?><?php echo $html;?>">
									<span><i class="fa fa-calendar-alt"></i></span>
									<span>
										<div class="baslik"><?php echo $Sonuc['adi'];?></div>
										<div class="tarih"><?php echo unixtarih($Sonuc['baslama_tarih']);?></div>
									</span>
								</a>
							</div>
							<?php }?>
						</div>
					</div>

				</div>
			</div>
			<?php }?>
			<!-- ETKİNLİK BİTİŞ -->
			
			<!-- BAŞKANLA FOTOĞRAFLAR BAŞLANGIÇ -->
			<?php if($moduller['alan10'] == "1"){?>
			<div class="col-lg-4 mt-5 mt-lg-0">
			<?php $GALERISorgu = $db->prepare("SELECT * FROM foto_galeri WHERE durum = ? AND baskan = ? AND dil = ? ORDER BY sira ASC");
			$GALERISorgu->execute(array("1","1",$_SESSION['k_dil']));
			$GALERIislem = $GALERISorgu->fetchALL(PDO::FETCH_ASSOC);?>
				<?php foreach ( $GALERIislem as $GALERISonuc ){?>	
				<div class="custom-owl-nav etkinlik-nav"></div>
				<div class="row etkinlik-slider-content">
					<h3 class="g-title"><?php echo $GALERISonuc['adi']?></h3>
					<a class="etkinlik-foto-buton" href="<?php echo $htc['fotodetayurl']; ?>/<?php echo $GALERISonuc['seo']; ?><?php echo $html;?>"><?=@$dil['txt59'];?></a>
				</div>
				<div class="owl-carousel owl-carousel-etkinlik">
				<?php $Sorgu = $db->prepare("SELECT * FROM fotograflar WHERE resimid = ? ORDER BY id DESC");
				$Sorgu->execute(array($GALERISonuc['id']));
				$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
					<?php foreach ( $islem as $Sonuc ){?>
					<div class="item">
						<div class="row">
							<div class="col-12 position-relative">
								<img class="lazy" src="" data-src="<?php echo tema;?>/uploads/fotogaleri/diger/<?php echo $Sonuc['resim']; ?>" alt="<?php echo $GALERISonuc['adi']?>">
								<div class="slide-overlay"></div>
							</div>
						</div>
					</div>
					<?php }?>
				</div>
				<?php }?>
			</div>
			<?php }?>
			<!-- BAŞKANLA FOTOĞRAFLAR BİTİŞ -->
		</div>
	</div>
</section>
<?php }?>
<!-- ETKİNLİK BİTİŞ -->

<!-- HIZLI MENÜ BAŞLANGIÇ -->
<?php if($moduller['alan11'] == "1"){?>
<section class="hizli-menu my-5">
	<div class="container-fluid">
		<div class="row">
			<div class="col-12">
				<div class="custom-owl-nav hizlimenu-nav"></div>
				<div class="owl-carousel owl-carousel-hizlimenu">
				<?php $Sorgu = $db->prepare("SELECT * FROM slidermenu WHERE menu_durum = ? AND dil = ? ORDER BY menu_sira ASC");
				$Sorgu->execute(array("1",$_SESSION['k_dil']));
				$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
					<?php foreach ( $islem as $Sonuc ){?>	
					<div class="item">
						<div class="hizli-menu-box">
							<a <?php echo($Sonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo($Sonuc['menu_url'] == "0" ? $Sonuc['link'] : $Sonuc['menu_url']); ?>" style="background:<?php echo $Sonuc['menu_renk'];?>">
								<div class="hizli-icon">
									<i class="<?php echo $Sonuc['menu_icon'];?>"></i>
								</div>
								<p><?php echo $Sonuc['menu_isim'];?></p>
								<p><?php echo $Sonuc['menu_kisa'];?></p>
							</a>
							<a <?php echo($Sonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo($Sonuc['menu_url'] == "0" ? $Sonuc['link'] : $Sonuc['menu_url']); ?>" class="hizli-back" style="background:<?php echo $Sonuc['menu_renk'];?>e8">
								<span> <?=@$dil['txt70'];?></span>
							</a>
						</div>
					</div>
					<?php }?>
				</div>
			</div>
		</div>

	</div>
</section>
<?php }?>
<!-- HIZLI MENÜ BİTİŞ -->

<!-- BAŞKAN HAKKINDA BAŞLANGIÇ -->
<?php if($moduller['alan12'] == "1"){?>
<section class="baskan-section" style="background: url('<?php echo tema;?>/uploads/arkaplan/arkaplan2/<?php echo $arkaplan['arkaplan2'];?>');">
	<div class="container">
		<div class="row mb-5 mb-md-0">
			<div class="col-md-4">
				<img class="lazy" src="" data-src="<?php echo tema;?>/uploads/baskan/<?php echo $baskan['gorsel']; ?>">
			</div>
			<div class="col-md-8 sag">
				<div class="text-side">
					<h3 class="g-title"><?php echo $baskan['adi'];?></h3>
					<p><?php echo $baskan['slogan'];?></p>
				</div>

			</div>
		</div>
		<div class="social text-center">
			<?php if($baskan['facebook']){?><a title="facebook" href="<?php echo $baskan['facebook'];?>"><i class="fab fa-facebook-f"></i></a><?php }?>
			<?php if($baskan['twitter']){?><a title="telegram" href="<?php echo $baskan['twitter'];?>"><i class="fab fa-twitter"></i></a><?php }?>
			<?php if($baskan['instagram']){?><a title="instagram" href="<?php echo $baskan['instagram'];?>"><i class="fab fa-instagram"></i></a><?php }?>
			<?php if($baskan['linkedin']){?><a title="linkedin" href="<?php echo $baskan['linkedin'];?>"><i class="fab fa-linkedin-in"></i></a><?php }?>
			<?php if($baskan['youtube']){?><a title="youtube" href="<?php echo $baskan['youtube'];?>"><i class="fab fa-youtube"></i></a><?php }?>
		</div>
	</div>
</section>
<?php }?>
<!-- BAŞKAN HAKKINDA BİTİŞ -->

<!-- PROJELER BAŞLANGIÇ -->
<?php if($moduller['alan13'] == "1"){?>
<section class="projeler-section">
	<div class="container-fluid">
		<div class="row">
			<div class="col-12 mt-4">
				<h3 class="g-title text-center"><?=@$dil['txt71'];?></h3>
			</div>
			<div class="col-12">
				<div class="custom-owl-nav projeler-nav"></div>
				<div class="owl-carousel owl-carousel-proje">
				<?php $Sorgu = $db->prepare("SELECT * FROM projeler WHERE durum = ? AND dil = ? ORDER BY sira ASC");
				$Sorgu->execute(array("1",$_SESSION['k_dil']));
				$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
					<?php foreach ( $islem as $Sonuc ){?>
					<div class="item">
						<div class="row proje-slider">
							<div class="col-md-12">
								<div class="row">
									<div class="col-md-6 p-0">
										<a href="<?php echo $htc['projedetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
											<img class="lazy" src="" data-src="<?php echo tema;?>/uploads/projeler/<?php echo $Sonuc['kapak']; ?>">
										</a>
									</div>
									<div class="col-md-6 pl-0 content">
										<div class="pl-4">
											<h4 class="g-title"><a href="<?php echo $htc['projedetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>"><?php echo $Sonuc['adi'];?></a></h4>
											<p style="font-weight: 300;"><?php echo $Sonuc['spot'];?></p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<?php }?>
				</div>

			</div>
		</div>
		<div class="row">
			<div class="col-12 tumunu-gor">
				<a href="<?php echo $htc['projelerurl']; ?><?php echo $html;?>"><?=@$dil['txt72'];?></a>
			</div>
		</div>
	</div>
</section>
<?php }?>
<!-- PROJELER BİTİŞ -->


<!-- VİDEO GALERİ BAŞLANGIÇ -->
<?php if($moduller['alan14'] == "1"){?>
<section class="fotogaleri-section position-relative">
	<img class="bg-festival lazy" src="" data-src="<?php echo tema;?>/uploads/arkaplan/arkaplan3/<?php echo $arkaplan['arkaplan3'];?>">
	<div class="container">
		<div class="row">
			<!-- VİDEO GALERİ YAZI BAŞLANGIÇ -->
			<div class="col-xl-3 text-xl-left text-lg-center z-index-9">
				<div class="gallery-description" style="background: #7d9e74e8;">
					<div class="title"><?=@$dil['txt73'];?></div>
					<div class="text"><?=@$dil['txt74'];?></div>
					<div class="buttons-container">
						<a class="button-border light" href="<?php echo $htc['videourl']; ?><?php echo $html;?>"><?=@$dil['txt75'];?> <span class="icon"><i class="fal fa-arrow-right"></i></span></a>
					</div>
				</div>
			</div>
			<!-- VİDEO GALERİ YAZI BİTİŞ -->
			<!-- VİDEO GALERİ SLİDER BAŞLANGIÇ -->
			<div class="col-xl-9">
				<div class="row position-relative">
					<div class="custom-owl-nav videogaleri-nav"></div>
					<div class="owl-carousel owl-carousel-videogaleri gallery list">
					<?php $Sorgu = $db->prepare("SELECT * FROM video_galeri WHERE durum = ? AND dil = ? ORDER BY id DESC");
					$Sorgu->execute(array("1",$_SESSION['k_dil']));
					$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
						<?php foreach ( $islem as $Sonuc ){?>	
						<div class="col-12">
							<div class="hover-effect position-relative">
								<a href="<?php echo $htc['videodetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
									<div class="gallery-cover-kapak">
										<img class="lazy" src="" data-src="<?php echo tema;?>/uploads/videogaleri/kapak/<?php echo $Sonuc['resim']; ?>">
									</div>
									<div class="gallery-body">
										<span class="icon"><i class="fab fa-youtube"></i></span>
										<div class="title"><?php echo $Sonuc['adi'];?></div>
										<div class="date"><span class="icon"><i class="far fa-calendar-alt"></i></span> <?php echo tarih($Sonuc['tarih']);?></div>
									</div>
								</a>
							</div>
						</div>
						<?php }?>
					</div>
				</div>
			</div>
			<!-- VİDEO GALERİ SLİDER BİTİŞ -->			
		</div>
	</div>
</section>
<?php }?>
<!-- VİDEO GALERİ BİTİŞ -->

<!-- FOTO GALERİ BAŞLANGIÇ -->
<?php if($moduller['alan15'] == "1"){?>
<section class="fotogaleri-section position-relative">
	<img class="bg-festival lazy" src="" data-src="<?php echo tema;?>/uploads/arkaplan/arkaplan4/<?php echo $arkaplan['arkaplan4'];?>">

	<div class="container">
		<div class="row">
			<!-- FOTO GALERİ SLİDER BAŞLANGIÇ -->
			<div class="col-xl-9">
				<div class="row position-relative">
					<div class="custom-owl-nav fotogaleri-nav"></div>
					<div class="owl-carousel owl-carousel-fotogaleri">
					<?php $Sorgu = $db->prepare("SELECT * FROM foto_galeri WHERE durum = ? AND dil = ? ORDER BY sira ASC");
					$Sorgu->execute(array("1",$_SESSION['k_dil']));
					$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
						<?php foreach ( $islem as $Sonuc ){?>	
						<div class="col-12">
							<div class="hover-effect position-relative">
								<a href="<?php echo $htc['fotodetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
									<div class="gallery-cover-kapak">
										<img class="lazy" src="" data-src="<?php echo tema;?>/uploads/fotogaleri/kapak/<?php echo $Sonuc['kapak']; ?>">
									</div>
									<div class="gallery-body">
										<span class="icon"><i class="far fa-image"></i></span>
										<div class="title"><?php echo $Sonuc['adi'];?></div>
										<div class="date"><span class="icon"><i class="far fa-calendar-alt"></i></span> <?php echo tarih($Sonuc['tarih']);?></div>
									</div>
								</a>
							</div>
						</div>
						<?php }?>
					</div>
				</div>
			</div>
			<!-- FOTO GALERİ SLİDER BİTİŞ -->
			<!-- FOTO GALERİ YAZI BAŞLANGIÇ -->
			<div class="col-xl-3 text-xl-right text-lg-center">
				<div class="gallery-description" style="background: #204f65e8;">
					<div class="title"><?=@$dil['txt76'];?></div>
					<div class="text"><?=@$dil['txt77'];?></div>
					<div class="buttons-container">
						<a class="button-border light" href="<?php echo $htc['fotourl']; ?><?php echo $html;?>"><?=@$dil['txt78'];?> <span class="icon"><i class="fal fa-arrow-right"></i></span></a>
					</div>
				</div>
			</div>
			<!-- FOTO GALERİ YAZI BİTİŞ -->
		</div>
	</div>
</section>
<?php }?>
<!-- FOTO GALERİ BİTİŞ -->

<!-- İLETİSİM BAŞLANGIÇ -->
<?php if($moduller['alan17'] == "1"){?>
<section class="section bg-cover cover-2 md-hidden">
    <div class="contact-us">
        <div class="row no-gutters">
            <div class="col-md-6">
                <div class="contact-us-content left">
                    <div class="small-title"><?=@$dil['txt79'];?></div>
                    <div class="title"><?=@$dil['txt80'];?></div>
                    <div class="text"><?=@$dil['txt81'];?></div>
                    <div class="contact-us-list">
                        <ul>
                            <li>
                                <a href="tel:<?php echo telefon;?>">
                                    <span class="icon"><i class="fas fa-phone-volume"></i></span>
                                    <span class="text"><?php echo telefon;?></span>
                                </a>
                            </li>
							<li>
                                <a href="javascript:void(0)">
                                    <span class="icon"><i class="fas fa-fax"></i></span>
                                    <span class="text"><?php echo fax;?></span>
                                </a>
                            </li>
                            <li>
                                <a href="mailto:<?php echo email;?>">
                                    <span class="icon"><i class="fas fa-envelope-open-text"></i></span>
                                    <span class="text"><?php echo email;?></span>
                                </a>
                            </li>
                            <li>
                                <a href="javascript:void(0)">
                                    <span class="icon"><i class="fas fa-map-marker-alt"></i></span>
                                    <span class="text"><?php echo adres;?></span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="contact-us-bg">
                    <div class="contact-us-content right">
                        <div class="form-custom form-contact-us l-relative">
                            <form class="m-0" action="_class/site_islem.php" method="post">
                                <ul class="row">
                                    <li class="col-12">
                                        <span class="icon"><i class="far fa-user"></i></span>
                                        <input type="text" name="isim" placeholder="<?=@$dil['txt82'];?>">
                                    </li>
                                    <li class="col-12 col-md-6">
                                        <span class="icon"><i class="far fa-envelope"></i></span>
                                        <input type="text" name="email" placeholder="<?=@$dil['txt83'];?>" data-form-email="">
                                    </li>
									<li class="col-12 col-md-6">
                                        <span class="icon"><i class="fal fa-phone"></i></span>
                                        <input type="text" name="telefon" placeholder="<?=@$dil['txt84'];?>">
                                    </li>
									<li class="col-12">
                                        <span class="icon"><i class="fal fa-envelope-open-text"></i></span>
                                        <input type="text" name="konu" placeholder="<?=@$dil['txt85'];?>">
                                    </li>
                                    <li class="col-12">
                                        <textarea name="mesaj" placeholder="<?=@$dil['txt86'];?>"></textarea>
                                    </li>
                                    <div class="send">
										<input type="hidden" name="kontrol" value="" id="kontrol">	
										<input type="hidden" name="iletisimurl" value="<?php echo $sayfalink;?>" />
                                        <input type="submit" name="mesajbtn" value="<?=@$dil['txt87'];?>" class="form-button iletisim-page mt-0">
                                    </div>
                                </ul>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
<?php }?>
<!-- İLETİSİM BİTİŞ -->

<!-- HARİTA SECTİON BAŞLANGIÇ -->
<?php if($moduller['alan18'] == "1"){?>
<section class="harita-section pt-0">
	<?php echo maps;?>
</section>
<?php }?>
<!-- HARİTA SECTİON BİTİŞ -->