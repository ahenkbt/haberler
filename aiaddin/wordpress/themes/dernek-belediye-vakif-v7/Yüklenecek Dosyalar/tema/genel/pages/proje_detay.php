<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php
if(strip_tags(isset($_GET['id'])))
{
	$DETAYSorgu = $db->prepare("SELECT * FROM projeler WHERE seo = ? AND dil = ?");
	$DETAYSorgu->execute(array($_GET['id'],$_SESSION['k_dil']));
	if($DETAYSorgu->rowCount())
	{
		$DETAYSonuc 	= $DETAYSorgu->fetch(PDO::FETCH_ASSOC);
		$kategori 	=$db->query("SELECT * FROM proje_kategori WHERE durum = '1' AND id = '{$DETAYSonuc['kategori']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
	}
	else
	{
		header("Location:".$url.(altklasor == "1" ? '/' : '')."404".$html."");
		exit();
	}
}
else
{
	$DETAYSorgu = $db->prepare("SELECT * FROM projeler WHERE dil = ? ORDER BY id ASC");
	$DETAYSorgu->execute(array($_SESSION['k_dil']));
	if($DETAYSorgu->rowCount())
	{
		$DETAYSonuc = $DETAYSorgu->fetch(PDO::FETCH_ASSOC);
		$kategori 	=$db->query("SELECT * FROM proje_kategori WHERE durum = '1' AND id = '{$DETAYSonuc['kategori']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
	}
	else
	{
		header("Location:".$url.(altklasor == "1" ? '/' : '')."404".$html."");
		exit();
	}
}
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['projelerurl']."' OR link = '".$htc['projelerurl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);		
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan18/<?php echo $arkaplan['arkaplan18'];?>" alt="<?php echo $DETAYSonuc['adi'];?>">
			<div class="slide-overlay"></div>
		</div>
		<div class="container banner-fix">
			<div class="row">
				<div class="col-lg-<?php echo($moduller['alan23'] == "1" ? '9 offset-lg-3' : '12');?> col-md-<?php echo($moduller['alan23'] == "1" ? '7 offset-md-5' : '12');?> z-index-9">
					<ol class="breadcrumb z-index-9">
						<li><a href="<?php echo $htc['anaurl'];?><?php echo $html;?>"> <i class="fa fa-home"></i> </a></li>
						<li><a href="<?php echo $htc['projelerurl'];?><?php echo $html;?>">Projeler</a></li>
						<li><a href="<?php echo $htc['projekategoriurl'];?>/<?php echo $kategori['seo'];?><?php echo $html;?>"><?php echo ilkbuyuk($kategori['adi']);?></a></li>
						<li><?php echo $DETAYSonuc['adi'];?></li>
					</ol>	
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<?php include('leftbar.php');?>
				<div class="col-lg-<?php echo($moduller['alan23'] == "1" ? '9' : '12');?> col-md-<?php echo($moduller['alan23'] == "1" ? '7' : '12');?> z-index-9">
					<div class="page-content">
						<h2 class="page-title">
							<?php echo $DETAYSonuc['adi'];?>
							<span class="tarih">
								<i class="fa fa-calendar"></i>
								<?php echo tarih2($DETAYSonuc['tarih']);?>
							</span>
						</h2>
						<div class="row py-2 haber-detay-box">

							<div class="col-lg-12">
								<?php if($DETAYSonuc['kapak']){?>
								<img src="<?php echo tema;?>/uploads/projeler/<?php echo $DETAYSonuc['kapak'];?>" class="haber-detay-image">
								<?php }?>
								<div class="detay">
									<p class="spot"><?php echo $DETAYSonuc['spot']; ?></p>
									<?php echo $DETAYSonuc['aciklama']; ?>
								</div>
								<?php if($DETAYSonuc['videoid']){?>
								<iframe style="width:100%;height:500px;" src="https://www.youtube.com/embed/<?php echo $DETAYSonuc['videoid']; ?>?rel=0&amp;showinfo=0" frameborder="0" allow="encrypted-media" allowfullscreen></iframe>
								<?php }?>
							</div>
							
							<!-- Diğer Fotolar -->
							<?php $ISorgu = $db->prepare("SELECT * FROM projeresim WHERE pid = ? ORDER BY id ASC");
							$ISorgu->execute(array($DETAYSonuc['id']));
							$Iislem = $ISorgu->fetchALL(PDO::FETCH_ASSOC);?>
							<?php if($ISorgu->rowCount() != "0"){?>											
							<div class="page-content-gallery gallery list margin-top-50">
								<div class="col-lg-12">
									<h2 class="page-title"><?=@$dil['txt150'];?></h2>
								</div>	
								<ul class="row margin-top-30 haberfoto">
									<?php foreach ( $Iislem as $ISonuc ){?>
									<li class="gallery-card col-sm-6 col-md-4 col-lg-3 col-6">
										<a href="<?php echo tema;?>/uploads/projeler/diger/<?php echo $ISonuc['resim']; ?>" data-fancybox="digerproje">
											<div class="gallery-photo"><img src="<?php echo tema;?>/uploads/projeler/diger/<?php echo $ISonuc['resim']; ?>"></div>
											<div class="gallery-overlay"><span class="icon"><i class="far fa-images"></i></span></div>
										</a>
									</li>
									<?php }?>
								</ul>
							</div>							
							<?php }?>
							<!-- Diğer Fotolar -->

							<div class="col-12 mt-4">
								<h2 class="page-title">
									<?=@$dil['txt194'];?>
								</h2>
								
								<div class="ordered-list">
									<ul>
									<?php $DIGERSorgu = $db->prepare("SELECT * FROM projeler WHERE durum = ? AND dil = ? ORDER BY id DESC LIMIT 10");
									$DIGERSorgu->execute(array("1",$_SESSION['k_dil']));
									$DIGERislem = $DIGERSorgu->fetchALL(PDO::FETCH_ASSOC);?>
										<?php foreach ( $DIGERislem as $DIGERSonuc ){?>
										<li class="is-active" id="<?php echo $DIGERSonuc['id']; ?>">
											<a href="<?php echo $htc['projedetayurl']; ?>/<?php echo $DIGERSonuc['seo']; ?><?php echo $html;?>">
												<h3 class="text">
													<span class="icon"><i class="fas fa-align-right"></i></span>
													<?php echo $DIGERSonuc['adi'];?> </h3>
												<div class="date"><?php echo tarih2($DIGERSonuc['tarih']);?></div>
											</a>
										</li>
										<?php }?>
									</ul>
									<?php $kayit	= $db->query("SELECT * FROM  projeler WHERE durum = '1' AND dil = '{$_SESSION['k_dil']}'")->rowCount();?>
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
			url: "<?php echo tema;?>/ajax/diger_projeler.php",
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