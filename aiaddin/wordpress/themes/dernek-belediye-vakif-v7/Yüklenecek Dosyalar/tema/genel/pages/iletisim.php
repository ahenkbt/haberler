<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php 
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['iletisimurl']."' OR link = '".$htc['iletisimurl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan20/<?php echo $arkaplan['arkaplan20'];?>" alt="<?=@$dil['txt174'];?>">
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
						<li><?=@$dil['txt174'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<div class="col-lg-12 z-index-9">
					<div class="page-content">
						
						<div class="iletisim-adres large mb-5">
							<ul class="row">
								<?php if(adres){?>
								<li class="col-md-3">
									<div class="iletisim-adres-bilgi">
										<span class="icon"><i class="fas fa-map-marker-alt"></i></span>
										<span class="title"><?=@$dil['txt175'];?></span>
										<p class="text"><?php echo adres;?></p>
									</div>
								</li>
								<?php }?>
								<?php if(email){?>
								<li class="col-md-3">
									<div class="iletisim-adres-bilgi">
										<span class="icon"><i class="far fa-envelope"></i></span>
										<span class="title"><?=@$dil['txt176'];?></span>
										<a href="mailto:<?php echo email;?>" class="text"><?php echo email;?></a>
									</div>
								</li>
								<?php }?>
								<?php if(telefon){?>
								<li class="col-md-3">
									<div class="iletisim-adres-bilgi">
										<span class="icon"><i class="fas fa-phone"></i></span>
										<span class="title"><?=@$dil['txt177'];?></span>
										<a href="tel:<?php echo telefon;?>" class="text"><?php echo telefon;?></a>
									</div>
								</li>
								<?php }?>
								<?php if(fax){?>
								<li class="col-md-3">
									<div class="iletisim-adres-bilgi">
										<span class="icon"><i class="fas fa-fax"></i></span>
										<span class="title"><?=@$dil['txt178'];?></span>
										<p class="text"><?php echo fax;?></p>
									</div>
								</li>
								<?php }?>
							</ul>
						</div>


						<div class="iletisim-box clip-t-t mt-3">
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
									<h3><?=@$dil['txt179'];?></h3>
									<p><?=@$dil['txt180'];?></p>
								</div>

								<form action="_class/site_islem.php" method="post" >
									<div class="row">
										<div class="col-lg-6">
											<div class="form-box">
												<div class="image">
													<i class="fal fa-user-circle"></i>
												</div>
												<div class="inputs">
													<input type="text" name="isim" placeholder="<?=@$dil['txt181'];?>" class="iletisim-form">
												</div>
											</div>
										</div>
										<div class="col-lg-6">
											<div class="form-box">
												<div class="image">
													<i class="fal fa-envelope"></i>
												</div>
												<div class="inputs">
													<input type="email" name="email" placeholder="<?=@$dil['txt182'];?>" class="iletisim-form">
												</div>
											</div>
										</div>
										
										<div class="col-lg-6">
											<div class="form-box">
												<div class="image">
													<i class="fal fa-phone"></i>
												</div>
												<div class="inputs">
													<input type="text" name="telefon" placeholder="<?=@$dil['txt84'];?>" class="iletisim-form">
												</div>
											</div>
										</div>

										<div class="col-lg-6">
											<div class="form-box">
												<div class="image">
													<i class="fal fa-envelope-open-text"></i>
												</div>
												<div class="inputs">
													<input type="text" name="konu" placeholder="<?=@$dil['txt85'];?>" class="iletisim-form">
												</div>
											</div>
										</div>

										<div class="col-lg-12">
											<div class="form-box">
												<div class="image">
													<i class="fal fa-edit"></i>
												</div>
												<div class="inputs">
													<textarea class="iletisim-form" name="mesaj" placeholder="<?=@$dil['txt86'];?>"></textarea>
												</div>
											</div>
										</div>
										<div class="col-lg-12">
											<input type="hidden" name="kontrol" value="" id="kontrol">	
											<input type="hidden" name="iletisimurl" value="<?php echo $sayfalink;?>" />
											<input type="submit" name="mesajbtn" value="<?=@$dil['txt87'];?>" class="form-button iletisim-page">
										</div>

									</div>
								</form>

							</div>
							</div>

						</div>


						<div class="row">
							<div class="bize-ulasin">
								<h4><?=@$dil['txt183'];?></h4>
								<p><?=@$dil['txt184'];?></p>
							</div>
						</div>

					</div>
				</div>
			</div>
		</div>
	</div>
</section>
<!-- PAGE SECTİON BİTİŞ -->
<!-- HARİTA SECTİON BAŞLANGIÇ -->
<section class="harita-section pt-0">
	<?php echo maps;?>
</section>
<!-- HARİTA SECTİON BİTİŞ -->
<?php include('slider_menu.php');?>