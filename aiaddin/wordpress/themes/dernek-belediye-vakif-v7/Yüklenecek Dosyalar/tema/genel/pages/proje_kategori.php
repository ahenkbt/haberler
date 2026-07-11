<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php
if(strip_tags(isset($_GET['id'])))
{
	$Sorgu = $db->prepare("SELECT * FROM proje_kategori WHERE seo = ? AND dil = ?");
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
	$Sorgu = $db->prepare("SELECT * FROM proje_kategori WHERE dil = ? ORDER BY id ASC");
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
$ttsorgu = $db->prepare("SELECT COUNT(*) FROM projeler WHERE durum = ? AND kategori = ? AND dil = ?");
$ttsorgu->execute(array("1",$Sonuc['id'],$_SESSION['k_dil']));
$total = $ttsorgu->fetchColumn();
$limit= $limitayar['limit_sayfaproje'];
$page_count = ceil($total/$limit);
if($page > $page_count) $page = 1;
$show = $page * $limit - $limit;
$PROJESorgu = $db->prepare("SELECT * FROM projeler WHERE durum = ? AND kategori = ? AND dil = ? ORDER BY id DESC LIMIT $show,$limit");
$PROJESorgu->execute(array("1",$Sonuc['id'],$_SESSION['k_dil']));
$PROJEislem = $PROJESorgu->fetchALL(PDO::FETCH_ASSOC);	
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['projekategoriurl']."/".$Sonuc['seo']."' OR link = '".$htc['projekategoriurl']."/".$Sonuc['seo']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan18/<?php echo $arkaplan['arkaplan18'];?>" alt="<?php echo $Sonuc['adi'];?>">
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
						<li><a href="<?php echo $htc['projelerurl'];?><?php echo $html;?>"><?=@$dil['txt193'];?></a></li>
						<li><?php echo ilkbuyuk($Sonuc['adi']);?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<?php include('leftbar.php');?>
				<div class="col-lg-<?php echo($moduller['alan23'] == "1" ? '9' : '12');?> col-md-<?php echo($moduller['alan23'] == "1" ? '7' : '12');?> z-index-9">
					<div class="page-content">
						<h2 class="page-title"><?php echo $Sonuc['adi'];?></h2>
						<?php if($PROJESorgu->rowCount() != "0"){?>
						<div class="row py-2 haberler-box">
							<?php foreach ( $PROJEislem as $PROJESonuc ){?>
							<div class="col-lg-<?php echo $limitayar['limit_proje'];?> col-md-<?php echo $limitayar['limit_proje'];?>">
								<div class="haber-box">
									<a href="<?php echo $htc['projedetayurl']; ?>/<?php echo $PROJESonuc['seo']; ?><?php echo $html;?>">
										<div class="cards-photo"> 
										<?php if($PROJESonuc['kapak']){?><img src="<?php echo tema;?>/uploads/projeler/kapak/<?php echo $PROJESonuc['kapak']; ?>"><?php }?>
										</div>
									</a>
									<div class="content">
										<a href="<?php echo $htc['projedetayurl']; ?>/<?php echo $PROJESonuc['seo']; ?><?php echo $html;?>">
											<h4 class="title"><?php echo $PROJESonuc['adi'];?></h4>
										</a>
									</div>
								</div>
							</div>
							<?php }?>
						</div>
						<div class="pagination">
							<ul>
							<?php if($limitayar['limit_sayfaproje'] < $total && $limitayar['limit_sayfaproje'] > 0){
							$showing = 3;
							if($page > 1){ $previous = $page - 1;?>
							<li class="onceki_sayfa"><a href="<?php echo $htc['projekategoriurl'];?>-<?php echo $Sonuc['seo']?>/<?php echo $previous;?><?php echo $html;?>"><i class="fas fa-angle-left"></i></a></li>
							<?php }
							for($i= $page - $showing; $i < $page + $showing + 1; $i++){
							if($i > 0 and $i <= $page_count){
							if($i == $page){?>
							<li><a class="secili" href="javascript:void(0)"><?php echo $i; ?></a></li>
							<?php }else{?>
							<li><a href="<?php echo $htc['projekategoriurl'];?>-<?php echo $Sonuc['seo']?>/<?php echo $i; ?><?php echo $html;?>"><?php echo $i; ?></a></li>
							<?php } } } if($page != $page_count){?>
							<?php  $next = $page +1;?>
							<li class="sonraki_sayfa"><a href="<?php echo $htc['projekategoriurl'];?>-<?php echo $Sonuc['seo']?>/<?php echo $next; ?><?php echo $html;?>"><i class="fas fa-angle-right"></i></a></li>
							<?php }} ?>	
							</ul>
						</div>
						<?php }else{?>							
						<div class="alert alert-warning text-left " style="width:100%;" role="alert">
							<p><?=@$dil['txt139'];?></p>
							<?=@$dil['txt140'];?></br>
							<?=@$dil['txt141'];?>
						</div>
						<?php }?>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
<!-- PAGE SECTİON BİTİŞ -->
<?php include('slider_menu.php');?>
