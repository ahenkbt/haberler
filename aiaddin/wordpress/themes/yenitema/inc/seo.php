<?php
/**
 * VKV Tema — SEO Modülü
 * Başlık, meta description, Open Graph, Twitter Card, canonical URL,
 * JSON-LD schema (Organization + Article + BreadcrumbList)
 *
 * Yoast/RankMath kurulu değilse bu modül devreye girer.
 * Kuruluysa kendi kendini devre dışı bırakır.
 */

if (!defined('ABSPATH')) exit;

/* ── Yoast / RankMath varsa bu modülü atla ── */
add_action('init', function() {
    if (defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION')) {
        remove_action('wp_head', 'tema_seo_head', 1);
        remove_filter('document_title_parts', 'tema_seo_title', 10);
    }
});

/* ════════════════════════════════════════════
   1. SAYFA BAŞLIĞI
════════════════════════════════════════════ */
add_filter('document_title_parts', 'tema_seo_title', 10);
function tema_seo_title($title) {
    if (is_singular()) {
        $custom = get_post_meta(get_the_ID(), '_vkv_seo_title', true);
        if ($custom) $title['title'] = $custom;
    }
    return $title;
}

/* ════════════════════════════════════════════
   2. HEAD META ÇIKIŞI
════════════════════════════════════════════ */
add_action('wp_head', 'tema_seo_head', 1);
function tema_seo_head() {
    global $post;

    /* ── Temel veriler ── */
    $site_name   = get_bloginfo('name');
    $site_desc   = get_bloginfo('description');
    $site_url    = home_url('/');
    $logo_id     = get_theme_mod('custom_logo');
    $logo_url    = $logo_id ? wp_get_attachment_image_url($logo_id, 'full') : '';

    /* ── Sayfa tipi ── */
    $is_single   = is_singular();
    $is_front    = is_front_page();
    $is_arch     = is_archive() || is_category() || is_tag();

    /* ── Başlık ── */
    if ($is_front) {
        $title = $site_name . ($site_desc ? ' — ' . $site_desc : '');
    } elseif ($is_single && $post) {
        $custom = get_post_meta($post->ID, '_vkv_seo_title', true);
        $title  = $custom ?: get_the_title($post->ID);
        $title .= ' — ' . $site_name;
    } elseif ($is_arch) {
        $title = single_cat_title('', false) ?: get_the_archive_title();
        $title .= ' — ' . $site_name;
    } else {
        $title = get_the_title() . ' — ' . $site_name;
    }

    /* ── Description ── */
    if ($is_front) {
        $desc = get_option('vkv_seo_site_desc', $site_desc ?: $site_name);
    } elseif ($is_single && $post) {
        $custom_desc = get_post_meta($post->ID, '_vkv_seo_desc', true);
        if ($custom_desc) {
            $desc = $custom_desc;
        } elseif ($post->post_excerpt) {
            $desc = wp_strip_all_tags($post->post_excerpt);
        } else {
            $desc = wp_trim_words(wp_strip_all_tags($post->post_content), 30, '');
        }
    } elseif ($is_arch) {
        $desc = strip_tags(category_description()) ?: (single_cat_title('', false) . ' — ' . $site_name);
    } else {
        $desc = $site_desc ?: $site_name;
    }
    $desc = esc_attr(wp_strip_all_tags($desc));

    /* ── Canonical URL ── */
    if ($is_front) {
        $canonical = $site_url;
    } elseif ($is_single && $post) {
        $canonical = get_permalink($post->ID);
    } elseif (is_category()) {
        $canonical = get_category_link(get_queried_object_id());
    } elseif (is_tag()) {
        $canonical = get_tag_link(get_queried_object_id());
    } else {
        $canonical = home_url($_SERVER['REQUEST_URI'] ?? '/');
    }

    /* ── OG Image ── */
    $og_image = '';
    if ($is_single && $post) {
        $og_image = get_the_post_thumbnail_url($post->ID, 'large');
        if (!$og_image) {
            // Custom field fallback
            $og_image = get_post_meta($post->ID, '_vkv_seo_image', true)
                     ?: get_post_meta($post->ID, 'wprss_item_thumbnail', true);
        }
    }
    if (!$og_image) {
        $og_image = get_option('vkv_seo_default_image', $logo_url);
    }

    /* ── OG Type ── */
    $og_type = ($is_single && $post && $post->post_type === 'post') ? 'article' : 'website';

    /* ── Robots ── */
    $robots = 'index,follow';
    if ($is_single && $post) {
        $custom_robots = get_post_meta($post->ID, '_vkv_seo_robots', true);
        if ($custom_robots) $robots = $custom_robots;
    }
    if (is_search() || is_404()) $robots = 'noindex,follow';

    /* ── Çıktı ── */
    echo "\n<!-- VKV SEO -->\n";

    // Temel meta
    echo '<meta name="description" content="' . $desc . '">' . "\n";
    echo '<meta name="robots" content="' . esc_attr($robots) . '">' . "\n";
    echo '<link rel="canonical" href="' . esc_url($canonical) . '">' . "\n";

    // Viewport (yoksa ekle)
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">' . "\n";

    // Open Graph
    echo '<meta property="og:title" content="' . esc_attr($title) . '">' . "\n";
    echo '<meta property="og:description" content="' . $desc . '">' . "\n";
    echo '<meta property="og:type" content="' . esc_attr($og_type) . '">' . "\n";
    echo '<meta property="og:url" content="' . esc_url($canonical) . '">' . "\n";
    echo '<meta property="og:site_name" content="' . esc_attr($site_name) . '">' . "\n";
    echo '<meta property="og:locale" content="tr_TR">' . "\n";
    if ($og_image) {
        echo '<meta property="og:image" content="' . esc_url($og_image) . '">' . "\n";
        echo '<meta property="og:image:width" content="1200">' . "\n";
        echo '<meta property="og:image:height" content="630">' . "\n";
    }
    if ($og_type === 'article' && $post) {
        echo '<meta property="article:published_time" content="' . get_the_date('c', $post->ID) . '">' . "\n";
        echo '<meta property="article:modified_time" content="' . get_the_modified_date('c', $post->ID) . '">' . "\n";
        $cats = get_the_category($post->ID);
        if ($cats) echo '<meta property="article:section" content="' . esc_attr($cats[0]->name) . '">' . "\n";
    }

    // Twitter Card
    echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
    echo '<meta name="twitter:title" content="' . esc_attr($title) . '">' . "\n";
    echo '<meta name="twitter:description" content="' . $desc . '">' . "\n";
    if ($og_image) echo '<meta name="twitter:image" content="' . esc_url($og_image) . '">' . "\n";
    $twitter = get_option('vkv_seo_twitter', '');
    if ($twitter) echo '<meta name="twitter:site" content="@' . esc_attr(ltrim($twitter,'@')) . '">' . "\n";

    // JSON-LD Schema
    tema_seo_schema($title, $desc, $og_image, $canonical, $og_type);

    echo "<!-- /VKV SEO -->\n";
}

/* ════════════════════════════════════════════
   3. JSON-LD SCHEMA
════════════════════════════════════════════ */
function tema_seo_schema($title, $desc, $image, $url, $type) {
    global $post;

    $site_name  = get_bloginfo('name');
    $site_url   = home_url('/');
    $logo_id    = get_theme_mod('custom_logo');
    $logo_url   = $logo_id ? wp_get_attachment_image_url($logo_id, 'full') : '';
    $tel        = get_option('vkv_iletisim_telefon', '');
    $adres      = get_option('vkv_iletisim_adres', '');
    $email      = get_option('vkv_iletisim_eposta', '');

    // Organization (her sayfada)
    $org = array(
        '@context'  => 'https://schema.org',
        '@type'     => 'Organization',
        'name'      => $site_name,
        'url'       => $site_url,
        '@id'       => $site_url . '#organization',
    );
    if ($logo_url) $org['logo'] = array('@type'=>'ImageObject','url'=>$logo_url);
    if ($tel)      $org['telephone'] = $tel;
    if ($adres)    $org['address'] = array('@type'=>'PostalAddress','streetAddress'=>$adres);
    if ($email)    $org['email'] = $email;

    $schemas = array($org);

    // Article schema (tekil yazılarda)
    if ($type === 'article' && $post) {
        $article = array(
            '@context'         => 'https://schema.org',
            '@type'            => 'NewsArticle',
            'headline'         => get_the_title($post->ID),
            'description'      => $desc,
            'url'              => $url,
            'datePublished'    => get_the_date('c', $post->ID),
            'dateModified'     => get_the_modified_date('c', $post->ID),
            'publisher'        => array('@id' => $site_url . '#organization'),
            'mainEntityOfPage' => array('@type'=>'WebPage','@id'=>$url),
        );
        if ($image) $article['image'] = array('@type'=>'ImageObject','url'=>$image);
        $author_id = $post->post_author;
        if ($author_id) {
            $article['author'] = array('@type'=>'Person','name'=>get_the_author_meta('display_name', $author_id));
        }
        $schemas[] = $article;
    }

    // BreadcrumbList
    $breadcrumbs = array(array('@type'=>'ListItem','position'=>1,'name'=>$site_name,'item'=>$site_url));
    if (!is_front_page()) {
        if (is_category()) {
            $breadcrumbs[] = array('@type'=>'ListItem','position'=>2,'name'=>single_cat_title('',false),'item'=>$url);
        } elseif ($post) {
            $cats = get_the_category($post->ID);
            if ($cats) {
                $breadcrumbs[] = array('@type'=>'ListItem','position'=>2,'name'=>$cats[0]->name,'item'=>get_category_link($cats[0]->term_id));
            }
            $breadcrumbs[] = array('@type'=>'ListItem','position'=>count($breadcrumbs)+1,'name'=>get_the_title($post->ID),'item'=>$url);
        }
        $schemas[] = array('@context'=>'https://schema.org','@type'=>'BreadcrumbList','itemListElement'=>$breadcrumbs);
    }

    foreach ($schemas as $schema) {
        echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>' . "\n";
    }
}

/* ════════════════════════════════════════════
   4. SEO META KUTUSU (Admin — Her yazıda)
════════════════════════════════════════════ */
add_action('add_meta_boxes', 'tema_seo_meta_box');
function tema_seo_meta_box() {
    $post_types = get_post_types(array('public'=>true));
    foreach ($post_types as $pt) {
        add_meta_box('vkv_seo_meta', '🔍 SEO Ayarları', 'tema_seo_meta_box_render', $pt, 'normal', 'default');
    }
}

function tema_seo_meta_box_render($post) {
    wp_nonce_field('vkv_seo_meta_nonce', 'vkv_seo_nonce');
    $seo_title  = get_post_meta($post->ID, '_vkv_seo_title', true);
    $seo_desc   = get_post_meta($post->ID, '_vkv_seo_desc', true);
    $seo_robots = get_post_meta($post->ID, '_vkv_seo_robots', true) ?: 'index,follow';
    $seo_image  = get_post_meta($post->ID, '_vkv_seo_image', true);
    ?>
    <style>
    .vkv-seo-box{display:grid;gap:14px;padding:4px 0}
    .vkv-seo-row label{display:block;font-size:12px;font-weight:600;color:#1e293b;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
    .vkv-seo-row input,.vkv-seo-row textarea,.vkv-seo-row select{width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:3px;font-size:13px;font-family:inherit;box-sizing:border-box}
    .vkv-seo-row input:focus,.vkv-seo-row textarea:focus{border-color:#8B1A1A;outline:none;box-shadow:0 0 0 2px rgba(139,26,26,.1)}
    .vkv-seo-say{font-size:11px;color:#94a3b8;margin-top:3px;text-align:right}
    .vkv-seo-say.uyari{color:#d97706}
    .vkv-seo-say.iyi{color:#16a34a}
    .vkv-seo-onizleme{background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:12px 14px;font-size:12px}
    .vkv-seo-onizleme .s-url{color:#1a0dab;font-size:12px;margin-bottom:2px}
    .vkv-seo-onizleme .s-baslik{font-size:17px;color:#1a0dab;font-weight:400;margin-bottom:3px;line-height:1.3;max-width:600px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .vkv-seo-onizleme .s-desc{color:#4d5156;font-size:13px;max-width:600px;line-height:1.5}
    </style>
    <div class="vkv-seo-box">

      <!-- Google Önizlemesi -->
      <div class="vkv-seo-row">
        <label>🔍 Google Önizlemesi</label>
        <div class="vkv-seo-onizleme">
          <div class="s-url" id="vkv_seo_url_prv"><?php echo esc_html(home_url('/' . $post->post_name)); ?></div>
          <div class="s-baslik" id="vkv_seo_title_prv"><?php echo $seo_title ?: esc_html(get_the_title($post->ID)); ?></div>
          <div class="s-desc" id="vkv_seo_desc_prv"><?php echo $seo_desc ?: esc_html(wp_trim_words(wp_strip_all_tags($post->post_content ?: $post->post_excerpt), 25, '...')); ?></div>
        </div>
      </div>

      <!-- SEO Başlık -->
      <div class="vkv-seo-row">
        <label for="vkv_seo_title">SEO Başlığı <span style="color:#94a3b8;font-weight:400">(boş bırakırsanız sayfa başlığı kullanılır)</span></label>
        <input type="text" id="vkv_seo_title" name="_vkv_seo_title" value="<?php echo esc_attr($seo_title); ?>"
               placeholder="<?php echo esc_attr(get_the_title($post->ID)); ?>" maxlength="70">
        <div class="vkv-seo-say" id="vkv_title_say">0 / 70 karakter</div>
      </div>

      <!-- Meta Açıklaması -->
      <div class="vkv-seo-row">
        <label for="vkv_seo_desc">Meta Açıklaması</label>
        <textarea id="vkv_seo_desc" name="_vkv_seo_desc" rows="3" maxlength="160"
                  placeholder="Sayfa için kısa açıklama (120–160 karakter önerilir)"><?php echo esc_textarea($seo_desc); ?></textarea>
        <div class="vkv-seo-say" id="vkv_desc_say">0 / 160 karakter</div>
      </div>

      <!-- OG Image -->
      <div class="vkv-seo-row">
        <label for="vkv_seo_image">OG Görseli <span style="color:#94a3b8;font-weight:400">(boş = öne çıkarılan görsel)</span></label>
        <input type="url" id="vkv_seo_image" name="_vkv_seo_image" value="<?php echo esc_attr($seo_image); ?>"
               placeholder="https://...">
      </div>

      <!-- Robots -->
      <div class="vkv-seo-row">
        <label for="vkv_seo_robots">Robots</label>
        <select id="vkv_seo_robots" name="_vkv_seo_robots" style="width:auto">
          <option value="index,follow"   <?php selected($seo_robots,'index,follow'); ?>>index, follow (varsayılan)</option>
          <option value="noindex,follow" <?php selected($seo_robots,'noindex,follow'); ?>>noindex, follow</option>
          <option value="index,nofollow" <?php selected($seo_robots,'index,nofollow'); ?>>index, nofollow</option>
          <option value="noindex,nofollow" <?php selected($seo_robots,'noindex,nofollow'); ?>>noindex, nofollow</option>
        </select>
      </div>

    </div>
    <script>
    (function(){
      var titleEl  = document.getElementById('vkv_seo_title');
      var descEl   = document.getElementById('vkv_seo_desc');
      var titleSay = document.getElementById('vkv_title_say');
      var descSay  = document.getElementById('vkv_desc_say');
      var titlePrv = document.getElementById('vkv_seo_title_prv');
      var descPrv  = document.getElementById('vkv_seo_desc_prv');

      function sayColor(el, n, min, max) {
        el.textContent = n + ' / ' + max + ' karakter';
        el.className = 'vkv-seo-say ' + (n < min ? '' : (n <= max ? 'iyi' : 'uyari'));
      }

      if (titleEl) {
        titleEl.addEventListener('input', function(){
          sayColor(titleSay, this.value.length, 30, 70);
          if (titlePrv) titlePrv.textContent = this.value || titlePrv.getAttribute('data-default') || '';
        });
        sayColor(titleSay, titleEl.value.length, 30, 70);
      }
      if (descEl) {
        descEl.addEventListener('input', function(){
          sayColor(descSay, this.value.length, 120, 160);
          if (descPrv) descPrv.textContent = this.value || '';
        });
        sayColor(descSay, descEl.value.length, 120, 160);
      }
    })();
    </script>
    <?php
}

add_action('save_post', 'tema_seo_meta_save', 10, 2);
function tema_seo_meta_save($post_id, $post) {
    if (!isset($_POST['vkv_seo_nonce'])) return;
    if (!wp_verify_nonce($_POST['vkv_seo_nonce'], 'vkv_seo_meta_nonce')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    $fields = array(
        '_vkv_seo_title'  => 'sanitize_text_field',
        '_vkv_seo_desc'   => 'sanitize_textarea_field',
        '_vkv_seo_image'  => 'esc_url_raw',
        '_vkv_seo_robots' => 'sanitize_text_field',
    );
    foreach ($fields as $key => $fn) {
        if (isset($_POST[$key])) {
            update_post_meta($post_id, $key, $fn($_POST[$key]));
        }
    }
}

/* ════════════════════════════════════════════
   5. GENEL SEO AYARLARI (Ayarlar > SEO)
════════════════════════════════════════════ */
add_action('admin_menu', function() {
    add_options_page('VKV SEO Ayarları', '🔍 VKV SEO', 'manage_options', 'vkv-seo-settings', 'tema_seo_settings_render');
});

function tema_seo_settings_render() {
    if (!current_user_can('manage_options')) return;

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('vkv_seo_settings')) {
        update_option('vkv_seo_site_desc',      sanitize_textarea_field($_POST['site_desc'] ?? ''));
        update_option('vkv_seo_default_image',  esc_url_raw($_POST['default_image'] ?? ''));
        update_option('vkv_seo_twitter',        sanitize_text_field($_POST['twitter'] ?? ''));
        update_option('vkv_iletisim_telefon',   sanitize_text_field($_POST['telefon'] ?? ''));
        update_option('vkv_iletisim_adres',     sanitize_text_field($_POST['adres'] ?? ''));
        update_option('vkv_iletisim_eposta',    sanitize_email($_POST['eposta'] ?? ''));
        echo '<div class="updated"><p>✅ Kaydedildi.</p></div>';
    }

    $site_desc    = get_option('vkv_seo_site_desc', get_bloginfo('description'));
    $def_image    = get_option('vkv_seo_default_image', '');
    $twitter      = get_option('vkv_seo_twitter', '');
    $telefon      = get_option('vkv_iletisim_telefon', '');
    $adres        = get_option('vkv_iletisim_adres', '');
    $eposta       = get_option('vkv_iletisim_eposta', '');
    ?>
    <div class="wrap">
      <h1>🔍 VKV SEO Ayarları</h1>
      <form method="post">
        <?php wp_nonce_field('vkv_seo_settings'); ?>
        <table class="form-table">
          <tr><th>Site Açıklaması (Anasayfa meta desc)</th>
              <td><textarea name="site_desc" rows="3" class="large-text"><?php echo esc_textarea($site_desc); ?></textarea></td></tr>
          <tr><th>Varsayılan OG Görseli</th>
              <td><input type="url" name="default_image" class="large-text" value="<?php echo esc_attr($def_image); ?>"></td></tr>
          <tr><th>Twitter / X Kullanıcı Adı</th>
              <td><input type="text" name="twitter" value="<?php echo esc_attr($twitter); ?>" placeholder="@kullanici"></td></tr>
          <tr><th colspan="2"><h3 style="margin:0">📍 Organizasyon Bilgileri (Schema.org)</h3></th></tr>
          <tr><th>Telefon</th><td><input type="text" name="telefon" value="<?php echo esc_attr($telefon); ?>"></td></tr>
          <tr><th>Adres</th><td><input type="text" name="adres" class="large-text" value="<?php echo esc_attr($adres); ?>"></td></tr>
          <tr><th>E-posta</th><td><input type="email" name="eposta" value="<?php echo esc_attr($eposta); ?>"></td></tr>
        </table>
        <?php submit_button('💾 Kaydet'); ?>
      </form>
    </div>
    <?php
}

/* ════════════════════════════════════════════
   6. VARSAYILAN WORDPRESS BAŞLIK/META TEMİZLİĞİ
════════════════════════════════════════════ */
remove_action('wp_head', 'wp_generator');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wp_shortlink_wp_head');
add_filter('the_generator', '__return_empty_string');
