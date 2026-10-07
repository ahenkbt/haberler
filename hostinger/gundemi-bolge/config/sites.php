<?php
/**
 * gundemi.org bölgesel Yenişafak HM siteleri — host → site eşlemesi.
 * VPS (187.77.84.201) vhost / PHP tema bu listeyi veya Neon meta/by-domain kullanır.
 * Logos: ../assets/logos/{slug}-gundemi.png
 */
declare(strict_types=1);

$sites = [
    'ege.gundemi.org' => [
        'slug' => 'ege-gundemi',
        'apex' => 'ege.gundemi.org',
        'displayName' => 'Ege Gündemi',
        'regionLabel' => 'ege',
        'theme' => 'yenisafak',
        'mansetPreset' => 'odatv',
        'primaryColor' => '#0a6b7a',
        'secondaryColor' => '#c00005',
        'logo' => 'ege-gundemi.png',
        'tagline' => 'Ege’nin gündemi, buradan okunur.',
    ],
    'marmara.gundemi.org' => [
        'slug' => 'marmara-gundemi',
        'apex' => 'marmara.gundemi.org',
        'displayName' => 'Marmara Gündemi',
        'regionLabel' => 'marmara',
        'theme' => 'yenisafak',
        'mansetPreset' => 'sabah',
        'primaryColor' => '#0b2d5c',
        'secondaryColor' => '#c00005',
        'logo' => 'marmara-gundemi.png',
        'tagline' => 'Marmara’dan Türkiye’ye gündem.',
    ],
    'karadeniz.gundemi.org' => [
        'slug' => 'karadeniz-gundemi',
        'apex' => 'karadeniz.gundemi.org',
        'displayName' => 'Karadeniz Gündemi',
        'regionLabel' => 'karadeniz',
        'theme' => 'yenisafak',
        'mansetPreset' => 'takvim',
        'primaryColor' => '#0d4f3c',
        'secondaryColor' => '#c00005',
        'logo' => 'karadeniz-gundemi.png',
        'tagline' => 'Karadeniz’in sesi, gündemin nabzı.',
    ],
    'icanadolu.gundemi.org' => [
        'slug' => 'icanadolu-gundemi',
        'apex' => 'icanadolu.gundemi.org',
        'displayName' => 'İç Anadolu Gündemi',
        'regionLabel' => 'iç anadolu',
        'theme' => 'yenisafak',
        'mansetPreset' => 'mynet',
        'primaryColor' => '#8b5a2b',
        'secondaryColor' => '#0b3362',
        'logo' => 'icanadolu-gundemi.png',
        'tagline' => 'İç Anadolu’nun gündemi tek adreste.',
    ],
    'doguanadolu.gundemi.org' => [
        'slug' => 'doguanadolu-gundemi',
        'apex' => 'doguanadolu.gundemi.org',
        'displayName' => 'Doğu Anadolu Gündemi',
        'regionLabel' => 'doğu anadolu',
        'theme' => 'yenisafak',
        'mansetPreset' => 'nefes',
        'primaryColor' => '#1a3a5c',
        'secondaryColor' => '#c00005',
        'logo' => 'doguanadolu-gundemi.png',
        'tagline' => 'Doğu Anadolu’dan güncel haber akışı.',
    ],
    'guneydogu.gundemi.org' => [
        'slug' => 'guneydogu-gundemi',
        'apex' => 'guneydogu.gundemi.org',
        'displayName' => 'Güneydoğu Gündemi',
        'regionLabel' => 'güneydoğu',
        'theme' => 'yenisafak',
        'mansetPreset' => 'odatv',
        'primaryColor' => '#6b2d3c',
        'secondaryColor' => '#0b3362',
        'logo' => 'guneydogu-gundemi.png',
        'tagline' => 'Güneydoğu’nun gündemi burada.',
    ],
    'akdeniz.gundemi.org' => [
        'slug' => 'akdeniz-gundemi',
        'apex' => 'akdeniz.gundemi.org',
        'displayName' => 'Akdeniz Gündemi',
        'regionLabel' => 'akdeniz',
        'theme' => 'yenisafak',
        'mansetPreset' => 'sabah',
        'primaryColor' => '#0c4a6e',
        'secondaryColor' => '#e85d04',
        'logo' => 'akdeniz-gundemi.png',
        'tagline' => 'Akdeniz’in sıcak gündemi.',
    ],
    'kibris.gundemi.org' => [
        'slug' => 'kibris-gundemi',
        'apex' => 'kibris.gundemi.org',
        'displayName' => 'Kıbrıs Gündemi',
        'regionLabel' => 'kıbrıs',
        'theme' => 'yenisafak',
        'mansetPreset' => 'takvim',
        'primaryColor' => '#0b4f6c',
        'secondaryColor' => '#c9a227',
        'logo' => 'kibris-gundemi.png',
        'tagline' => 'Kıbrıs’ın gündemi, buradan takip edilir.',
    ],
];

// www.* → aynı site (canonicalRedirect)
$out = [];
foreach ($sites as $host => $cfg) {
    $out[$host] = $cfg;
    $out['www.' . $host] = $cfg + ['canonicalRedirect' => true];
}

return $out;
