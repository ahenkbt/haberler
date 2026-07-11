<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php 
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['bagissepeturl']."' OR link = '".$htc['bagissepeturl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan22/<?php echo $arkaplan['arkaplan22'];?>" alt="<?=@$dil['txt122'];?>">
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
						<li><?=@$dil['txt122'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<div class="col-lg-12 z-index-9">
					<div class="page-content">
						
						<div class="container beyazbg">
							<!-- bağışlar bölümü-->
							<div class="row bs-wizard">

								<div class="col-md-4 bs-wizard-step active">
									<div class="text-center bs-wizard-stepnum"><?=@$dil['txt119'];?></div>
									<div class="progress">
										<div class="progress-bar"></div>
									</div>
									<a href="<?php echo $htc['bagissepeturl'];?><?php echo $html;?>" class="bs-wizard-dot"></a>
								</div>

								<div class="col-md-4 bs-wizard-step disabled">
									<!-- complete -->
									<div class="text-center bs-wizard-stepnum"><?=@$dil['txt120'];?></div>
									<div class="progress">
										<div class="progress-bar"></div>
									</div>
									<a href="<?php echo $htc['bagisodemeurl'];?><?php echo $html;?>" class="bs-wizard-dot"></a>
									<div class="bs-wizard-info text-center"></div>
								</div>


								<div class="col-md-4 bs-wizard-step disabled">
									<!-- active -->
									<div class="text-center bs-wizard-stepnum"><?=@$dil['txt121'];?></div>
									<div class="progress">
										<div class="progress-bar"></div>
									</div>
									<a href="javascript:;" class="bs-wizard-dot"></a>
								</div>
							</div>




							<form method="post" action="<?php echo $htc['bagisodemeurl'];?><?php echo $html;?>">
								<div class="row justify-content-center mt-5">
								<div class="col-md-10 mobilbagisbilgisayfa">

									<div class="mobilbaslikgizle col-md-12">
										<div class="row">
											<div class="col-md-9"><?=@$dil['txt123'];?></div>
											<div class="col-md-2"><?=@$dil['txt124'];?></div>
											<div class="col-md-1"><?=@$dil['txt125'];?></div>
										</div>
									</div>
									<?php $toplam = 0; if (is_array($_SESSION['sepet']) && !empty($_SESSION['sepet'])) : foreach ($_SESSION['sepet'] as $k => $v) : $toplam += $v['tutar']; ?>
									<div class="col-sm-12 well-sm alert alert-default">
										<div class="row">
											<div class="col-sm-9"><?=@$v['adi'];?></div>
											<div class="col-sm-2">
												<span class="bagis_toplam" id="bagis_toplam"><?=@$v['tutar'];?> TL</span>
											</div>
											<div class="col-sm-1"> 
												<a class="btn btn-borders btn-danger btn-xs" role="button" href="javascript:;" data-sil="<?=@$v['sesID'];?>"><i class="fas fa-trash"></i></a>
											</div>
										</div>
									</div>
									<?php endforeach; else: ?>
									<h3><?=@$dil['txt126'];?></h3>
									<?php endif; ?>

									<div class="well-sm alert s2_toplambagis">
										<div class="row">
											<div class="col-md-7"></div>
											<div class="toplam_tutar col-md-2"><?=@$dil['txt127'];?></div>
											<div class="col-md-2"><span class="toplam_tutar"><?=$toplam;?> TL</span></div>
											<div class="col-md-1"></div>
										</div>										
									</div>

									<div class="col-md-12 well">
										<legend class="bagisyapanbilgileri"><?=@$dil['txt128'];?></legend>
										<div class="form-group">
											<div class="row d-orta">
												<span class="col-sm-3 control-label ykirmizi"><?=@$dil['txt129'];?></span>
												<div class="col-sm-9">
													<input type="text" class="form-control" id="adi" name="adi" required>
												</div>
											</div>
										</div>


										<div class="form-group">
											<div class="row d-orta">
												<span class="col-sm-3 control-label ykirmizi"><?=@$dil['txt130'];?></span>
												<div class="col-sm-9">
													<input type="text" class="form-control" id="cep" name="cep" required>
												</div>
											</div>
										</div>


										<div class="form-group">
											<div class="row d-orta">
												<span class="col-sm-3 control-label"><?=@$dil['txt131'];?></span>
												<div class="col-sm-9">
													 <input type="text" class="form-control" id="tc" name="tc" />
												</div>
											</div>
										</div>


										<div class="form-group">
											<div class="row d-orta">
												<span class="col-sm-3 control-label"><?=@$dil['txt132'];?></span>
												<div class="col-sm-9">
													<input type="text" class="form-control" id="tel" name="tel" />
												</div>
											</div>
										</div>

										<div class="form-group">
											<div class="row d-orta">
												<span class="col-sm-3 control-label"><?=@$dil['txt133'];?></span>
												<div class="col-sm-9">
													<input type="text" class="form-control" id="email" name="email" />
												</div>
											</div>
										</div>

										<div class="form-group">
											<div class="row d-orta">
												<span class="col-sm-3 control-label"><?=@$dil['txt134'];?></span>
												<div class="col-sm-9">
													<input type="text" class="form-control" id="adres" name="adres" />
												</div>
											</div>
										</div>

										<div class="form-group">
											<div class="row d-orta">
												<span class="col-sm-3 control-label"><?=@$dil['txt135'];?></span>
												<div class="col-sm-9">
													<textarea type="text" class="form-control" name="aciklama" id="aciklama"></textarea>
												</div>
											</div>
										</div>

										<div class="form-group">
											<div class="row">
												<span class="col-sm-3 control-label"></span>
												<div class="col-sm-9">
													<input type="hidden" class="form-control" id="bagis_toplam" name="bagis_toplam" value="<?=$toplam;?>" required>
													<button type="submit" class="form-button iletisim-page m-0"><?=@$dil['txt136'];?></button>
												</div>
											</div>
										</div>

									</div>
								</div>
								</div>
							</form>

						</div>

					</div>
				</div>
			</div>
		</div>
	</div>
</section>
<!-- PAGE SECTİON BİTİŞ -->
<?php include('slider_menu.php');?>