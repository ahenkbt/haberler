<?php echo !defined("GUVENLIK") ? die("Erisim Engellendi!.") : null;?>
<?php 
$menubul 	= $db->query("SELECT * FROM menu WHERE menu_url = '".$htc['bagisodemeurl']."' OR link = '".$htc['bagisodemeurl']."' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
$menubas 	= $db->query("SELECT * FROM menu WHERE id = '{$menubul['menu_ust']}' AND dil = '{$_SESSION['k_dil']}'")->fetch(PDO::FETCH_ASSOC);
?>
<!-- PAGE SECTİON BAŞLANGIÇ -->
<section class="page-section">
	<div class="bg-white">
		<div class="col-12 p-0 banner">
			<img src="<?php echo tema;?>/uploads/arkaplan/arkaplan22/<?php echo $arkaplan['arkaplan22'];?>" alt="<?=@$dil['txt118'];?>">
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
						<li><?=@$dil['txt118'];?></li>
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

								<div class="col-md-4 bs-wizard-step active">
									<!-- complete -->
									<div class="text-center bs-wizard-stepnum"><?=@$dil['txt120'];?></div>
									<div class="progress">
										<div class="progress-bar"></div>
									</div>
									<a href="<?php echo $htc['bagisodemeurl'];?><?php echo $html;?>" class="bs-wizard-dot"></a>
									<div class="bs-wizard-info text-center"></div>
								</div>


								<div class="col-md-4 bs-wizard-step disabled">
									<!-- active -->
									<div class="text-center bs-wizard-stepnum"><?=@$dil['txt121'];?></div>
									<div class="progress">
										<div class="progress-bar"></div>
									</div>
									<a href="javascript:;" class="bs-wizard-dot"></a>
								</div>
							</div>
							<?php
							$cad 		= $_POST['adi'];
							$ctelefon 	= $_POST['cep'];
							$tc 			= $_POST['tc'];
							$tel 		= $_POST['tel'];
							$cemail 		= $_POST['email'];
							$cadres 		= $_POST['adres'];
							$aciklama 	= $_POST['aciklama'];
							$fiyat 		= $_POST['bagis_toplam'];
							$kelime 		= intval($fiyat*100);
							
							$merchant_id 		= magaza_no;
							$merchant_key 		= magaza_parola;
							$merchant_salt		= magaza_anahtar;
							$email				= $cemail;
							$payment_amount		= "".$kelime."";//9.99 TL
							$genel 				= number_format($fiyat, 2, ',', '.');
							$merchant_oid 		= time();
							$user_name 			= $cad;
							$user_address 		= $cadres;
							$user_phone 			= $ctelefon;
							$merchant_ok_url 	= "".url."".$htc['bagissonucurl']."".$html."?sonuc=basarili";
							$merchant_fail_url 	= "".url."".$htc['bagissonucurl']."".$html."?sonuc=hata";
							
							// Müşterinin sepet içeriği - Ürün adedine göre çoğaltabilirsiniz
							$user_basket = "";

							$_basket = NULL;
							foreach ($_SESSION['sepet'] as $k => $v) {
								$_basket[] = [$v['adi'],$v['tutar'],1];
							}

							$user_basket = base64_encode(json_encode(
								$_basket
							));
							
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
							
							$currency = "TL";

							## Sayfada görüntülenecek taksit adedini sınırlamak istiyorsanız uygun şekilde değiştirin.
							## Sıfır (0) gönderilmesi durumunda yürürlükteki en fazla izin verilen taksit geçerli olur.
							$max_installment = 0;

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
							{
								die("PAYTR IFRAME connection error. err:".curl_error($ch));
							}
							curl_close($ch);
							
							$result=json_decode($result,1);

							if($result[status]=='success')
							{
								$token=$result[token];									
								$ktarih = date('Y-m-d');
								$tarih	= date('Y-m-d H:i:s');
								$tarih	= tarih($tarih);
								$ip		= ip();
								$sorgu = $db->prepare("INSERT INTO bagis_odeme SET
										adi			= :adi,
										cep			= :cep,
										tel 		= :tel,
										email 		= :email,
										adres 		= :adres,
										aciklama 	= :aciklama,
										bagislar 	= :bagislar,
										paytronay 	= :paytronay,
										fiyat 		= :fiyat,
										tc 			= :tc,
										sepet 		= :sepet,
										ip 			= :ip,
										odemetipi 	= :odemetipi,
										spno 		= :spno,
										ktarih 		= :ktarih,
										tarih 		= :tarih");
								$Ekle = $sorgu->execute(array(
										'adi' 		=> $cad,
										'cep' 		=> $ctelefon,
										'tel' 		=> $tel,
										'email' 		=> $cemail,
										'adres' 		=> $cadres,
										'aciklama' 	=> $aciklama,
										'bagislar' 	=> "BURAYA BAĞIŞLAR ÇEKİLECEK",
										'paytronay' => "0",
										'fiyat' 		=> $fiyat,
										'tc' 		=> $tc,
										'sepet'		=> json_encode($_SESSION['sepet']),
										'ip' 		=> $ip,
										'odemetipi' => "Kredi Kartı",
										'spno' 		=> "#".$merchant_oid,
										'ktarih' 	=> $ktarih,
										'tarih'		=> $tarih
									));								
							}
							else
							{
								die("PAYTR IFRAME failed. reason:".$result[reason]);
							}

							?>

							<script src="https://www.paytr.com/js/iframeResizer.min.js"></script>
							<iframe src="https://www.paytr.com/odeme/guvenli/<?php echo $token;?>" id="paytriframe" frameborder="0" scrolling="no" style="width: 100%;"></iframe>
							<script>iFrameResize({},'#paytriframe');</script>


						</div>

					</div>
				</div>
			</div>
		</div>
	</div>
</section>
<!-- PAGE SECTİON BİTİŞ -->
<?php include('slider_menu.php');?>