<?php
declare(strict_types=1);

require dirname(__DIR__) . '/lib/helpers.php';

$failures = 0;
function expect(bool $cond, string $msg): void
{
    global $failures;
    if (!$cond) {
        fwrite(STDERR, "FAIL: {$msg}\n");
        $failures++;
    } else {
        echo "ok — {$msg}\n";
    }
}

$nav = hk_build_nav_tree([
    ['id' => 'a', 'label' => 'KURUMSAL', 'href' => '#', 'enabled' => true],
    ['id' => 'b', 'label' => 'Hakkımızda', 'href' => '/hakkimizda', 'parentId' => 'a', 'enabled' => true],
    ['id' => 'c', 'label' => 'Gizli', 'href' => '/x', 'enabled' => false],
]);
expect(count($nav) === 1, 'tek kök menü');
expect(count($nav[0]['children']) === 1, 'alt menü');
expect($nav[0]['children'][0]['href'] === '/hakkimizda', 'href korunur');

$page = hk_find_page([
    'hmExtraPages' => [
        ['slug' => 'hakkimizda', 'title' => 'Hakkımızda', 'bodyHtml' => '<p>ok</p>', 'enabled' => true],
    ],
], 'hakkimizda');
expect($page !== null && $page['title'] === 'Hakkımızda', 'sayfa bulunur');

$sites = require dirname(__DIR__) . '/config/sites.php';
expect(isset($sites['vatankahramanlari.org']) && $sites['vatankahramanlari.org']['slug'] === 'vkd', 'VKD host');
expect(isset($sites['trafikdernegi.com']) && $sites['trafikdernegi.com']['slug'] === 'trafik', 'TGD host');
expect(!empty($sites['www.trafikdernegi.com']['canonicalRedirect']), 'www TGD redirect');

exit($failures > 0 ? 1 : 0);
