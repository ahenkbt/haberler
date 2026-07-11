<!-- HIZLI MENÜ BAŞLANGIÇ -->
<?php if($moduller['alan24'] == "1"){?>
<section class="hizli-menu my-5">
	<div class="container-fluid">
		<div class="row">
			<div class="col-12">
				<div class="custom-owl-nav hizlimenu-nav"></div>
				<div class="owl-carousel owl-carousel-hizlimenu">
				<?php $SSSorgu = $db->prepare("SELECT * FROM slidermenu WHERE menu_durum = ? AND dil = ? ORDER BY menu_sira ASC");
				$SSSorgu->execute(array("1",$_SESSION['k_dil']));
				$SSislem = $SSSorgu->fetchALL(PDO::FETCH_ASSOC);?>
					<?php foreach ( $SSislem as $SSSonuc ){?>	
					<div class="item">
						<div class="hizli-menu-box">
							<a <?php echo($SSSonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo($SSSonuc['menu_url'] == "0" ? $SSSonuc['link'] : $SSSonuc['menu_url']); ?>" style="background:<?php echo $SSSonuc['menu_renk'];?>">
								<div class="hizli-icon">
									<i class="<?php echo $SSSonuc['menu_icon'];?>"></i>
								</div>
								<p><?php echo $SSSonuc['menu_isim'];?></p>
								<p><?php echo $SSSonuc['menu_kisa'];?></p>
							</a>
							<a <?php echo($SSSonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo($SSSonuc['menu_url'] == "0" ? $SSSonuc['link'] : $SSSonuc['menu_url']); ?>" class="hizli-back" style="background:<?php echo $SSSonuc['menu_renk'];?>e8">
								<span> <?=@$dil['txt70'];?></span>
							</a>
						</div>
					</div>
					<?php }?>
				</div>
			</div>
		</div>

	</div>
</section>
<?php }?>
<!-- HIZLI MENÜ BİTİŞ -->