<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php
if(strip_tags(isset($_GET['id'])))
{
	$DETAYSorgu = $db->prepare("SELECT * FROM faaliyet_raporlari WHERE seo = ? AND dil = ?");
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
	$DETAYSorgu = $db->prepare("SELECT * FROM faaliyet_raporlari WHERE dil = ? ORDER BY id ASC");
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
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['faaliyeturl']."' OR link = '".$htc['faaliyeturl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);		
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan8/<?php echo $arkaplan['arkaplan8'];?>" alt="<?php echo $DETAYSonuc['adi'];?>">
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
								<img src="<?php echo tema;?>/uploads/faaliyet_raporlari/<?php echo $DETAYSonuc['resim'];?>" class="haber-detay-image">
								<?php }?>
								<div class="detay">
									<?php echo $DETAYSonuc['aciklama']; ?>
								</div>
								<?php if($DETAYSonuc['dosya']){?>
								<div class="documents-files documents-icon">
									<ul>
										<li>
											<a class="row no-gutters" target="_blank" href="<?php echo tema;?>/uploads/faaliyet_raporlari/dosya/<?php echo $DETAYSonuc['dosya'];?>" data-documents-src="">
												<div class="documents-icon" data-documents-icon="">
													<i class="far fa-file"></i>
												</div>
												<div class="col">
													<div class="text"><?php echo $DETAYSonuc['adi'];?></div>
													<div class="date"><?php echo tarih2($DETAYSonuc['tarih']);?></div>
												</div>
												<span class="icon"><i class="fas fa-download"></i></span>
											</a>
										</li>
									</ul>
								</div>
								<?php }?>
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