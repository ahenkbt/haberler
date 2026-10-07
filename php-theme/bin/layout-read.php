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

$menuLayout = [
    'hmCorporateMenuItems' => [
        ['id' => 'gundem', 'label' => 'Gündem', 'href' => '/hm/turkatahaber/kategori/gundem', 'enabled' => true],
        ['id' => 'child', 'label' => 'Alt', 'href' => '/kategori/spor', 'parentId' => 'gundem', 'enabled' => true],
        ['id' => 'off', 'label' => 'Gizli', 'href' => '/video', 'enabled' => false],
    ],
    'hmNewsStripMenuItems' => [
        ['id' => 'video', 'label' => 'Videolar', 'href' => '/video', 'enabled' => true],
    ],
    'hmNewsFooterMenuItems' => [
        ['id' => 'kunye', 'label' => 'Künye', 'href' => 'https://example.com/kunye', 'enabled' => true],
    ],
    'hmNewsSidebarMenuItems' => [
        ['id' => 'rss', 'label' => 'RSS', 'href' => '/sitemap.xml', 'enabled' => true],
    ],
    'hmFooterSocial' => ['xUrl' => 'https://x.com/turkata', 'facebookUrl' => 'javascript:alert(1)'],
    'faviconUrl' => '/brand/icon.png',
    'hmFooterAboutHtml' => '<p>Hakkında</p><script>alert(1)</script>',
];
$menuSite = new Site(3, 'asg', 'ASG', 'Açıklama', 'asg.com', $menuLayout, [], '#c8102e', '', 'asg.com', '', 'https://asg.com', []);
$main = $menuSite->mainMenu();
if (count($main) !== 1 || $main[0]['href'] !== '/kategori/gundem' || ($main[0]['children'][0]['label'] ?? '') !== 'Alt') {
    $fail('main menu ' . json_encode($main, JSON_UNESCAPED_UNICODE));
}
$tools = $menuSite->headerTools();
if (count($tools) !== 1 || $tools[0]['label'] !== 'Videolar' || $tools[0]['href'] !== '/video') {
    $fail('header tools');
}
$footer = $menuSite->footerLinks();
$footerHrefs = array_column($footer, 'href');
$footerLabels = array_column($footer, 'label');
if ($footer[0]['href'] !== 'https://example.com/kunye' || !in_array('RSS', $footerLabels, true) || !in_array('/koseyazari/giris', $footerHrefs, true)) {
    $fail('footer');
}
$social = $menuSite->socialLinks();
if (count($social) !== 1 || $social[0]['label'] !== 'X') {
    $fail('social');
}
if ($menuSite->faviconHref() !== '/brand/icon.png') {
    $fail('favicon');
}
if (!str_contains($menuSite->aboutHtml(), 'Hakkında') || str_contains($menuSite->aboutHtml(), 'script')) {
    $fail('about html');
}
if ($empty->shareEnabled() !== true) {
    $fail('share default');
}
$off = new Site(4, 'asg', 'ASG', '', 'asg.com', ['hmYsShareEnabled' => false, 'hmNewsStripMenuEnabled' => false, 'hmNewsStripMenuItems' => [['id' => 'a', 'label' => 'Özel', 'href' => '/video', 'enabled' => true]]], [], '#c8102e', '', 'asg.com', '', 'https://asg.com', []);
if ($off->shareEnabled() !== false || count($off->headerTools()) !== 4) {
    $fail('share off or strip disabled should restore defaults');
}

$legacy = new Site(5, 'yesilvatan', 'Yeşil Vatan', '', 'yesilvatan.gen.tr', ['hmNewsYsMansetLayout' => 'takvim'], [], '#2e7d32', '', 'yesilvatan.gen.tr', '', 'https://yesilvatan.gen.tr', []);
if ($legacy->mansetPreset() !== 'takvim') {
    $fail('legacy preset');
}
$both = new Site(6, 'asg', 'ASG', '', 'asg.com', ['hmYsMansetPreset' => 'mynet', 'hmNewsYsMansetLayout' => 'sabah'], [], '#c8102e', '', 'asg.com', '', 'https://asg.com', []);
if ($both->mansetPreset() !== 'mynet') {
    $fail('new preset should win');
}

$nav = Modules::navCategories(
    [
        'hmNavOnlyCategorySlugs' => ['Savunma Sanayi', 'tsk', 'gundem'],
        'hmNavHiddenCategorySlugs' => ['tsk'],
        'hmNewsExtraCategories' => [['tsk', 'TSK'], ['savunma-sanayi', 'Savunma']],
        'hmCategorySortSlugs' => ['gundem', 'savunma-sanayi'],
    ],
    ['gundem' => 'Gündem DB'],
    ['gundem' => 'Gündem', 'spor' => 'Spor'],
);
$navIds = array_column($nav, 'slug');
if ($navIds !== ['gundem', 'savunma-sanayi']) {
    $fail('nav only ' . json_encode($nav, JSON_UNESCAPED_UNICODE));
}
if (($nav[0]['name'] ?? '') !== 'Gündem DB' || ($nav[1]['name'] ?? '') !== 'Savunma') {
    $fail('nav names');
}
$open = Modules::navCategories([], ['ozel' => 'Özel'], ['gundem' => 'Gündem']);
$openIds = array_column($open, 'slug');
if (($openIds[0] ?? '') !== 'gundem' || !in_array('ozel', $openIds, true)) {
    $fail('open nav ' . implode(',', $openIds));
}
$none = Modules::navCategories(['hmNavOnlyCategorySlugs' => []], ['gundem' => 'Gündem'], ['gundem' => 'Gündem', 'spor' => 'Spor']);
if ($none !== []) {
    $fail('empty whitelist');
}
$suspended = new Site(7, 'kirsehirhaber', 'Kırşehir', '', 'kirsehirhaber.org', ['hmPublicSuspended' => true], [], '#c8102e', '', 'kirsehirhaber.org', '', 'https://kirsehirhaber.org', []);
if (!$suspended->publicSuspended()) {
    $fail('suspended');
}
$openSite = new Site(8, 'asg', 'ASG', '', 'asg.com', ['hmPublicSuspended' => false], [], '#c8102e', '', 'asg.com', '', 'https://asg.com', []);
if ($openSite->publicSuspended()) {
    $fail('not suspended');
}
$footer = array_column($openSite->footerLinks(), 'href');
if (!in_array('/koseyazari/giris', $footer, true)) {
    $fail('footer koseyazari login');
}

fwrite(STDOUT, "ok\n");
