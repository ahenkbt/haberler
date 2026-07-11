<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php
if(strip_tags(isset($_GET['id'])))
{
	$Sorgu = $db->prepare("SELECT * FROM profil_kategori WHERE seo = ? AND dil = ?");
	$Sorgu->execute(array($_GET['id'],$_SESSION['k_dil']));
	if($Sorgu->rowCount()){
		$Sonuc = $Sorgu->fetch(PDO::FETCH_ASSOC);
	}else{
		header("Location:".$url.(altklasor == "1" ? '/' : '')."404".$html."");
		exit();
	}
}
else
{
	$Sorgu = $db->prepare("SELECT * FROM profil_kategori WHERE dil = ? ORDER BY id ASC");
	$Sorgu->execute(array($_SESSION['k_dil']));
	if($Sorgu->rowCount()){
		$Sonuc = $Sorgu->fetch(PDO::FETCH_ASSOC);
	}else{
		header("Location:".$url.(altklasor == "1" ? '/' : '')."404".$html."");
		exit();
	}
}
$page = @intval($_GET['s']);
if(!$page) $page = 1;
$ttsorgu = $db->prepare("SELECT COUNT(*) FROM profiller WHERE durum = ? AND kategori = ? AND dil = ?");
$ttsorgu->execute(array("1",$Sonuc['id'],$_SESSION['k_dil']));
$total = $ttsorgu->fetchColumn();
$limit= $limitayar['limit_sayfaprofil'];
$page_count = ceil($total/$limit);
if($page > $page_count) $page = 1;
$show = $page * $limit - $limit;
$PROFILSorgu = $db->prepare("SELECT * FROM profiller WHERE durum = ? AND kategori = ? AND dil = ? ORDER BY sira ASC LIMIT $show,$limit");
$PROFILSorgu->execute(array("1",$Sonuc['id'],$_SESSION['k_dil']));
$PROFILislem = $PROFILSorgu->fetchALL(PDO::FETCH_ASSOC);	
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['profilkategoriurl']."/".$Sonuc['seo']."' OR link = '".$htc['profilkategoriurl']."/".$Sonuc['seo']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan9/<?php echo $arkaplan['arkaplan9'];?>" alt="<?php echo $Sonuc['adi']?>">
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
						<li><?php echo $Sonuc['adi']?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<?php include('leftbar.php');?>
				<div class="col-lg-<?php echo($moduller['alan23'] == "1" ? '9' : '12');?> col-md-<?php echo($moduller['alan23'] == "1" ? '7' : '12');?> z-index-9">
					<?php if($PROFILSorgu->rowCount() != "0"){?>
					<div class="page-content p-0 overflow-hidden position-relative">
						<h2 class="page-title-personel"><?php echo $Sonuc['adi']?></h2>
						<div class="row py-4 ilk-personel">							
							<?php foreach ( $PROFILislem as $PROFILSonuc ){?>
							<?php if($PROFILSonuc['sira'] <= 1){?>
							<div class="col-lg-4 offset-lg-4">
								<div class="personeldis">
									<a href="<?php echo $htc['profildetayurl']; ?>/<?php echo $PROFILSonuc['seo']; ?><?php echo $html;?>">
									<div>
										<img class="personel-foto" src="<?php echo tema;?>/uploads/profiller/<?php echo $PROFILSonuc['kapak']; ?>">
									</div>
									<div class="personel-detay">
										<p class="ad"><?php echo $PROFILSonuc['adi']?></p>
										<p class="unvan"><?php echo $PROFILSonuc['gorevi']?></p>
										<div>
											<div class="social">
												<?php if($PROFILSonuc['facebook']){?><a title="facebook" href="<?php echo $PROFILSonuc['facebook'];?>"><i class="fab fa-facebook-f"></i></a><?php }?>
												<?php if($PROFILSonuc['twitter']){?><a title="telegram" href="<?php echo $PROFILSonuc['twitter'];?>"><i class="fab fa-twitter"></i></a><?php }?>
												<?php if($PROFILSonuc['instagram']){?><a title="instagram" href="<?php echo $PROFILSonuc['instagram'];?>"><i class="fab fa-instagram"></i></a><?php }?>
												<?php if($PROFILSonuc['linkedin']){?><a title="linkedin" href="<?php echo $PROFILSonuc['linkedin'];?>"><i class="fab fa-linkedin-in"></i></a><?php }?>
												<?php if($PROFILSonuc['youtube']){?><a title="youtube" href="<?php echo $PROFILSonuc['youtube'];?>"><i class="fab fa-youtube"></i></a><?php }?>
											</div>
										</div>
									</div>
									</a>
								</div>
							</div>
							<?php }?>
							<?php }?>
						</div>
						
						<div class="row diger-personeller clip-t-b bg-white">
							<?php foreach ( $PROFILislem as $PROFILSonuc ){?>
							<?php if($PROFILSonuc['sira'] > 1){?>
							<div class="col-lg-<?php echo $limitayar['limit_profil'];?>">
								<div class="personeldis">
									<a href="<?php echo $htc['profildetayurl']; ?>/<?php echo $PROFILSonuc['seo']; ?><?php echo $html;?>">
									<div><img class="personel-foto" src="<?php echo tema;?>/uploads/profiller/<?php echo $PROFILSonuc['kapak']; ?>"></div>
									<div class="personel-detay">
										<p class="ad"><?php echo $PROFILSonuc['adi']?></p>
										<p class="unvan"><?php echo $PROFILSonuc['gorevi']?></p>
										<div>
											<div class="social">
												<?php if($PROFILSonuc['facebook']){?><a title="facebook" href="<?php echo $PROFILSonuc['facebook'];?>"><i class="fab fa-facebook-f"></i></a><?php }?>
												<?php if($PROFILSonuc['twitter']){?><a title="telegram" href="<?php echo $PROFILSonuc['twitter'];?>"><i class="fab fa-twitter"></i></a><?php }?>
												<?php if($PROFILSonuc['instagram']){?><a title="instagram" href="<?php echo $PROFILSonuc['instagram'];?>"><i class="fab fa-instagram"></i></a><?php }?>
												<?php if($PROFILSonuc['linkedin']){?><a title="linkedin" href="<?php echo $PROFILSonuc['linkedin'];?>"><i class="fab fa-linkedin-in"></i></a><?php }?>
												<?php if($PROFILSonuc['youtube']){?><a title="youtube" href="<?php echo $PROFILSonuc['youtube'];?>"><i class="fab fa-youtube"></i></a><?php }?>
											</div>
										</div>
									</div>
									</a>
								</div>
							</div>
							<?php }?>
							<?php }?>
						</div>
						<div class="pagination">
							<ul>
							<?php if($limitayar['limit_sayfaprofil'] < $total && $limitayar['limit_sayfaprofil'] > 0){
							$showing = 3;
							if($page > 1){ $previous = $page - 1;?>
							<li class="onceki_sayfa"><a href="<?php echo $htc['profilkategoriurl'];?>-<?php echo $Sonuc['seo']?>/<?php echo $previous;?><?php echo $html;?>"><i class="fas fa-angle-left"></i></a></li>
							<?php }
							for($i= $page - $showing; $i < $page + $showing + 1; $i++){
							if($i > 0 and $i <= $page_count){
							if($i == $page){?>
							<li><a class="secili" href="javascript:void(0)"><?php echo $i; ?></a></li>
							<?php }else{?>
							<li><a href="<?php echo $htc['profilkategoriurl'];?>-<?php echo $Sonuc['seo']?>/<?php echo $i; ?><?php echo $html;?>"><?php echo $i; ?></a></li>
							<?php } } } if($page != $page_count){?>
							<?php  $next = $page +1;?>
							<li class="sonraki_sayfa"><a href="<?php echo $htc['profilkategoriurl'];?>-<?php echo $Sonuc['seo']?>/<?php echo $next; ?><?php echo $html;?>"><i class="fas fa-angle-right"></i></a></li>
							<?php }} ?>	
							</ul>
						</div>
					</div>
					<?php }else{?>
					<div class="page-content">
						<h2 class="page-title"><?php echo $Sonuc['adi'];?></h2>
						<div class="alert alert-warning text-left" style="width:100%;" role="alert">
							<p><?=@$dil['txt139'];?></p>
							<?=@$dil['txt140'];?></br>
							<?=@$dil['txt141'];?>
						</div>
					</div>
					<?php }?>
				</div>
			</div>
		</div>
	</div>
</section>
<!-- PAGE SECTİON BİTİŞ -->
<?php include('slider_menu.php');?>