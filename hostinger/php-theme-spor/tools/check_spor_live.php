<?php

declare(strict_types=1);

/**
 * spor 2026-10-10: ayrıştırıcı + (ağ varsa) canlı ESPN tur.1 kontrolü.
 * Skor, başlamamış maça yazılmaz. Tablo 8 satırdan kısaysa gizlenir. Değer uydurulmaz.
 */
require dirname(__DIR__) . '/src/SporLive.php';
require dirname(__DIR__) . '/src/Spor.php';

use Yenisafak\Spor;
use Yenisafak\SporLive;

$fail = 0;
$ok = static function (bool $cond, string $msg) use (&$fail): void {
    if ($cond) {
        echo "ok  $msg\n";
        return;
    }
    echo "FAIL $msg\n";
    $fail++;
};

$pre = [
    'events' => [[
        'id' => 'pre1',
        'date' => '2026-10-11T16:00:00Z',
        'competitions' => [[
            'date' => '2026-10-11T16:00:00Z',
            'status' => ['type' => ['name' => 'STATUS_SCHEDULED', 'state' => 'pre', 'completed' => false, 'shortDetail' => 'Scheduled'], 'displayClock' => "0'"],
            'competitors' => [
                ['homeAway' => 'home', 'score' => '0', 'team' => ['displayName' => 'Konyaspor', 'abbreviation' => 'KNY']],
                ['homeAway' => 'away', 'score' => '0', 'team' => ['displayName' => 'Besiktas', 'abbreviation' => 'BES']],
            ],
        ]],
    ]],
];
$post = [
    'events' => [[
        'id' => 'ft1',
        'competitions' => [[
            'date' => '2026-10-10T16:00:00Z',
            'status' => ['type' => ['name' => 'STATUS_FULL_TIME', 'state' => 'post', 'completed' => true], 'displayClock' => "90'+6'"],
            'venue' => ['fullName' => 'Örnek Stadyum'],
            'competitors' => [
                ['homeAway' => 'home', 'score' => '0', 'team' => ['displayName' => 'Fenerbahce', 'abbreviation' => 'FEN']],
                ['homeAway' => 'away', 'score' => '3', 'team' => ['displayName' => 'Galatasaray', 'abbreviation' => 'GAL']],
            ],
        ]],
    ]],
];
$preRows = SporLive::parseScoreboard($pre);
$postRows = SporLive::parseScoreboard($post);
$ok(count($preRows) === 1 && $preRows[0]['homeScore'] === null && $preRows[0]['awayScore'] === null, 'başlamamış maçta skor yok');
$ok($preRows[0]['away'] === 'Beşiktaş', 'Beşiktaş yazımı');
$ok(count($postRows) === 1 && $postRows[0]['homeScore'] === 0 && $postRows[0]['awayScore'] === 3, 'bitmiş maç skoru durur');
$ok($postRows[0]['home'] === 'Fenerbahçe', 'Fenerbahçe yazımı');
$ok($postRows[0]['status'] === 'MS', 'MS etiketi');

$entries = [];
for ($i = 1; $i <= 8; $i++) {
    $entries[] = [
        'team' => ['displayName' => 'Takim ' . $i, 'abbreviation' => 'T' . $i],
        'note' => $i === 1 ? ['description' => 'Champions League'] : ($i === 8 ? ['description' => 'Relegated'] : []),
        'stats' => [
            ['name' => 'rank', 'value' => $i],
            ['name' => 'gamesPlayed', 'value' => 7],
            ['name' => 'wins', 'value' => 4],
            ['name' => 'ties', 'value' => 1],
            ['name' => 'losses', 'value' => 2],
            ['name' => 'pointsFor', 'value' => 10],
            ['name' => 'pointsAgainst', 'value' => 6],
            ['name' => 'points', 'value' => 13],
        ],
    ];
}
$table = SporLive::parseStandings(['children' => [['standings' => ['entries' => $entries]]], 'season' => ['displayName' => '2026-27 Turkish Super Lig']]);
$ok(count($table) === 8 && $table[0]['zone'] === 'Şampiyonlar Ligi' && $table[7]['zone'] === 'Düşme hattı', 'tablo ve bölge notu');
$ok($table[0]['gd'] === 4 && $table[0]['points'] === 13, 'averaj ve puan kaynaktan');
$short = $entries;
array_pop($short);
$hidden = SporLive::parseStandings(['children' => [['standings' => ['entries' => $short]]]]);
$ok($hidden === [], '8 satırdan kısa tablo gizlenir');
$ok(SporLive::seasonLabel(['season' => ['displayName' => '2026-27 Turkish Super Lig']]) === '2026-27', 'sezon etiketi');

$off = (object) ['slug' => 'spor', 'domain' => 'spor.gundemi.org', 'layout' => ['hmCatTree' => 'spor', 'hmConceptTopic' => 'spor']];
$ok(Spor::on($off) === false, 'hmSpor yoksa kabuk kapalı (slug/domain yetmez)');
$ok(Spor::on((object) ['layout' => ['hmSpor' => true]]) === true, 'hmSpor true açar');
$ok(Spor::on((object) ['layout' => ['hmSpor' => false]]) === false, 'hmSpor false kapalı');
$ok(Spor::isTransfer(['title' => 'Yıldızdan 3 yıllık imza', 'spot' => '']) === false, 'düz imza transfer sayılmaz');
$ok(Spor::isTransfer(['title' => 'Beşiktaş’tan kiralık transfer', 'spot' => '']) === true, 'transfer başlığı yakalanır');

if (function_exists('curl_multi_init')) {
    $b = SporLive::bundle();
    $nTable = count($b['standings']);
    $nMatch = count($b['matches']);
    echo "live table=$nTable matches=$nMatch season=" . $b['season'] . " degraded=" . ($b['degraded'] ? '1' : '0') . "\n";
    $ok($nTable === 0 || $nTable >= 8, 'canlı tablo ya boş ya da en az 8 satır');
    foreach ($b['matches'] as $m) {
        if (($m['state'] ?? '') === 'pre' && $m['homeScore'] !== null) {
            $ok(false, 'canlı veride başlamamış maça skor yazılmış: ' . $m['home']);
            break;
        }
    }
    if ($nTable > 0) {
        $top = $b['standings'][0];
        echo "  lider {$top['rank']} {$top['team']} {$top['points']} puan\n";
        $ok($top['team'] !== '' && is_int($top['points']), 'lider takımın adı ve puanı var');
    }
    $ok($nTable > 0 || $nMatch > 0, 'ESPN tur.1 en az tablo ya da maç döndürdü');
} else {
    echo "skip live (curl yok)\n";
}

exit($fail > 0 ? 1 : 0);
