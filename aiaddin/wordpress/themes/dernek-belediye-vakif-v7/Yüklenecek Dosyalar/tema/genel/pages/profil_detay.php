<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php
if(strip_tags(isset($_GET['id'])))
{
	$aSorgu = $db->prepare("SELECT * FROM profiller WHERE seo = ? AND durum = ? AND dil = ?");
	$aSorgu->execute(array($_GET['id'],1,$_SESSION['k_dil']));
	if($aSorgu->rowCount()){
		$aSonuc 		= $aSorgu->fetch(PDO::FETCH_ASSOC);
		$kategori 	=$db->query("SELECT * FROM profil_kategori WHERE durum = '1' AND id = '{$aSonuc['kategori']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
	}else{
		header("Location:".$url.(altklasor == "1" ? '/' : '')."404".$html."");
		exit();
	}
}
else
{
	$aSorgu = $db->prepare("SELECT * FROM profiller WHERE durum = ? AND dil = ? ORDER BY id ASC");
	$aSorgu->execute(array(1,$_SESSION['k_dil']));
	if($aSorgu->rowCount()){
		$aSonuc 		= $aSorgu->fetch(PDO::FETCH_ASSOC);
		$kategori 	=$db->query("SELECT * FROM profil_kategori WHERE durum = '1' AND id = '{$aSonuc['kategori']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
	}else{
		header("Location:".$url.(altklasor == "1" ? '/' : '')."404".$html."");
		exit();
	}
}
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['profildetayurl']."/".$aSonuc['seo']."' OR link = '".$htc['profildetayurl']."/".$aSonuc['seo']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);		
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan9/<?php echo $arkaplan['arkaplan9'];?>" alt="<?php echo $aSonuc['adi']?>">
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
						<li><a href="<?php echo $htc['profilkategoriurl'];?>/<?php echo $kategori['seo'];?><?php echo $html;?>"><?php echo ilkbuyuk($kategori['adi']);?></a></li>
						<li><?php echo $aSonuc['adi']?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<?php include('leftbar.php');?>
				<div class="col-lg-<?php echo($moduller['alan23'] == "1" ? '9' : '12');?> col-md-<?php echo($moduller['alan23'] == "1" ? '7' : '12');?> z-index-9">
					<div class="page-content p-0 overflow-hidden position-relative">
						<h2 class="page-title-personel"><?php echo $aSonuc['adi']?></h2>						
						<div class="row py-4 ilk-personel">							
							<div class="col-lg-4 offset-lg-4">
								<div class="personeldis">
									<a href="<?php echo $htc['profildetayurl']; ?>/<?php echo $aSonuc['seo']; ?><?php echo $html;?>">
									<div>
										<img class="personel-foto" src="<?php echo tema;?>/uploads/profiller/<?php echo $aSonuc['kapak']; ?>">
									</div>
									<div class="personel-detay">
										<p class="ad"><?php echo $aSonuc['adi']?></p>
										<p class="unvan"><?php echo $aSonuc['gorevi']?></p>
										<div>
											<div class="social">
												<?php if($aSonuc['facebook']){?><a title="facebook" href="<?php echo $aSonuc['facebook'];?>"><i class="fab fa-facebook-f"></i></a><?php }?>
												<?php if($aSonuc['twitter']){?><a title="telegram" href="<?php echo $aSonuc['twitter'];?>"><i class="fab fa-twitter"></i></a><?php }?>
												<?php if($aSonuc['instagram']){?><a title="instagram" href="<?php echo $aSonuc['instagram'];?>"><i class="fab fa-instagram"></i></a><?php }?>
												<?php if($aSonuc['linkedin']){?><a title="linkedin" href="<?php echo $aSonuc['linkedin'];?>"><i class="fab fa-linkedin-in"></i></a><?php }?>
												<?php if($aSonuc['youtube']){?><a title="youtube" href="<?php echo $aSonuc['youtube'];?>"><i class="fab fa-youtube"></i></a><?php }?>
											</div>
										</div>
									</div>
									</a>
								</div>
							</div>
						</div>
						
						<div class="row diger-personeller clip-t-b bg-white">
							<div class="detay">
							<?php echo $aSonuc['aciklama']?>
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