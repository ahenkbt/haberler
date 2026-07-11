<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php 
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['bagissonucurl']."' OR link = '".$htc['bagissonucurl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
if($_SESSION['sepet'] == null)
{
	header("Location:".$htc['anaurl']."".$html."");
	exit();
}
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan22/<?php echo $arkaplan['arkaplan22'];?>" alt="<?=@$dil['txt137'];?>">
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
						<li><?=@$dil['txt137'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<div class="col-lg-12 z-index-9">
					<div class="page-content">
						
						<div class="container beyazbg">
							<!-- bağışlar bölümü-->
							<div class="row bs-wizard">

								<div class="col-md-4 bs-wizard-step complete">
									<div class="text-center bs-wizard-stepnum"><?=@$dil['txt119'];?></div>
									<div class="progress">
										<div class="progress-bar"></div>
									</div>
									<a href="<?php echo $htc['bagissepeturl'];?><?php echo $html;?>" class="bs-wizard-dot"></a>
								</div>

								<div class="col-md-4 bs-wizard-step complete">
									<!-- complete -->
									<div class="text-center bs-wizard-stepnum"><?=@$dil['txt120'];?></div>
									<div class="progress">
										<div class="progress-bar"></div>
									</div>
									<a href="<?php echo $htc['bagisodemeurl'];?><?php echo $html;?>" class="bs-wizard-dot"></a>
									<div class="bs-wizard-info text-center"></div>
								</div>


								<div class="col-md-4 bs-wizard-step active">
									<!-- active -->
									<div class="text-center bs-wizard-stepnum"><?=@$dil['txt121'];?></div>
									<div class="progress">
										<div class="progress-bar"></div>
									</div>
									<a href="javascript:;" class="bs-wizard-dot"></a>
								</div>
							</div>
							<div class="row justify-content-center py-5">
								<div class="col-md-10 mobilbagisbilgisayfa">
								<?php if(strip_tags($_GET['sonuc']) == 'basarili'){?>	
								<div class="alert alert-success text-left " style="width:100%;" role="alert">
								<p><strong><?=@$dil['txt49'];?></strong></p>
								<?=@$dil['txt50'];?><br>
								<?=@$dil['txt51'];?>					
								</div>
								<?php unset($_SESSION['sepet']);?>
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
	</div>
</section>
<!-- PAGE SECTİON BİTİŞ -->
<?php include('slider_menu.php');?>