<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php 
$str = '';
if(@strip_tags($_GET['baslama_tarih']) && @strip_tags($_GET['bitis_tarih']))
{
    $str .= " AND baslama_tarih AND bitis_tarih BETWEEN '{$_GET['baslama_tarih']}' AND '{$_GET['bitis_tarih']}'";
}

if(@strip_tags($_GET['baslama_tarih']))
{
    $str .= " AND baslama_tarih >= '{$_GET['baslama_tarih']}'";
}

if(@strip_tags($_GET['bitis_tarih']))
{
    $str .= " AND bitis_tarih <= '{$_GET['bitis_tarih']}'";
}	

if(strip_tags($_GET['kelime']) != "")
{	
	$kelime = trim($_GET['kelime']);
	$str.= " AND adi LIKE '%$kelime%'";
}
$page = @intval($_GET['s']);
if(!$page) $page = 1;
$ttsorgu = $db->prepare("SELECT COUNT(*) FROM ihaleler WHERE durum = ? AND dil = ? $str");
$ttsorgu->execute(array("1",$_SESSION['k_dil']));
$total = $ttsorgu->fetchColumn();
$limit= $limitayar['limit_sayfaihale'];
$page_count = ceil($total/$limit);
if($page > $page_count) $page = 1;
$show = $page * $limit - $limit;
$BSorgu = $db->prepare("SELECT * FROM ihaleler WHERE durum = ? AND dil = ? $str ORDER BY sira ASC LIMIT $show,$limit");
$BSorgu->execute(array("1",$_SESSION['k_dil']));
$Bislem = $BSorgu->fetchALL(PDO::FETCH_ASSOC);
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['ihaleurl']."' OR link = '".$htc['ihaleurl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan11/<?php echo $arkaplan['arkaplan11'];?>" alt="<?=@$dil['txt167'];?>">
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
						<li><?=@$dil['txt167'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<?php include('leftbar.php');?>
				<div class="col-lg-<?php echo($moduller['alan23'] == "1" ? '9' : '12');?> col-md-<?php echo($moduller['alan23'] == "1" ? '7' : '12');?> z-index-9">
					<div class="page-content">
						<h2 class="page-title"><?=@$dil['txt167'];?></h2>
						<form  method="get" role="form" novalidate="novalidate" style="border-bottom: 1px solid #e9ebeb;">
							<div class="row">
								<div class="col-md-3 col-sm-6">
									<div class="form-group">
										<label><?=@$dil['txt168'];?></label>
										<div class="input-group date">
											<input autocomplete="off" class="form-control" name="baslama_tarih" type="date" value="<?php echo strip_tags($_GET['baslama_tarih']);?>">
										</div>
									</div>
								</div>
								<div class="col-md-3 col-sm-6">
									<label><?=@$dil['txt169'];?></label>
									<div class="form-group">
										<div class="input-group date">
											<input autocomplete="off" class="form-control" name="bitis_tarih" type="date" value="<?php echo strip_tags($_GET['bitis_tarih']);?>">
										</div>
									</div>
								</div>
								<div class="col-md-4 col-sm-9 col-xs-8">
									<label><?=@$dil['txt170'];?></label>
									<div class="form-group">
										<input type="text" class="form-control" name="kelime" value="<?php echo strip_tags($_GET['kelime']);?>">
									</div>
								</div>
								<div class="col-md-2 col-sm-3 col-xs-4">
									<label></label>
									<div class="form-group">
										<button type="submit" class="form-button py-2 mt-4"><i class="fa fa-search" aria-hidden="true"></i> <?=@$dil['txt171'];?></button>
									</div>
								</div>
							</div>
						</form>
						<?php if($BSorgu->rowCount() != "0"){?>
						<div class="row mr-0 ml-0 etkinlik-box">							
							<?php foreach ( $Bislem as $BSonuc ){?>
							<div class="col-lg-<?php echo $limitayar['limit_ihale'];?> py-2">
								<div class="row">
									<div class="col-lg-2 col-md-12 full-center">
										<div class="e-tarih">
											<p><?php echo tarih_gun($BSonuc['baslama_tarih']);?></p>
											<p><?php echo tarih_ay($BSonuc['baslama_tarih']);?></p>
											<p><?php echo tarih_yil($BSonuc['baslama_tarih']);?></p>
										</div>
									</div>
									<div class="col-lg-10 col-md-12">
										<div class="e-content">
											<a href="<?php echo $htc['ihaledetayurl']; ?>/<?php echo $BSonuc['seo']; ?><?php echo $html;?>">
												<h5><?php echo $BSonuc['adi'];?></h5>
											</a>
											<?php if($BSonuc['ihale_durum'] == 0){?><span class="badge badge-info p-2"><i class="fal fa-sync"></i> <?=@$dil['txt1159'];?></span><?php }?>
											<?php if($BSonuc['ihale_durum'] == 1){?><span class="badge badge-success p-2"><i class="fal fa-chevron-circle-down"></i> <?=@$dil['txt160'];?> </span><?php }?>
											<?php if($BSonuc['ihale_durum'] == 2){?><span class="badge badge-danger p-2"><i class="fal fa-times-circle"></i> <?=@$dil['txt161'];?> </span><?php }?>
											<?php if($BSonuc['ihale_durum'] == 3){?><span class="badge badge-warning p-2"><i class="fal fa-question-circle"></i> <?=@$dil['txt162'];?> </span><?php }?>
											<p><?php echo kisa(strip_tags($BSonuc['aciklama']),300);?></p>
										</div>
									</div>
								</div>								
							</div>
							<?php }?>
						</div>
						<div class="pagination">
							<ul>
							<?php if($limitayar['limit_sayfaihale'] < $total && $limitayar['limit_sayfaihale'] > 0){
							$showing = 3;
							if($page > 1){ $previous = $page - 1;?>
							<li class="onceki_sayfa"><a href="<?php echo $htc['ihaleurl'];?>/<?php echo $previous;?><?php echo $html;?>"><i class="fas fa-angle-left"></i></a></li>
							<?php }
							for($i= $page - $showing; $i < $page + $showing + 1; $i++){
							if($i > 0 and $i <= $page_count){
							if($i == $page){?>
							<li><a class="secili" href="javascript:void(0)"><?php echo $i; ?></a></li>
							<?php }else{?>
							<li><a href="<?php echo $htc['ihaleurl'];?>/<?php echo $i; ?><?php echo $html;?>"><?php echo $i; ?></a></li>
							<?php } } } if($page != $page_count){?>
							<?php  $next = $page +1;?>
							<li class="sonraki_sayfa"><a href="<?php echo $htc['ihaleurl'];?>/<?php echo $next; ?><?php echo $html;?>"><i class="fas fa-angle-right"></i></a></li>
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
</section>
<!-- PAGE SECTİON BİTİŞ -->
<?php include('slider_menu.php');?>