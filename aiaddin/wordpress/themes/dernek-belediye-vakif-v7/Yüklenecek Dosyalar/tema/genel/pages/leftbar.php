<?php if($moduller['alan23'] == "1"){?>
<div class="col-lg-3 col-md-5 z-index-9">
	<div class="kolay-menu">
		<h4><?=@$dil['txt185'];?> <button class="col-kolaymenu"><span class="icon"><i class="fas fa-bars"></i></span></button></h4>
		<ul>
		<?php $KOLAYSorgu = $db->prepare("SELECT * FROM kolaymenu WHERE menu_durum = ? AND dil = ? ORDER BY menu_sira ASC");
		$KOLAYSorgu->execute(array("1",$_SESSION['k_dil']));
		$KOLAYislem = $KOLAYSorgu->fetchALL(PDO::FETCH_ASSOC);?>
			<?php foreach ( $KOLAYislem as $KOLAYSonuc ){?>
			<li class="hover-bar"> <a <?php echo($KOLAYSonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo($KOLAYSonuc['menu_url'] == "0" ? $KOLAYSonuc['link'] : $KOLAYSonuc['menu_url'].$html); ?>"> <?php echo $KOLAYSonuc['menu_isim']?> </a></li>
			<?php }?>
		</ul>
		<div class="social">
			<h4><?=@$dil['txt186'];?></h4>
			<?php if(facebook){?><a title="facebook" href="<?php echo facebook;?>"><i class="fab fa-facebook-f"></i></a><?php }?>
			<?php if(twitter){?><a title="telegram" href="<?php echo twitter;?>"><i class="fab fa-twitter"></i></a><?php }?>
			<?php if(instagram){?><a title="instagram" href="<?php echo instagram;?>"><i class="fab fa-instagram"></i></a><?php }?>
			<?php if(linkedin){?><a title="linkedin" href="<?php echo linkedin;?>"><i class="fab fa-linkedin-in"></i></a><?php }?>
			<?php if(youtube){?><a title="youtube" href="<?php echo youtube;?>"><i class="fab fa-youtube"></i></a><?php }?>
		</div>
	</div>

	<?php if($moduller['alan26'] == "1"){?>
	<div class="bize-ulasin-sidebar mt-3 mb-4 d-inline-block">
		<h6><?=@$dil['txt187'];?></h6>
		<h5><?=@$dil['txt188'];?></h5>
		<h5><?=@$dil['txt189'];?></h5>
		<p><?=@$dil['txt190'];?></p>
		<div class="mt-4">
			<a href="<?php echo $htc['iletisimurl'];?><?php echo $html;?>"><?=@$dil['txt174'];?></a>
		</div>
	</div>
	<?php }?>

	<?php if($moduller['alan25'] == "1"){?>
	<div class="baskan-kosesi mt-4">
		<h5><?=@$dil['txt191'];?></h5>
		<div class="inner-box">
			<div class="image-box">
				<img src="<?php echo tema;?>/uploads/baskan/<?php echo $baskan['gorsel2']; ?>" alt="baskan">
				<ul>
					<?php if($baskan['facebook']){?><li><a title="facebook" href="<?php echo $baskan['facebook'];?>"><i class="fab fa-facebook-f"></i></a></i><?php }?>
					<?php if($baskan['twitter']){?><li><a title="telegram" href="<?php echo $baskan['twitter'];?>"><i class="fab fa-twitter"></i></a></i><?php }?>
					<?php if($baskan['instagram']){?><li><a title="instagram" href="<?php echo $baskan['instagram'];?>"><i class="fab fa-instagram"></i></a></i><?php }?>
					<?php if($baskan['linkedin']){?><li><a title="linkedin" href="<?php echo $baskan['linkedin'];?>"><i class="fab fa-linkedin-in"></i></a></i><?php }?>
					<?php if($baskan['youtube']){?><li><a title="youtube" href="<?php echo $baskan['youtube'];?>"><i class="fab fa-youtube"></i></a></i><?php }?>
				</ul>
			</div>
			<div class="link-box">
				<ul>
				<?php $BASKANSorgu = $db->prepare("SELECT * FROM baskanmenu WHERE menu_durum = ? AND dil = ? ORDER BY menu_sira ASC");
				$BASKANSorgu->execute(array("1",$_SESSION['k_dil']));
				$BASKANislem = $BASKANSorgu->fetchALL(PDO::FETCH_ASSOC);?>
					<?php foreach ( $BASKANislem as $BASKANSonuc ){?>
					<li>
						<a <?php echo($BASKANSonuc['sekme'] == 1 ? 'target="_blank"' : '');?> href="<?php echo($BASKANSonuc['menu_url'] == "0" ? $BASKANSonuc['link'] : $BASKANSonuc['menu_url'].$html); ?>">
							<span><?php echo $BASKANSonuc['menu_isim']?></span>
							<span><i class="far fa-chevron-right"></i></span>
						</a>
					</li>
					<?php }?>									
				</ul>
			</div>
		</div>
	</div>
	<?php }?>
</div>
<?php }?>