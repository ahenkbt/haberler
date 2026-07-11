<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php 
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['bagisurl']."' OR link = '".$htc['bagisurl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan22/<?php echo $arkaplan['arkaplan22'];?>" alt="<?=@$dil['txt111'];?>">
			<div class="slide-overlay"></div>
		</div>
		<div class="container banner-fix">
			<div class="row">
				<div class="col-lg-12 z-index-9">
					<ol class="breadcrumb">
						<li><a href="<?php echo $htc['anaurl'];?><?php echo $html;?>"> <i class="fa fa-home"></i> </a></li>						
						<?php if($menubas['menu_isim'] != ""){?>
						<li><a href="<?php echo($menubas['menu_url'] == "0" ? $menubas['link'] : $menubas['menu_url']);?>"><?php echo ilkbuyuk($menubas['menu_isim']);?></a></li>
						<?php }?>
						<li><?=@$dil['txt111'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				
				<div class="col-lg-9 col-md-7 z-index-9">
					<div class="page-content">
						<h2 class="page-title"><?=@$dil['txt111'];?></h2>
						<div class="row haber-detay-box">
							<div class="col-lg-12">								


								<div class="bagis-component">
									<div class="tab-head">
										<div class="row m-0">
										<?php $PSorgu = $db->prepare("SELECT * FROM bagis_kategori WHERE dil = ? and durum = ? ORDER BY id ASC");
										$PSorgu->execute(array($_SESSION['k_dil'],1));
										$asay = 1;
										$Pislem = $PSorgu->fetchALL(PDO::FETCH_ASSOC);?>
											<?php foreach ( $Pislem as $PSonuc ){?>
											<div datatarget="#bagis-<?php echo $PSonuc['seo']; ?>" class="tab-link <?php if($asay++ == "1"){echo "active";} ?>">
												<div class="category-image"><img style="max-width: 50px;" src="<?php echo tema;?>/uploads/bagis_kategoriler/<?php echo $PSonuc['ikon']; ?>"></div>
												<div class="category-title"><?php echo $PSonuc['adi']; ?></div>
											</div>
											<?php } ?>
										</div>
									</div>
									<div class="tab-body">
										<div class="row m-0">
										<?php $PPSorgu = $db->prepare("SELECT * FROM bagis_kategori WHERE dil = ? and durum = ? ORDER BY id ASC");
										$PPSorgu->execute(array($_SESSION['k_dil'],1));
										$say = 1;
										$PPislem = $PPSorgu->fetchALL(PDO::FETCH_ASSOC);?>
											<?php foreach ( $PPislem as $PPSonuc ){?>
											<div id="bagis-<?php echo $PPSonuc['seo']; ?>" class="tab-panel <?php if($say++ == "1"){echo "active";} ?>">
											
												<div class="row py-3 haberler-box">
												<?php $Sorgu = $db->prepare("SELECT * FROM bagislar WHERE dil = ? and durum = ? and kategori = ? order by id asc");
												$Sorgu->execute(array($_SESSION['k_dil'],1,$PPSonuc['id']));
												$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
													<?php foreach ( $islem as $Sonuc ){?>
													<div class="col-lg-4 col-md-4">
														<div class="bagis-box p-2">
															<h4 class="title bagis-title"><?php echo $Sonuc['adi']; ?></h4>
															<div class="cards-photo"> 
																<img src="<?php echo tema;?>/uploads/bagislar/<?php echo $Sonuc['kapak']; ?>">										
															</div>
															<div class="content p-0 py-2">
																<div class="row">
																	<div class="col">
																		<input type="text" id="fiyat" data-id="<?=@$Sonuc['id'];?>" name="fiyat" class="form-control" placeholder="<?php echo $Sonuc['miktar']; ?>" value="<?php echo $Sonuc['miktar']; ?>">
																	</div>
																	<div class="col-1 bagis-ortala">
																		<p>TL</p>
																	</div>
																	<div class="col">
																		<button type="submit" role="button" onclick="addBasket('<?php echo $Sonuc['id']; ?>');" class="form-button iletisim-page m-0 p-2 w-100"><i class="fas fa-heart"></i> <?=@$dil['txt112'];?></button>
																	</div>
																</div>
															</div>
														</div>
													</div>
													<?php } ?>											
												</div>											
											</div>
											<?php } ?>
										</div>
									</div>
								</div>							
								
							</div>
						</div>
					</div>
				</div>
				
				<div class="col-lg-3 col-md-5 z-index-9">
					<div class="kolay-menu">
						<h4><?=@$dil['txt113'];?> </h4>
					</div>
					
					<div class="col-md-12 basket-card" name="sepetdiv"></div>
					<img class="img-responsive tr_en_img_x" src="https://www.paytr.com/img/odeme_sayfasi/os_kartlar.png" alt="Kart Güvenliği" style="padding: 40px 0 10px 0;width: 100%;">
				</div>
			</div>
		</div>
	</div>
</section>
<!-- PAGE SECTİON BİTİŞ -->
<?php include('slider_menu.php');?>