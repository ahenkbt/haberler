<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php 
$bulundu = false;
if($_GET['kelime'] != ""){
	$kelime = trim(htmlspecialchars($_GET['kelime']));
}?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan20/<?php echo $arkaplan['arkaplan20'];?>" alt="<?=@$dil['txt88'];?>">
			<div class="slide-overlay"></div>
		</div>
		<div class="container banner-fix">
			<div class="row">
				<div class="col-lg-12 z-index-9">
					<ol class="breadcrumb">
						<li><a href="<?php echo $htc['anaurl'];?><?php echo $html;?>"> <i class="fa fa-home"></i> </a></li>						
						<li><?=@$dil['txt88'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<div class="col-lg-12 z-index-9">
					<div class="page-content">
						<h2 class="page-title"><?=@$dil['txt88'];?></h2>
						<div class="ordered-list">
						<?php if (strlen($kelime) > 3){?>
							<ul>
								<?php $Sorgu = $db->prepare("SELECT * FROM haberler WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['haberdetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt89'];?></strong> - <?php echo tarih2($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM haber_kategori WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['haberkategoriurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt90'];?></strong> - <?php echo tarih($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM video_galeri WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['videodetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt91'];?></strong> - <?php echo tarih($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM sayfalar WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['sayfaurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt92'];?></strong> - <?php echo tarih($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM foto_galeri WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['fotodetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt93'];?></strong> - <?php echo tarih($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM projeler WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['projedetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt94'];?></strong> - <?php echo tarih($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM proje_kategori WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['projekategoriurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt95'];?></strong> - <?php echo tarih($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM hizmetler WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['hizmetdetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt96'];?></strong> - <?php echo tarih($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM birimler WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['birimdetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt97'];?></strong> - <?php echo tarih($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM etkinlikler WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['etkinlikdetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt98'];?></strong> - <?php echo unixtarih($Sonuc['baslama_tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM duyurular WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['duyurudetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt99'];?></strong> - <?php echo tarih($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM ihaleler WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['ihaledetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt100'];?></strong> - <?php echo tarih($Sonuc['baslama_tarih']." ".$Sonuc['baslatma_saat']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM ilanlar WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['ilandetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt101'];?></strong> - <?php echo tarih($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM meclis_kararlari WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['karardetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt102'];?></strong> - <?php echo tarih2($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM faaliyet_raporlari WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['faaliyetdetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt103'];?></strong> - <?php echo tarih2($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM profiller WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['profildetayurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt104'];?></strong> - <?php echo tarih($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
								<?php $Sorgu = $db->prepare("SELECT * FROM profil_kategori WHERE durum = ? AND dil = ? AND adi LIKE ? ORDER BY id DESC");
								$Sorgu->execute(array("1",$_SESSION['k_dil'],"%".$kelime."%"));
								$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
								<?php if($Sorgu->rowCount() != "0"){$bulundu = true;}?>
								<?php foreach ( $islem as $Sonuc ){?>
								<li class="is-active">
									<a href="<?php echo $htc['profilkategoriurl']; ?>/<?php echo $Sonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text">
											<span class="icon"><i class="fas fa-align-right"></i></span>
											<?php echo ilkbuyuk($Sonuc['adi']);?> 
										</h3>
										<div class="date"><strong><?=@$dil['txt105'];?></strong> - <?php echo tarih($Sonuc['tarih']);?></div>
									</a>
								</li>
								<?php }?>
								
							</ul>
						<?php if($bulundu == false ){?>
						<div class="alert alert-warning" style="width:100%;" role="alert">
							<p><?=@$dil['txt106'];?></p>
							<?=@$dil['txt107'];?></br>
							<?=@$dil['txt108'];?>
						</div>
						<?php }?>
						<?php }else{?>
						<div class="alert alert-warning" style="width:100%;" role="alert">
							<p><?=@$dil['txt109'];?></p>
							<?=@$dil['txt110'];?>
						</div>
						<?php }?>							
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
<!-- PAGE SECTİON BİTİŞ -->
<?php include('slider_menu.php');?>