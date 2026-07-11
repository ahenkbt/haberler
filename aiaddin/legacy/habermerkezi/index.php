<?php
/**
 * AhenkPress v5 — Frontend Router (Ana Giriş Noktası)
 */
define('ROOT', __DIR__);
require_once ROOT . '/core/bootstrap.php';

// Tema yükle
Theme::load();

// URL'yi parçala
$url    = trim($_GET['url'] ?? '', '/');
$parts  = explode('/', $url);
$slug   = $parts[0] ?? '';
$sub    = $parts[1] ?? '';

// ─── 1. Anasayfa
if ($slug === '' || $slug === 'anasayfa') {
    Theme::template('index');
    exit;
}

// ─── 2. Arama
if ($slug === 'arama' || isset($_GET['q'])) {
    Theme::template('search');
    exit;
}

// ─── 3. Tema Route'ları (yazarlar, tum-haberler, video-tv, son-haberler, sitene-ekle, magaza, sepet, odeme/*, urun/*)
// Alt yol dene (ör: odeme/stripe, odeme/tamamlandi)
$fullSlug     = $sub ? "$slug/$sub" : $slug;
$routeFileSub = Theme::routeFile($fullSlug);
$routeFile    = $routeFileSub ?: Theme::routeFile($slug);
if ($routeFile) {
    require $routeFile;
    exit;
}

// ─── 4. Admin yönlendirme
if ($slug === 'admin') {
    header('Location: /admin/');
    exit;
}

// ─── 5. Feed
if ($slug === 'feed' || $slug === 'rss') {
    header('Content-Type: application/rss+xml; charset=utf-8');
    $posts = PostType::getPosts(['post_type'=>'news','status'=>'published','limit'=>20]);
    $siteUrl  = ap_url();
    $siteName = DB::setting('site_name','Site');
    echo '<?xml version="1.0" encoding="UTF-8"?>';
    echo '<rss version="2.0"><channel>';
    echo '<title>' . htmlspecialchars($siteName) . '</title>';
    echo '<link>' . $siteUrl . '</link>';
    foreach ($posts as $p) {
        echo '<item>';
        echo '<title>' . htmlspecialchars($p['title']) . '</title>';
        echo '<link>' . ap_url($p['slug']) . '</link>';
        echo '<description>' . htmlspecialchars(ap_excerpt($p['content']??'',30)) . '</description>';
        echo '<pubDate>' . date(DATE_RSS, strtotime($p['published_at']??$p['created_at'])) . '</pubDate>';
        echo '</item>';
    }
    echo '</channel></rss>';
    exit;
}

// ─── 6. Kategori Sayfası
try {
    $category = DB::queryRow(
        "SELECT * FROM `{p}categories` WHERE slug=? AND active=1 LIMIT 1",
        [$slug]
    );
} catch (\Throwable) { $category = null; }

if ($category) {
    if (Theme::hasTemplate('category')) {
        Theme::template('category', ['category' => $category]);
    } else {
        Theme::template('index');
    }
    exit;
}

// ─── 7. Yazar sayfası
if ($slug === 'yazar' && $sub) {
    try {
        $author = DB::queryRow("SELECT * FROM `{p}columnists` WHERE slug=? AND active=1 LIMIT 1", [$sub]);
    } catch (\Throwable) { $author = null; }
    if ($author) {
        Theme::template('author', ['author' => $author]);
        exit;
    }
}

// ─── 8. Statik Sayfalar (page.php)
try {
    $page = DB::queryRow(
        "SELECT * FROM `{p}posts` WHERE slug=? AND post_type='page' AND status='published' LIMIT 1",
        [$slug]
    );
} catch (\Throwable) { $page = null; }

if ($page) {
    Theme::template('page', ['post' => $page]);
    exit;
}

// ─── 9. Tekil Haber / Yazı
try {
    $post = PostType::getBySlug($slug);
} catch (\Throwable) { $post = null; }

if ($post) {
    // Görüntülenme sayısını artır
    PostType::incrementView((int)$post['id']);

    $tpl = match($post['post_type']) {
        'columnist' => Theme::hasTemplate('columnist-post') ? 'columnist-post' : 'single',
        default     => 'single',
    };
    Theme::template($tpl, ['post' => $post]);
    exit;
}

// ─── 10. 404
http_response_code(404);
Theme::template('404');
