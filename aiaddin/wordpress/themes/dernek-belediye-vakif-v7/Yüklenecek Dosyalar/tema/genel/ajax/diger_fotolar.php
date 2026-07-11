<?php 
sleep(1);
ob_start();
session_start();
require_once('../../../_class/baglan.php');
require_once('../../../_class/fonksiyon.php');
require_once('../../../language/dil_'.$_SESSION['k_dil'].".php");
if($_POST)
{
	$id = $_POST['id'];
	$DIGERSorgu = $db->prepare("SELECT * FROM foto_galeri WHERE durum = ? AND dil = ? AND id < ? ORDER BY id DESC LIMIT 10");
	$DIGERSorgu->execute(array("1",$_SESSION['k_dil'],$id));
	$DIGERislem = $DIGERSorgu->fetchALL(PDO::FETCH_ASSOC);
	if($DIGERSorgu->rowCount() != "0"){
		foreach ( $DIGERislem as $DIGERSonuc ){?>
		<li class="is-active" id="<?php echo $DIGERSonuc['id']; ?>">
			<a href="<?php echo $htc['fotodetayurl']; ?>/<?php echo $DIGERSonuc['seo']; ?><?php echo $html;?>">
				<h3 class="text">
					<span class="icon"><i class="far fa-image"></i></span>
					<?php echo $DIGERSonuc['adi'];?> </h3>
				<div class="date"><?php echo tarih($DIGERSonuc['tarih']);?></div>
			</a>
		</li>
		<?php }
	}
	else
	{
		echo "yok";
	}
}
?>