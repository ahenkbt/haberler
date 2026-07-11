<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php 
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['aidatsonucurl']."' OR link = '".$htc['aidatsonucurl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
if($_SESSION['aidat_TC'] == null)
{
	header("Location:".$htc['aidaturl']."".$html."");
	exit();
}
if($_GET['sonuc']== null)
{
	header("Location:".$htc['aidaturl']."".$html."");
	exit();
}
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan23/<?php echo $arkaplan['arkaplan23'];?>" alt="<?=@$dil['txt48'];?>">
			<div class="slide-overlay"></div>
		</div>
		<div class="container banner-fix">
			<div class="row">
				<div class="col-lg-12 z-index-9">
					<ol class="breadcrumb">
						<li><a href="<?php echo $htc['anaurl'];?><?php echo $html;?>"> <i class="fa fa-home"></i> </a></li>						
						<?php if($menubas['menu_isim'] != ""){?>
						<li><a href="<?php echo($menubas['menu_url'] == "0" ? $menubas['link'] : $menubas['menu_url']);?>"><?php echo ilkbuyuk($menubas['menu_isim']);?></a></li>
						<?php }?>
						<li><a href="<?php echo $htc['aidaturl'];?><?php echo $html;?>"> <?=@$dil['txt30'];?></a></li>
						<li><a href="<?php echo $htc['aidatlisteurl'];?><?php echo $html;?>"><?=@$dil['txt36'];?></a></li>
						<li><?=@$dil['txt48'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<div class="col-lg-12 z-index-9">
					<div class="page-content">						

						<div class="row justify-content-center">
							<div class="col-md-12 mobilbagisbilgisayfa">
							<?php if(strip_tags($_GET['sonuc']) == 'basarili'){?>	
							<div class="alert alert-success text-left " style="width:100%;" role="alert">
							<p><strong><?=@$dil['txt49'];?></strong></p>
							<?=@$dil['txt50'];?><br>
							<?=@$dil['txt51'];?>					
							</div>
							<?php }else if(strip_tags($_GET['sonuc']) == 'hata'){?>
							<div class="alert alert-warning text-left " style="width:100%;" role="alert">
							<p><strong><?=@$dil['txt52'];?></strong></p>
							<?=@$dil['txt53'];?><br>
							<?=@$dil['txt54'];?>					
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
<?php include('slider_menu.php');?>