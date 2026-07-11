<!DOCTYPE html>
<html lang="tr">

    <head>
        <title><?php echo baslik;?></title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, minimum-scale=1.0, maximum-scale=1.0" />
        <link rel="shortcut icon" href="<?php echo tema;?>/uploads/favicon/<?php echo fav;?>">
        <!-- CSS start here -->
        <link rel="stylesheet" type="text/css" href="<?php echo tema;?>/bakimda/css/bootstrap.min.css" media="screen">
        <link rel="stylesheet" type="text/css" href="<?php echo tema;?>/bakimda/css/styles.css" />
        <link rel="stylesheet" type="text/css" href="<?php echo tema;?>/bakimda/css/font-awesome.css">
        <link rel="stylesheet" type="text/css" href="<?php echo tema;?>/bakimda/css/animate.css" />
        <!-- CSS end here -->
        <!-- Google fonts start here -->
        <link href='http://fonts.googleapis.com/css?family=Open+Sans' rel='stylesheet' type='text/css'>
        <link href='http://fonts.googleapis.com/css?family=Roboto:300' rel='stylesheet' type='text/css'>
        <!-- Google fonts end here -->
    </head>

    <body class="tictoc">
        <!-- Preloader start here -->
        <div id="preloader">
            <div id="status"><img src="<?php echo tema;?>/uploads/logo/<?php echo logo;?>" alt="<?php echo firma_adi;?>"></div>
        </div>
        <!-- Preloader end here -->

        <!-- Main container start here -->
        <section class="main-wrapper">
            <!-- Logo start here -->
            <section id="logo" class="fade-down">
                <a href="index.html" title="<?php echo firma_adi;?>"><img src="<?php echo tema;?>/uploads/logo/footer/<?php echo footerlogo;?>" alt="<?php echo firma_adi;?>"></a>
            </section>
            <section class="slogan fade-down blackFont">
                <!-- <img src="img/img-slogan.png" alt="TICTOC - Coming Soon HTML Template"> -->
                <h2><?php echo $bakim_modu['baslik'];?></h2>
                <p><?php echo $bakim_modu['aciklama'];?></p>
            </section>
            <!-- Slogan end here -->
            <!-- Count Down start here -->
            <section class="count-down-wrapper fade-down">
                <ul class="row count-down">
                    <li>
                        <input class="knob days" data-readonly="true" data-min="0" data-max="365" data-width="260" data-height="260" data-thickness="0.07" data-fgcolor="#34aadc" data-bgColor="#e1e2e6" data-angleOffset="180">
                        <span id="days-title">GÜN</span>
                    </li>
                    <li>
                        <input class="knob hour" data-readonly="true" data-min="0" data-max="24" data-width="260" data-height="260" data-thickness="0.07" data-fgcolor="#4cd964" data-bgColor="#e1e2e6" data-angleOffset="180">
                        <span id="hours-title">SAAT</span>
                    </li>
                    <li>
                        <input class="knob minute" data-readonly="true" data-min="0" data-max="60" data-width="260" data-height="260" data-thickness="0.07" data-fgcolor="#ff9500" data-bgColor="#e1e2e6" data-angleOffset="180">
                        <span id="mins-title">DAKİKA</span>
                    </li>
                    <li>
                        <input class="knob second" data-readonly="true" data-min="0" data-max="60" data-width="260" data-height="260" data-thickness="0.07" data-fgcolor="#ff3b30" data-bgColor="#e1e2e6" data-angleOffset="180">
                        <span id="secs-title">SANİYE</span>
                    </li>
                </ul>
            </section>
            <!-- Count Down end here -->
            <!-- Newsletter start here -->
            <section class="newsletter row fade-down" style="margin-bottom:20px;">
				<!-- Buttons -->
				<center>
					<a class="btn btn-info" data-toggle="modal" data-target=".bs-example-modal-lg2" data-placement="left">
						<i class="fa fa-envelope-o"></i> İLETİŞİM
					</a>
				</center>
            </section>
            <!-- Newsletter end here -->
            <!-- Social icons start here -->
            <ul class="connect-us row fade-down">
                <li><a target="_blank" href="<?php echo facebook;?>" class="fb tool-tip" title="Facebook"><i class="fa fa-facebook"></i></a></li>
                <li><a target="_blank" href="<?php echo twitter;?>" class="twitter tool-tip" title="Twitter"><i class="fa fa-twitter"></i></a></li>
                <li><a target="_blank" href="<?php echo instagram;?>" class="instagram tool-tip" title="İnstagram"><i class="fa fa-instagram"></i></a></li>
                <li><a target="_blank" href="<?php echo linkedin;?>" class="linkedin tool-tip" title="Linkedin"><i class="fa fa-linkedin"></i></a></li>
                <li><a target="_blank" href="<?php echo youtube;?>" class="ytube tool-tip" title="You Tube"><i class="fa fa-youtube-play"></i></a></li>
            </ul>
            <!-- Social icons end here -->
            <!-- Footer start here -->
            <footer class="fade-down">
                <p><?php echo copyright;?></p>
            </footer>
            <!-- Footer end here -->
        </section>
        <!-- Contact start here -->
        <div class="modal fade bs-example-modal-lg2" role="dialog" aria-hidden="true" data-keyboard="true" data-backdrop="static" tabindex="-1">
            <div class="madalData">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content pop-up pop-up-cnt">
                        <h3>İLETİŞİM BİLGİLERİMİZ</h3>
                        <div class="clearfix cnt-wrap">
                            <div class="col-md-4 col-sm-4">
                                <i class="fa fa-phone"></i>
                                <h4>Telefon</h4>
                                <p>T. <a href="tel:<?php echo telefon;?>"> <?php echo telefon;?></a></p>
                                <p>F. <a href="tel:<?php echo fax;?>"> <?php echo telefon;?></a></p>
                            </div>

                            <div class="col-md-4 col-sm-4">
                                <i class="fa fa-envelope-o"></i>
                                <h4>Email</h4>
                                <p><a href="mailto:<?php echo email;?>"> <?php echo email;?></a></p>
                            </div>
                            <div class="col-md-4 col-sm-4">
                                <i class="fa fa-map-marker"></i>
                                <h4>Adres</h4>
                                <p><?php echo adres;?></p>
                            </div>
                        </div>
                        <a href="#" class="fa fa-times cls-pop" data-dismiss="modal"></a>
                    </div>
                </div>
            </div>
        </div>
        <!-- Contact end here -->
        <!-- Main container start here -->
        <!-- Javascript framework and plugins start here -->
        <script type="text/javascript" src="<?php echo tema;?>/bakimda/js/jquery.js"></script>
        <script type="text/javascript" src="<?php echo tema;?>/bakimda/js/bootstrap.min.js"></script>
        <script src="<?php echo tema;?>/bakimda/js/jquery.validate.min.js"></script>
        <script src="<?php echo tema;?>/bakimda/js/modernizr.js"></script>
        <script type="text/javascript" src="<?php echo tema;?>/bakimda/js/appear.js"></script>
        <script type="text/javascript">
        $(window).load(function() {
            $('#status').fadeOut();
            $('#preloader').delay(350).fadeOut('slow');
            $('body').delay(350).css({
                'overflow': 'visible'
            });
			<?php $acilis_tarih = explode("-",$bakim_modu['acilis_tarih']);?>
			$(".count-down").ccountdown(<?php echo $acilis_tarih[0]; ?>,<?php echo $acilis_tarih[1]; ?>,<?php echo $acilis_tarih[2]; ?>,'<?php echo $bakim_modu['acilis_zaman'];?>');
        })
        </script>
        <script src="<?php echo tema;?>/bakimda/js/jquery.knob.js"></script>
        <script src="<?php echo tema;?>/bakimda/js/jquery.ccountdown.js"></script>
        <script src="<?php echo tema;?>/bakimda/js/init.js"></script>
        <script src="<?php echo tema;?>/bakimda/js/general.js"></script>
        <!-- Javascript framework and plugins end here -->
    </body>

</html>