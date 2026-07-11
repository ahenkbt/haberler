<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php
if(strip_tags(isset($_GET['id'])))
{
	$Sorgu = $db->prepare("SELECT * FROM etkinlikler WHERE seo = ? AND durum = ? AND dil = ?");
	$Sorgu->execute(array($_GET['id'],"1",$_SESSION['k_dil']));
	if($Sorgu->rowCount())
	{
		$Sonuc = $Sorgu->fetch(PDO::FETCH_ASSOC);
	}
	else
	{
		header("Location:".$url.(altklasor == "1" ? '/' : '')."404".$html."");
		exit();
	}
}
else
{
	$Sorgu = $db->prepare("SELECT * FROM etkinlikler WHERE durum = ? AND dil = ? ORDER BY id ASC");
	$Sorgu->execute(array("1",$_SESSION['k_dil']));
	if($Sorgu->rowCount())
	{
		$Sonuc = $Sorgu->fetch(PDO::FETCH_ASSOC);
	}
	else
	{
		header("Location:".$url.(altklasor == "1" ? '/' : '')."404".$html."");
		exit();
	}
}
$tarihler 	= explode(" ",unixtarih($Sonuc['baslama_tarih']));
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['etkinlikurl']."' OR link = '".$htc['etkinlikurl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);	
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan13/<?php echo $arkaplan['arkaplan13'];?>" alt="<?php echo $Sonuc['adi'];?>">
			<div class="slide-overlay"></div>
		</div>
		<div class="container banner-fix">
			<div class="row">
				<div class="col-lg-<?php echo($moduller['alan23'] == "1" ? '9 offset-lg-3' : '12');?> col-md-<?php echo($moduller['alan23'] == "1" ? '7 offset-md-5' : '12');?> z-index-9">
					<ol class="breadcrumb">
						<li><a href="<?php echo $htc['anaurl'];?><?php echo $html;?>"> <i class="fa fa-home"></i> </a></li>						
						<?php if($menubas['menu_isim'] != ""){?>
						<li><a href="<?php echo($menubas['menu_url'] == "0" ? $menubas['link'] : $menubas['menu_url']);?>"><?php echo ilkbuyuk($menubas['menu_isim']);?></a></li>
						<?php }?>
						<li><?php echo $Sonuc['adi'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<?php include('leftbar.php');?>
				<div class="col-lg-<?php echo($moduller['alan23'] == "1" ? '9' : '12');?> col-md-<?php echo($moduller['alan23'] == "1" ? '7' : '12');?> z-index-9">
					<div class="page-content">
						<h2 class="page-title"><?php echo $Sonuc['adi'];?></h2>
						
						<div class="etkinlikdetay single large">
							<div class="etkinlikdetay-card">
								<div class="etkinlikdetay-card__content">
									<div class="etkinlikdetay-photo">
										<a href="<?php echo tema;?>/uploads/etkinlikler/<?php echo $Sonuc['resim']; ?>" data-fancybox=""><img src="<?php echo tema;?>/uploads/etkinlikler/<?php echo $Sonuc['resim']; ?>" alt="<?php echo $Sonuc['adi'];?>"></a>
									</div>
									<div class="etkinlikdetay-description">
										<div class="etkinlikdetay-info">
											<ul>
												<li>
													<a>
														<span class="icon"><i class="far fa-calendar-alt"></i></span>
														<div class="text"><?php echo $tarihler[0];?></div>
													</a>
												</li>
												<li>
													<a>
														<span class="icon"><i class="far fa-clock"></i></span>
														<div class="text"><?php echo $tarihler[1];?></div>
													</a>
												</li>
												<li>
													<a>
														<span class="icon"><i class="fas fa-map-marker-alt"></i></span>
														<div class="text"><?php echo $Sonuc['yer'];?></div>
													</a>
												</li>
												<li>
													<a target="_blank" href="<?php echo $Sonuc['gmap'];?>">
														<span class="icon"><i class="fas fa-map-marked-alt"></i></span>
														<div class="text"><?=@$dil['txt146'];?></div>
													</a>
												</li>
											</ul>
										</div>
									</div>
								</div>
							</div>
						</div>
						
						<div class="detay">
							<?php echo $Sonuc['aciklama']; ?>
						</div>	
						
						<div class="row py-4 haber-detay-box">
							<div class="col-12 mt-4">
								<h2 class="page-title">
									<?=@$dil['txt147'];?>
								</h2>
								
								<div class="ordered-list">
									<ul>
									<?php $DIGERSorgu = $db->prepare("SELECT * FROM etkinlikler WHERE durum = ? AND dil = ? ORDER BY id DESC LIMIT 10");
									$DIGERSorgu->execute(array("1",$_SESSION['k_dil']));
									$DIGERislem = $DIGERSorgu->fetchALL(PDO::FETCH_ASSOC);?>
										<?php foreach ( $DIGERislem as $DIGERSonuc ){?>
										<li class="is-active" id="<?php echo $DIGERSonuc['id']; ?>">
											<a href="<?php echo $htc['etkinlikdetayurl']; ?>/<?php echo $DIGERSonuc['seo']; ?><?php echo $html;?>">
												<h3 class="text">
													<span class="icon"><i class="far fa-calendar-alt"></i></span>
													<?php echo $DIGERSonuc['adi'];?> </h3>
												<div class="date"><?php echo unixtarih($DIGERSonuc['baslama_tarih']);?></div>
											</a>
										</li>
										<?php }?>
									</ul>
									<?php $kayit	= $db->query("SELECT * FROM  etkinlikler WHERE durum = '1' AND dil = '{$_SESSION['k_dil']}'")->rowCount();?>
									<?php if($kayit > 10){?>
									<div class="more daha">
										<a href="javascript:void(0);"><span class="icon"><i class="fas fa-redo"></i></span> <?=@$dil['txt143'];?></a>
										<span class="loading" style="display:none;"><img style="width:100px;" src="<?php echo tema;?>/assets/images/yukleniyor.gif"></span>
									</div>	
									<?php }?>								
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
<?php include('slider_menu.php');?>
<script type="text/javascript">
$(function(){
	$(".daha").click(function(){
		var id = $(".ordered-list ul li.is-active:last").attr("id");
		var t = $(this);
		$(".more a", this).hide();
		$(".loading").show();
		$("div", this).show();
		$.ajax({
			type:"POST",
			url: "<?php echo tema;?>/ajax/diger_etkinlikler.php",
			data: {"id":id},
			success: function(cevap){
				if(cevap == "yok")
				{
					swal({
						type: 'warning',
						title: '<?=@$dil['txt6'];?>',
						text: '<?=@$dil['txt144'];?>',
						confirmButtonText: '<?=@$dil['txt8'];?>',
						timer: 5000
					})
					$(".daha").remove();
				}
				else
				{
					$(".ordered-list ul").append(cevap);
					$("div", t).hide();
					$(".loading").hide();
					$(".more a", t).show();
				}
			}
		})
	});
});
</script>