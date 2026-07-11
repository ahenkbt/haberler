<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php 
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['aidatlisteurl']."' OR link = '".$htc['aidatlisteurl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
if($_SESSION['aidat_TC'] == null)
{
	header("Location:".$htc['aidaturl']."".$html."");
	exit();
}
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan23/<?php echo $arkaplan['arkaplan23'];?>" alt="<?=@$dil['txt36'];?>">
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
						<li><?=@$dil['txt36'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<div class="col-lg-12 z-index-9">
					<div class="page-content">
						
						<div class="iletisim-box pt-0">
							<div class="row ortala">
							<div class="col-lg-12">
								<div class="title text-center text-lg-left p-3">
									<h3><?=@$dil['txt37'];?></h3>
									<p class="mb-0"><?=@$dil['txt38'];?></p>
								</div>

								<table class="table table-hover table-borderless ihale-table">
									<thead>
										<tr>
											<th style="width: 130px;"><?=@$dil['txt39'];?></th>
											<th style="width: 130px;"><?=@$dil['txt40'];?></th>
											<th><?=@$dil['txt41'];?></th>
											<th style="width: 130px;"><?=@$dil['txt42'];?></th>
											<th style="width: 130px;"></th>
										</tr>
									</thead>
									<tbody>
									<?php $Sorgu = $db->prepare("SELECT * FROM aidatlar WHERE odeme = ? AND BINARY tc = ? ORDER BY tariha ASC");
									$Sorgu->execute(array("0",$_SESSION['aidat_TC']));
									$islem = $Sorgu->fetchALL(PDO::FETCH_ASSOC);?>
									<?php if($Sorgu->rowCount()){?>
										<?php $toplam_ucret = 0;?>
										<?php foreach ( $islem as $Sonuc ){?>
										<tr>
											<td><?php echo ay_yil($Sonuc['tariha']);?></td>											
											<td><?php echo $Sonuc['tc'];?></td>
											<td><?php echo $Sonuc['adi'];?></td>
											<td><?php echo number_format($Sonuc['ucret']-$Sonuc['oucret'], 2, ',', '.');;?></td>
											<td><a href="<?php echo $htc['aidatodemeurl'];?>/<?php echo $Sonuc['id'];?><?php echo $html;?>" class="btn btn-success btn-sm text-white"><i class="far fa-credit-card"></i> <?=@$dil['txt43'];?></a></td>
										</tr>
										<?php $toplam_ucret += $Sonuc['ucret']-$Sonuc['oucret'];?>
										<?php }?>
										<tr>
											<td colspan="3"><?=@$dil['txt44'];?></td>
											<td><?php echo number_format($toplam_ucret, 2, ',', '.');;?></td>
											<td></td>
										</tr>
									<?php }else{?>
									<tr>
										<td colspan="5" class="text-center"><?=@$dil['txt45'];?></td>
									</tr>
									<?php }?>
									</tbody>
								</table>

							</div>
							</div>

						</div>

					</div>
				</div>
			</div>
		</div>
	</div>
</section>
<?php include('slider_menu.php');?>