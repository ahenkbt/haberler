<?php

declare(strict_types=1);

/**
 * Yerel önizleme. Üretim kodu değil: php -S 127.0.0.1:8765 tools/preview_router.php
 * Haberler örnek; puan durumu ve fikstür SporLive ile gerçek ESPN verisidir.
 */
namespace Yenisafak;

final class Html
{
    public static function e(mixed $s): string
    {
        return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
    public static function versioned(string $p): string
    {
        return $p;
    }
    public static function sanitize(string $s): string
    {
        return $s;
    }
    public static function text(string $s): string
    {
        return trim(strip_tags($s));
    }
    public static function when(string $s): string
    {
        return $s;
    }
    public static function iso(string $s): string
    {
        return $s;
    }
    public static function src(string $base, string $img): string
    {
        return $img;
    }
    public static function json(mixed $j): string
    {
        return (string) json_encode($j, JSON_UNESCAPED_UNICODE);
    }
}

final class Site
{
    public int $id = 1146;
    public string $name = 'Spor Gündemi';
    public string $slug = 'spor';
    public string $domain = 'spor.gundemi.org';
    public string $description = 'Futbol, basketbol, voleybol ve tüm branşlarda güncel spor haberleri.';
    public array $layout = ['hmSpor' => true, 'hmCatTree' => 'spor'];
    public array $contact = ['email' => 'spor@gundemi.org'];
    public string $basePath = '';
    public function canonical(string $p): string
    {
        return 'https://spor.gundemi.org' . $p;
    }
    public function whiteLabel(): bool
    {
        return false;
    }
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$root = dirname(__DIR__);
if (str_starts_with($path, '/brand/spor/')) {
    $file = $root . '/public' . $path;
    if (is_file($file)) {
        $ext = pathinfo($file, PATHINFO_EXTENSION);
        header('Content-Type: ' . match ($ext) {
            'css' => 'text/css',
            'js' => 'text/javascript',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            default => 'application/octet-stream',
        });
        readfile($file);
        return;
    }
    http_response_code(404);
    echo 'asset yok';
    return;
}

require $root . '/src/SporLive.php';
require $root . '/src/Spor.php';

$site = new Site();
$cats = [
    ['futbol', 'Galatasaray derbide farkı açtı', 'Sarı-kırmızılılar kendi sahasında üç golle öne geçti.'],
    ['futbol', 'Beşiktaş’tan kiralık transfer', 'Siyah-beyazlılar orta sahaya kiralık takviye yaptı.'],
    ['futbol', 'Milli takım aday kadrosu açıklandı', 'Teknik direktör geniş bir listeyle kampa girecek.'],
    ['futbol', 'Fenerbahçe deplasmanda rahat geçti', 'Kadıköy ekibi rakibini üç golle geçti.'],
    ['futbol', 'Trabzonspor’da sakatlık şoku', 'Forvet haftanın maçında forma giyemeyecek.'],
    ['basketbol', 'EuroLeague gecesinde uzun seri', 'Potanın iki yakasında da tempo yüksekti.'],
    ['basketbol', 'Basketbol Süper Ligi’nde sürpriz', 'Evsahibi son periyotta farkı kapattı.'],
    ['basketbol', 'Milli basketbolda kamp başlıyor', 'Adaylar başkentte toplanıyor.'],
    ['voleybol', 'Sultanlar Ligi’nde setler uzadı', 'File önünde beş setlik gece.'],
    ['voleybol', 'Efeler Ligi lideri değişmedi', 'Evinde 3-1’lik galibiyet.'],
    ['voleybol', 'Filenin sultanları kampa girdi', 'Hazırlık maçları bu hafta.'],
    ['voleybol', 'Genç milli voleybolda madalya', 'Avrupa şampiyonasında kürsü.'],
    ['hentbol', 'Hentbol derbisi berabere bitti', 'Son hücumda eşitlik geldi.'],
    ['gures', 'Mindere altın madalya', 'Milli güreşçi finalde rakibini devirdi.'],
    ['atletizm', 'Maratonda ülke rekoru', 'Parkurdaki derece yıllar sonra yenilendi.'],
    ['tenis', 'Kortta tur atlandı', 'Tek erkeklerde bir üst tur.'],
    ['spor', 'Sporun gündeminde fair play', 'Haftanın fair play ödülü sahibini buldu.'],
    ['engelli-sporlari', 'Paralimpik hedef netleşti', 'Hazırlık takvimi açıklandı.'],
];
$latest = [];
foreach ($cats as $i => [$cat, $title, $spot]) {
    $latest[] = [
        'slug' => 'ornek-' . ($i + 1),
        'title' => $title,
        'spot' => $spot,
        'category' => $cat,
        'image' => $i < 6 ? '/brand/spor/spor-og.png' : '',
        'publishedAt' => '2026-10-10T' . sprintf('%02d', 9 + ($i % 8)) . ':15:00+03:00',
        'authorName' => 'Spor Masası',
        'body' => '<p>' . htmlspecialchars($spot, ENT_QUOTES) . ' Bu metin yerel önizleme içindir.</p>',
        'views' => 40 - $i,
    ];
}
$per = [];
foreach ($latest as $s) {
    $per[$s['category']][] = $s;
}

$title = $site->name;
$description = $site->description;
$canonical = 'https://spor.gundemi.org' . $path;
$imageAbs = '';
$jsonLd = null;
$status = 200;
$body = '';

if ($path === '/' || $path === '') {
    $body = Spor::render('home', [
        'site' => $site,
        'latest' => $latest,
        'per' => $per,
        'popular' => array_slice($latest, 0, 6),
        'transfers' => array_values(array_filter($latest, [Spor::class, 'isTransfer'])),
        'live' => SporLive::bundle(),
    ]);
    $title = 'Spor Gündemi – Süper Lig, Futbol, Basketbol, Voleybol';
} elseif (in_array($path, ['/canli-skor', '/puan-durumu', '/fikstur', '/transfer'], true)) {
    $map = ['/canli-skor' => 'scores', '/puan-durumu' => 'standings', '/fikstur' => 'fixtures', '/transfer' => 'transfer'];
    $tpl = $map[$path];
    $data = ['site' => $site, 'live' => SporLive::bundle()];
    if ($tpl === 'transfer') {
        $data = ['site' => $site, 'items' => array_values(array_filter($latest, [Spor::class, 'isTransfer']))];
    }
    $body = Spor::render($tpl, $data);
    $title = $path . ' | Spor Gündemi';
} elseif (preg_match('#^/kategori/([a-z0-9-]+)$#', $path, $m) === 1) {
    $slug = $m[1];
    $items = $per[$slug] ?? [];
    $name = Spor::section($slug)['name'] ?? $slug;
    $page = 1;
    $hasMore = false;
    $body = Spor::render('category', compact('site', 'name', 'slug', 'items', 'page', 'hasMore'));
    $title = $name . ' | Spor Gündemi';
} elseif (preg_match('#^/haber/([a-z0-9-]+)$#', $path, $m) === 1) {
    $story = null;
    foreach ($latest as $s) {
        if ($s['slug'] === $m[1]) {
            $story = $s;
            break;
        }
    }
    if ($story === null) {
        $status = 404;
        $body = Spor::render('404', ['site' => $site]);
        $title = 'Sayfa bulunamadı';
    } else {
        $body = Spor::render('article', ['site' => $site, 'story' => $story, 'latest' => $latest]);
        $title = $story['title'] . ' | Spor Gündemi';
    }
} else {
    $status = 404;
    $body = Spor::render('404', ['site' => $site]);
    $title = 'Sayfa bulunamadı';
}

http_response_code($status);
require $root . '/templates/spor/layout.php';
