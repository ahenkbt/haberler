<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php
if(strip_tags(isset($_GET['id'])))
{
	$Sorgu = $db->prepare("SELECT * FROM foto_galeri WHERE seo = ? AND durum = ? AND dil = ?");
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
	$Sorgu = $db->prepare("SELECT * FROM foto_galeri WHERE durum = ? AND dil = ? ORDER BY id ASC");
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
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['fotourl']."' OR link = '".$htc['fotourl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);	
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan14/<?php echo $arkaplan['arkaplan14'];?>" alt="<?php echo $Sonuc['adi'];?>">
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
						<div class="detay"><?php echo $Sonuc['aciklama']; ?></div>
						<div class="gallery list">
							<?php $ISorgu = $db->prepare("SELECT * FROM fotograflar WHERE resimid = ? ORDER BY id ASC");
							$ISorgu->execute(array($Sonuc['id']));
							$Iislem = $ISorgu->fetchALL(PDO::FETCH_ASSOC);?>
							<ul class="row">
								<?php foreach ( $Iislem as $ISonuc ){?>
								<li class="gallery-card col-md-6 col-lg-3 col-6">
									<a href="<?php echo tema;?>/uploads/fotogaleri/diger/<?php echo $ISonuc['resim']; ?>" data-fancybox="fotodetay">
										<div class="gallery-cover"><img src="<?php echo tema;?>/uploads/fotogaleri/diger/<?php echo $ISonuc['resim']; ?>"></div>
										<div class="gallery-body">
											<span class="icon"><i class="far fa-image"></i></span>
										</div>
									</a>
								</li>
								<?php }?>
							</ul>
						</div>

						<div class="row py-4 haber-detay-box">
							<div class="col-12 mt-4">
								<h2 class="page-title">
									<?=@$dil['txt150'];?>
								</h2>
								
								<div class="ordered-list">
									<ul>
									<?php $DIGERSorgu = $db->prepare("SELECT * FROM foto_galeri WHERE durum = ? AND dil = ? ORDER BY id DESC LIMIT 10");
									$DIGERSorgu->execute(array("1",$_SESSION['k_dil']));
									$DIGERislem = $DIGERSorgu->fetchALL(PDO::FETCH_ASSOC);?>
										<?php foreach ( $DIGERislem as $DIGERSonuc ){?>
										<li class="is-active" id="<?php echo $DIGERSonuc['id']; ?>">
											<a href="<?php echo $htc['fotodetayurl']; ?>/<?php echo $DIGERSonuc['seo']; ?><?php echo $html;?>">
												<h3 class="text">
													<span class="icon"><i class="far fa-image"></i></span>
													<?php echo $DIGERSonuc['adi'];?> </h3>
												<div class="date"><?php echo tarih($DIGERSonuc['tarih']);?></div>
											</a>
										</li>
										<?php }?>
									</ul>
									<?php $kayit	= $db->query("SELECT * FROM  foto_galeri WHERE durum = '1' AND dil = '{$_SESSION['k_dil']}'")->rowCount();?>
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
			url: "<?php echo tema;?>/ajax/diger_fotolar.php",
			data: {"id":id},
			success: function(cevap){
				if(cevap == "yok")
				{
					swal({
						type: 'warning',
						title: '<?=@$dil['txt4'];?>',
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