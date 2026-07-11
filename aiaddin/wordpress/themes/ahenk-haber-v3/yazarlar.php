<?php
/**
 * Ahenk Haber v3 — Yazarlar Sayfası (Birportal yazarlar.php uyumlu)
 * URL: /yazarlar
 */
get_header();
$yazarlar = get_users(array('role__in'=>array('administrator','editor','author'),'number'=>50,'orderby'=>'post_count','order'=>'DESC'));
?>
<main id="main-content" class="site-main">
  <div class="container" style="padding-top:24px;padding-bottom:40px">
    <div class="blok-header" style="display:flex;align-items:center;padding:10px 16px;background:var(--grad-header);border-radius:8px 8px 0 0;margin-bottom:0">
      <h1 style="margin:0;font-size:18px;font-weight:900;color:#fff"><i class="fa fa-pen-nib"></i> Yazarlarımız</h1>
    </div>
    <div style="background:#fff;border-radius:0 0 8px 8px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.07)">
      <div class="yazarlar-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
        <?php foreach ($yazarlar as $yazar) :
          $yazar_id    = $yazar->ID;
          $avatar_url  = get_avatar_url($yazar_id, array('size'=>120));
          $bio         = get_user_meta($yazar_id,'description',true);
          $unvan       = get_user_meta($yazar_id,'yazar_unvani',true);
          $haber_sayi  = count_user_posts($yazar_id, array('haber','post'));
          $fb          = get_user_meta($yazar_id,'yazar_facebook',true);
          $tw          = get_user_meta($yazar_id,'yazar_twitter',true);
        ?>
        <div class="yazar-kart" style="border:1px solid #f0f0f0;border-radius:10px;padding:20px;text-align:center;transition:.2s">
          <div style="position:relative;display:inline-block;margin-bottom:12px">
            <div class="hikaye-halka" style="width:80px;height:80px;border-radius:50%;padding:2px;background-image:var(--grad-header);display:inline-block">
              <img src="<?php echo esc_url($avatar_url); ?>" alt="<?php echo esc_attr($yazar->display_name); ?>"
                   style="width:76px;height:76px;border-radius:50%;object-fit:cover;border:2px solid #fff;display:block">
            </div>
          </div>
          <h3 style="font-size:15px;font-weight:800;margin:0 0 4px;color:#1a1a1a"><?php echo esc_html($yazar->display_name); ?></h3>
          <?php if($unvan):?><p style="font-size:11px;color:var(--renk-ana);font-weight:700;margin:0 0 8px;text-transform:uppercase"><?php echo esc_html($unvan); ?></p><?php endif;?>
          <?php if($bio):?><p style="font-size:12px;color:#666;line-height:1.5;margin:0 0 10px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden"><?php echo esc_html($bio); ?></p><?php endif;?>
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;font-size:12px;color:#aaa;margin-bottom:12px">
            <span><i class="fa fa-newspaper"></i> <?php echo (int)$haber_sayi; ?> haber</span>
          </div>
          <div style="display:flex;gap:8px;justify-content:center">
            <a href="<?php echo esc_url(get_author_posts_url($yazar_id)); ?>"
               style="flex:1;padding:7px 0;background-image:var(--grad-header);color:#fff;border-radius:5px;font-size:12px;font-weight:700;text-decoration:none">
              Haberleri
            </a>
            <?php if($fb||$tw):?>
            <div style="display:flex;gap:4px">
              <?php if($fb):?><a href="<?php echo esc_url($fb);?>" target="_blank" style="width:30px;height:30px;background:#1877f2;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px"><i class="fab fa-facebook-f"></i></a><?php endif;?>
              <?php if($tw):?><a href="<?php echo esc_url($tw);?>" target="_blank" style="width:30px;height:30px;background:#000;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px"><i class="fab fa-x-twitter"></i></a><?php endif;?>
            </div>
            <?php endif;?>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</main>
<?php get_footer(); ?>
