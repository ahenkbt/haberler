<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php
if(strip_tags(isset($_GET['id'])))
{
	$DETAYSorgu = $db->prepare("SELECT * FROM duyurular WHERE seo = ? AND dil = ?");
	$DETAYSorgu->execute(array($_GET['id'],$_SESSION['k_dil']));
	if($DETAYSorgu->rowCount())
	{
		$DETAYSonuc 	= $DETAYSorgu->fetch(PDO::FETCH_ASSOC);
	}
	else
	{
		header("Location:".$url.(altklasor == "1" ? '/' : '')."404".$html."");
		exit();
	}
}
else
{
	$DETAYSorgu = $db->prepare("SELECT * FROM duyurular WHERE dil = ? ORDER BY id ASC");
	$DETAYSorgu->execute(array($_SESSION['k_dil']));
	if($DETAYSorgu->rowCount())
	{
		$DETAYSonuc = $DETAYSorgu->fetch(PDO::FETCH_ASSOC);
	}
	else
	{
		header("Location:".$url.(altklasor == "1" ? '/' : '')."404".$html."");
		exit();
	}
}
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['duyuruurl']."' OR link = '".$htc['duyuruurl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);		
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan10/<?php echo $arkaplan['arkaplan10'];?>" alt="<?php echo $DETAYSonuc['adi'];?>">
			<div class="slide-overlay"></div>
		</div>
		<div class="container banner-fix">
			<div class="row">
				<div class="col-lg-<?php echo($moduller['alan23'] == "1" ? '9 offset-lg-3' : '12');?> col-md-<?php echo($moduller['alan23'] == "1" ? '7 offset-md-5' : '12');?> z-index-9">
					<ol class="breadcrumb z-index-9">
						<li><a href="<?php echo $htc['anaurl'];?><?php echo $html;?>"> <i class="fa fa-home"></i> </a></li>						
						<?php if($menubas['menu_isim'] != ""){?>
						<li><a href="<?php echo($menubas['menu_url'] == "0" ? $menubas['link'] : $menubas['menu_url']);?>"><?php echo ilkbuyuk($menubas['menu_isim']);?></a></li>
						<?php }?>
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
								<?php if($DETAYSonuc['resim']){?>
								<img src="<?php echo tema;?>/uploads/duyurular/<?php echo $DETAYSonuc['resim'];?>" class="haber-detay-image">
								<?php }?>
								<div class="detay">
									<?php echo $DETAYSonuc['aciklama']; ?>
								</div>
							</div>
							

							<div class="col-12 mt-4">
								<h2 class="page-title">
									<?=@$dil['txt142'];?>
								</h2>
								
								<div class="ordered-list">
									<ul>
									<?php $DIGERSorgu = $db->prepare("SELECT * FROM duyurular WHERE durum = ? AND dil = ? ORDER BY id DESC LIMIT 10");
									$DIGERSorgu->execute(array("1",$_SESSION['k_dil']));
									$DIGERislem = $DIGERSorgu->fetchALL(PDO::FETCH_ASSOC);?>
										<?php foreach ( $DIGERislem as $DIGERSonuc ){?>
										<li class="is-active" id="<?php echo $DIGERSonuc['id']; ?>">
											<a href="<?php echo $htc['duyurudetayurl']; ?>/<?php echo $DIGERSonuc['seo']; ?><?php echo $html;?>">
												<h3 class="text">
													<span class="icon"><i class="fas fa-align-right"></i></span>
													<?php echo $DIGERSonuc['adi'];?> </h3>
												<div class="date"><?php echo tarih2($DIGERSonuc['tarih']);?></div>
											</a>
										</li>
										<?php }?>
									</ul>
									<?php $kayit	= $db->query("SELECT * FROM  duyurular WHERE durum = '1' AND dil = '{$_SESSION['k_dil']}'")->rowCount();?>
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
			url: "<?php echo tema;?>/ajax/diger_duyurular.php",
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