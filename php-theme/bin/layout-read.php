<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/Html.php';
require dirname(__DIR__) . '/src/Modules.php';
require dirname(__DIR__) . '/src/Site.php';

use Yenisafak\Modules;
use Yenisafak\Site;

$layout = [
    'hmPrimaryColor' => '#0A7CB5',
    'hmSecondaryColor' => '#112233',
    'hmYsMansetPreset' => 'nefes',
    'hmYsSlogan' => 'Yerelin sesi',
    'hmYsKunye' => ['genelMudur' => 'Ada Yılmaz', 'email' => 'ada@example.com'],
    'hmNewsYsTickerEnabled' => false,
    'hmNewsBreakingBandEnabled' => true,
    'hmNewsHomeModuleOrder' => ['ysGallery', 'ysManset', 'ysTicker'],
    'hmNewsHomeModuleCategorySlugs' => ['ysManset' => 'spor'],
    'hmNewsHomeModuleItemCounts' => ['ysManset' => 5],
    'hmNewsYsGalleryEnabled' => false,
    'hmAdSlots' => [
        ['slotKey' => 'header', 'enabled' => true, 'imageMediaUrl' => '/ads/header.png', 'imageClickUrl' => 'https://example.com'],
        ['slotKey' => 'block_strip', 'enabled' => false, 'imageMediaUrl' => '/ads/strip.png'],
    ],
];

$site = new Site(1, 'turkatahaber', 'TürkAta', 'Açıklama', 'turkatahaber.com', $layout, [], '#0A7CB5', '', 'turkatahaber.com', '', 'https://turkatahaber.com', []);

$fail = static function (string $message): void {
    fwrite(STDERR, $message . PHP_EOL);
    exit(1);
};

if ($site->mansetPreset() !== 'nefes') {
    $fail('preset');
}
if ($site->slogan() !== 'Yerelin sesi') {
    $fail('slogan');
}
if ($site->secondaryColor() !== '#112233') {
    $fail('secondary');
}
$kunye = $site->kunye();
if (($kunye['genelMudur'] ?? '') !== 'Ada Yılmaz') {
    $fail('kunye');
}
$header = $site->adSlot('header');
if ($header === null || $header['image'] !== '/ads/header.png' || $header['href'] !== 'https://example.com') {
    $fail('header ad');
}
if ($site->adSlot('block_strip') !== null) {
    $fail('disabled ad rendered');
}
if ($site->adSlot('javascript:alert(1)') !== null) {
    $fail('unknown slot');
}

$enabled = Modules::enabled($layout);
$ids = array_column($enabled, 'id');
if (in_array('ysTicker', $ids, true) || in_array('ysGallery', $ids, true)) {
    $fail('disabled modules still on: ' . implode(',', $ids));
}
if (($ids[0] ?? '') !== 'ysManset') {
    $fail('manset should lead, got ' . implode(',', $ids));
}
$manset = null;
foreach ($enabled as $row) {
    if ($row['id'] === 'ysManset') {
        $manset = $row;
    }
}
if ($manset === null || $manset['category'] !== 'spor' || $manset['count'] !== 5) {
    $fail('manset category/count');
}

$empty = new Site(2, 'asg', 'ASG', 'Site açıklaması', 'asg.com', [], [], '#c8102e', '', 'asg.com', '', 'https://asg.com', []);
if ($empty->mansetPreset() !== '' || $empty->slogan() !== 'Site açıklaması' || $empty->kunye() !== []) {
    $fail('empty layout should keep theme defaults');
}

fwrite(STDOUT, "ok\n");
