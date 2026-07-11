<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php 
$page = @intval($_GET['s']);
if(!$page) $page = 1;
$ttsorgu = $db->prepare("SELECT COUNT(*) FROM meclis_kararlari WHERE durum = ? AND dil = ?");
$ttsorgu->execute(array("1",$_SESSION['k_dil']));
$total = $ttsorgu->fetchColumn();
$limit= $limitayar['limit_sayfakarar'];
$page_count = ceil($total/$limit);
if($page > $page_count) $page = 1;
$show = $page * $limit - $limit;
$BSorgu = $db->prepare("SELECT * FROM meclis_kararlari WHERE durum = ? AND dil = ? ORDER BY id DESC LIMIT $show,$limit");
$BSorgu->execute(array("1",$_SESSION['k_dil']));
$Bislem = $BSorgu->fetchALL(PDO::FETCH_ASSOC);
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['kararurl']."' OR link = '".$htc['kararurl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan7/<?php echo $arkaplan['arkaplan7'];?>" alt="<?=@$dil['txt192'];?>">
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
						<li><?=@$dil['txt192'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<?php include('leftbar.php');?>
				<div class="col-lg-<?php echo($moduller['alan23'] == "1" ? '9' : '12');?> col-md-<?php echo($moduller['alan23'] == "1" ? '7' : '12');?> z-index-9">
					<div class="page-content">
						<h2 class="page-title"><?=@$dil['txt192'];?></h2>
						<div class="documents">
						<?php if($BSorgu->rowCount() != "0"){?>
							<ul class="row mr-0 ml-0">							
								<?php foreach ( $Bislem as $BSonuc ){?>
								<li class="col-lg-<?php echo $limitayar['limit_karar'];?> col-md-<?php echo $limitayar['limit_karar'];?> pl-0 pr-0">
									<a href="<?php echo $htc['karardetayurl']; ?>/<?php echo $BSonuc['seo']; ?><?php echo $html;?>">
										<h3 class="text"><span class="icon"><i class="fas fa-align-right"></i></span><?php echo $BSonuc['adi'];?></h3>
										<div class="date"><?php echo $BSonuc['tarih'];?></div>
									</a>
									<?php if($BSonuc['spot']){?>
									<div class="documents-sub">
										<div class="documents-sub-content">
											<div class="page-content-description"><?php echo $BSonuc['spot'];?></div>
										</div>
									</div>
									<?php }?>
								</li>
								<?php }?>					
							</ul>
							<div class="pagination">
								<ul>
								<?php if($limitayar['limit_sayfakarar'] < $total && $limitayar['limit_sayfakarar'] > 0){
								$showing = 3;
								if($page > 1){ $previous = $page - 1;?>
								<li class="onceki_sayfa"><a href="<?php echo $htc['kararurl'];?>/<?php echo $previous;?><?php echo $html;?>"><i class="fas fa-angle-left"></i></a></li>
								<?php }
								for($i= $page - $showing; $i < $page + $showing + 1; $i++){
								if($i > 0 and $i <= $page_count){
								if($i == $page){?>
								<li><a class="secili" href="javascript:void(0)"><?php echo $i; ?></a></li>
								<?php }else{?>
								<li><a href="<?php echo $htc['kararurl'];?>/<?php echo $i; ?><?php echo $html;?>"><?php echo $i; ?></a></li>
								<?php } } } if($page != $page_count){?>
								<?php  $next = $page +1;?>
								<li class="sonraki_sayfa"><a href="<?php echo $htc['kararurl'];?>/<?php echo $next; ?><?php echo $html;?>"><i class="fas fa-angle-right"></i></a></li>
								<?php }} ?>	
								</ul>
							</div>
							<?php }else{?>
							<div class="alert alert-warning text-left" style="width:100%;" role="alert">
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
	</div>
</section>
<!-- PAGE SECTİON BİTİŞ -->
<?php include('slider_menu.php');?>