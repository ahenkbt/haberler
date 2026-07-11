<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php 
if($_SESSION['aidat_TC'] == null)
{
	header("Location:".$htc['aidaturl']."".$html."");
	exit();
}
if(strip_tags(isset($_GET['id'])))
{
	$Sorgu = $db->prepare("SELECT * FROM aidatlar WHERE id = ? AND odeme = ?");
	$Sorgu->execute(array($_GET['id'],0));
	if($Sorgu->rowCount()){
		$Sonuc 		= $Sorgu->fetch(PDO::FETCH_ASSOC);
	}else{
		header("Location:".$url.(altklasor == "1" ? '/' : '')."404".$html."");
		exit();
	}
}
else
{
	header("Location:".$url.(altklasor == "1" ? '/' : '').$htc['aidatlisteurl'].$html."");
	exit();
}
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['aidatodemeurl']."' OR link = '".$htc['aidatodemeurl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan23/<?php echo $arkaplan['arkaplan23'];?>" alt="<?=@$dil['txt46'];?>">
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
						<li><?=@$dil['txt46'];?></li>
					</ol>
					<a href="javascript:history.back();" class="sayfa-geri"><span class="icon"><i class="fas fa-arrow-left"></i></span><?=@$dil['txt20'];?></a>
				</div>
				<div class="col-lg-12 z-index-9">
					<div class="page-content">
						
						<div class="iletisim-box pt-0">
							<div class="row ortala">
								<div class="col-lg-12">
									<div class="title text-center text-lg-left p-3">
										<h3><?php echo $Sonuc['adi'];?></h3>
										<p class="mb-0"><?=@$dil['txt47'];?> <?php echo $Sonuc['tc'];?></p>
									</div>

									<form action="_class/site_islem.php" method="post" autocomplete="off">										            
										<div style="width: 100%;margin: 0 auto;display: table;">
											<?php
											$merchant_id 		= magaza_no;
											$merchant_key 		= magaza_parola;
											$merchant_salt		= magaza_anahtar;
											$email				= email;
											$payment_amount		= intval(($Sonuc['ucret']-$Sonuc['oucret'])*100); //9.99 için 9.99 * 100 = 999 gönderilmelidir.
											$genel 				= number_format($Sonuc['ucret']-$Sonuc['oucret'], 2, ',', '.');
											$merchant_oid 		= time();
											$user_name 			= $Sonuc['adi'];
											$user_address 		= adres;
											$user_phone 			= telefon;
											$merchant_ok_url 	= "".url."".$htc['aidatsonucurl']."".$html."?sonuc=basarili";
											$merchant_fail_url 	= "".url."".$htc['aidatsonucurl']."".$html."?sonuc=hata";
											$user_basket 		= "";
											$user_basket		= base64_encode(json_encode(array(
												array("".$Sonuc['adi']."- ".ay_yil($Sonuc['tariha'])." Aidat Ödemesi ", $genel , 1) // 1. ürün (Ürün Ad - Birim Fiyat - Adet )
											)));
											
											############################################################################################

											## Kullanıcının IP adresi
											if( isset( $_SERVER["HTTP_CLIENT_IP"] ) ) {
												$ip = $_SERVER["HTTP_CLIENT_IP"];
											} elseif( isset( $_SERVER["HTTP_X_FORWARDED_FOR"] ) ) {
												$ip = $_SERVER["HTTP_X_FORWARDED_FOR"];
											} else {
												$ip = $_SERVER["REMOTE_ADDR"];
											}

											## !!! Eğer bu örnek kodu sunucuda değil local makinanızda çalıştırıyorsanız
											## buraya dış ip adresinizi (https://www.whatismyip.com/) yazmalısınız. Aksi halde geçersiz paytr_token hatası alırsınız.
											$user_ip=$ip;
											##

											## İşlem zaman aşımı süresi - dakika cinsinden
											$timeout_limit = "30";

											## Hata mesajlarının ekrana basılması için entegrasyon ve test sürecinde 1 olarak bırakın. Daha sonra 0 yapabilirsiniz.
											$debug_on = hata_mesaj;

											## Mağaza canlı modda iken test işlem yapmak için 1 olarak gönderilebilir.
											$test_mode = test_modu;

											$no_installment	= taksit; // Taksit yapılmasını istemiyorsanız, sadece tek çekim sunacaksanız 1 yapın

											## Sayfada görüntülenecek taksit adedini sınırlamak istiyorsanız uygun şekilde değiştirin.
											## Sıfır (0) gönderilmesi durumunda yürürlükteki en fazla izin verilen taksit geçerli olur.
											$max_installment = 0;

											$currency = "TL";
											
											####### Bu kısımda herhangi bir değişiklik yapmanıza gerek yoktur. #######
											$hash_str = $merchant_id .$user_ip .$merchant_oid .$email .$payment_amount .$user_basket.$no_installment.$max_installment.$currency.$test_mode;
											$paytr_token=base64_encode(hash_hmac('sha256',$hash_str.$merchant_salt,$merchant_key,true));
											$post_vals=array(
													'merchant_id'=>$merchant_id,
													'user_ip'=>$user_ip,
													'merchant_oid'=>$merchant_oid,
													'email'=>$email,
													'payment_amount'=>$payment_amount,
													'paytr_token'=>$paytr_token,
													'user_basket'=>$user_basket,
													'debug_on'=>$debug_on,
													'no_installment'=>$no_installment,
													'max_installment'=>$max_installment,
													'user_name'=>$user_name,
													'user_address'=>$user_address,
													'user_phone'=>$user_phone,
													'merchant_ok_url'=>$merchant_ok_url,
													'merchant_fail_url'=>$merchant_fail_url,
													'timeout_limit'=>$timeout_limit,
													'currency'=>$currency,
													'test_mode'=>$test_mode
												);
											
											$ch=curl_init();
											curl_setopt($ch, CURLOPT_URL, "https://www.paytr.com/odeme/api/get-token");
											curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
											curl_setopt($ch, CURLOPT_POST, 1) ;
											curl_setopt($ch, CURLOPT_POSTFIELDS, $post_vals);
											curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
											curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
											curl_setopt($ch, CURLOPT_FRESH_CONNECT, true);
											curl_setopt($ch, CURLOPT_TIMEOUT, 20);
											$result = @curl_exec($ch);

											if(curl_errno($ch))
												die("PAYTR IFRAME connection error. err:".curl_error($ch));

											curl_close($ch);
											
											$result=json_decode($result,1);
											if($result['status']=='success')
											{
												$token=$result['token'];													
												$ktarih 	= date('Y-m-d H:i:s');

												$sorgu = $db->prepare("INSERT INTO aidat_odemeler SET
													aid				= :aid,
													adi				= :adi,
													tc				= :tc,
													ucret			= :ucret,
													spno			= :spno,
													aciklama		= :aciklama,
													paytronay		= :paytronay,
													tarih			= :tarih,
													ip				= :ip");
												$Ekle = $sorgu->execute(array(
													'aid' 			=> $Sonuc['id'],
													'adi' 			=> $Sonuc['adi'],
													'tc' 			=> $Sonuc['tc'],
													'ucret' 			=> $Sonuc['ucret']-$Sonuc['oucret'],
													'spno' 			=> "#".$merchant_oid,
													'aciklama' 		=> $Sonuc['adi']."-".ay_yil($Sonuc['tariha'])." Aidat Ödemesi",
													'paytronay'		=> "0",
													'tarih'			=> $ktarih,
													'ip'			=> $user_ip
												));
											}
											else
											{
												die("PAYTR IFRAME failed. reason:".$result['reason']);
											}
											#########################################################################

											?>

											<!-- Ödeme formunun açılması için gereken HTML kodlar / Başlangıç -->
											<script src="https://www.paytr.com/js/iframeResizer.min.js"></script>
											<iframe src="https://www.paytr.com/odeme/guvenli/<?php echo $token;?>" id="paytriframe" frameborder="0" scrolling="no" style="width: 100%;"></iframe>
											<script>iFrameResize({},'#paytriframe');</script>
											<!-- Ödeme formunun açılması için gereken HTML kodlar / Bitiş -->

										</div>											
									</form>

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