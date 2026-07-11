<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php 
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['aidaturl']."' OR link = '".$htc['aidaturl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan23/<?php echo $arkaplan['arkaplan23'];?>" alt="<?=@$dil['txt30'];?>">
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
						<li><?=@$dil['txt30'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<div class="col-lg-12 z-index-9">
					<div class="page-content">					


						<div class="iletisim-box ">
							<div class="row ortala">
								<div class="col-lg-4 sol mb-4">
									<div>
										<img src="<?php echo tema;?>/uploads/logo/<?php echo logo;?>">
									</div>
									<div class="social mt-4">
										<?php if(facebook){?><a title="facebook" href="<?php echo facebook;?>"><i class="fab fa-facebook-f"></i></a><?php }?>
										<?php if(twitter){?><a title="telegram" href="<?php echo twitter;?>"><i class="fab fa-twitter"></i></a><?php }?>
										<?php if(instagram){?><a title="instagram" href="<?php echo instagram;?>"><i class="fab fa-instagram"></i></a><?php }?>
										<?php if(linkedin){?><a title="linkedin" href="<?php echo linkedin;?>"><i class="fab fa-linkedin-in"></i></a><?php }?>
										<?php if(youtube){?><a title="youtube" href="<?php echo youtube;?>"><i class="fab fa-youtube"></i></a><?php }?>
									</div>

								</div>
								<div class="col-lg-7 mb-4 sag mt-4 mt-lg-0">
									<div class="title text-center text-lg-left">
										<h3><?=@$dil['txt31'];?></h3>
										<p><?=@$dil['txt32'];?></p>
									</div>

									<form action="_class/site_islem.php" method="post" >
										<div class="row">
											<div class="col-lg-10">
												<div class="form-box">
													<div class="image">
														<i class="far fa-address-book"></i>
													</div>
													<div class="inputs">
														<input type="number" name="tc" placeholder="<?=@$dil['txt33'];?>" class="iletisim-form">
													</div>
												</div>
											</div>

											<div class="col-lg-12">
												<input type="hidden" name="kontrol" value="" id="kontrol">	
												<input type="submit" name="aidatsorgubtn" class="form-button iletisim-page" value="<?=@$dil['txt34'];?>">
											</div>

										</div>
									</form>

								</div>
							</div>

						</div>

					</div>
				</div>
			</div>
		</div>
	</div>
</section>
<!-- PAGE SECTİON BİTİŞ -->
<?php 
site_mesaj("aidatsorgubtn",3,"no",@$dil['txt6'],@$dil['txt35'],@$dil['txt8']);
site_mesaj("aidatsorgubtn",3,"bos",@$dil['txt16'],@$dil['txt17'],@$dil['txt8']);
?>
<?php include('slider_menu.php');?>