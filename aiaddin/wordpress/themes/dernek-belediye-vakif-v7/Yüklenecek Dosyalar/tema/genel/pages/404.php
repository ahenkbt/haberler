<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan20/<?php echo $arkaplan['arkaplan20'];?>" alt="<?=@$dil['txt19'];?>">
			<div class="slide-overlay"></div>
		</div>
		<div class="container banner-fix">
			<div class="row">
				<div class="col-lg-12 z-index-9">
					<ol class="breadcrumb">
						<li><a href="<?php echo $htc['anaurl'];?><?php echo $html;?>"> <i class="fa fa-home"></i> </a></li>						
						<li><?=@$dil['txt19'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<div class="col-lg-12 z-index-9">
					<div class="page-content">
						

						<div class="Oops">
							<div class="text margin-top-20 yapimAsamasindaFontSize"><?=@$dil['txt21'];?></div>
							<div class="text margin-top-20"><?=@$dil['txt22'];?></div>
							<div class="text margin-top-20" style="font-size:25px; color:#4d6379; font-weight:300;"><?=@$dil['txt23'];?></div>
							<div class="margin-top-20" style="font-size:25px; color:#4d6379; font-weight:300;">
								<?=@$dil['txt24'];?><br>
								<?=@$dil['txt25'];?> <br>
								<?=@$dil['txt26'];?> <br>
								<?=@$dil['txt27'];?> <br>
							</div>
							<div class="buttons container flexbox justify-center margin-top-70">
								<a class="button-border" href="<?php echo $htc['anaurl'];?><?php echo $html;?>"><?=@$dil['txt28'];?> <span class="icon"><i class="fas fa-home"></i></span></a>
								<a class="button-border" href="<?php echo $htc['iletisimurl'];?><?php echo $html;?>"><?=@$dil['txt29'];?> <span class="icon"><i class="fas fa-phone"></i></span></a>
							</div>
						</div>


					</div>
				</div>
			</div>
		</div>
	</div>
</section>
<!-- PAGE SECTİON BİTİŞ -->