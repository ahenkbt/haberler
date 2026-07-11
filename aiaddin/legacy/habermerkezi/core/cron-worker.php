<?php
/**
 * AhenkPress — cPanel Cron Worker (v2)
 * cPanel'de her 15 dakikada bir calistir:
 *   php /path/to/public_html/core/cron-worker.php >> /dev/null 2>&1
 *
 * Guvenlik: web'den erisimi engellemek icin .htaccess kullan.
 */
if (php_sapi_name() !== 'cli') {
    // Web'den erisimde token kontrol et
    $tokenFile = dirname(__DIR__) . '/core/cron-token.txt';
    $token     = file_exists($tokenFile) ? trim(file_get_contents($tokenFile)) : '';
    if (!$token || ($_GET['token'] ?? '') !== $token) {
        http_response_code(403);
        die('Forbidden');
    }
}

define('ROOT', dirname(__DIR__));
require_once ROOT . '/core/bootstrap.php';
require_once ROOT . '/core/ai-client.php';
require_once ROOT . '/core/rss-fetcher.php';
require_once ROOT . '/core/news-processor.php';

$startTime = microtime(true);
$logPfx    = '[' . date('Y-m-d H:i:s') . ']';
echo "{$logPfx} AhenkPress Cron Basladi\n";

function cron_log(int $campId, string $campName, string $level, string $action, string $msg): void {
    try {
        DB::query("INSERT INTO `{p}rss_logs` (campaign_id,campaign_name,level,action,message,created_at) VALUES (?,?,?,?,?,NOW())",
            [$campId, $campName, $level, $action, mb_substr($msg,0,500)]);
    } catch (\Throwable $e) {}
}

try {
    $campaigns = DB::query("SELECT * FROM `{p}rss_campaigns` WHERE active=1 ORDER BY id");
} catch (\Throwable $e) {
    echo "{$logPfx} [HATA] Kampanya sorgusu basarisiz: " . $e->getMessage() . "\n";
    exit(1);
}

if (empty($campaigns)) {
    echo "{$logPfx} [INFO] Aktif kampanya yok.\n";
    exit(0);
}

$ai      = new AIClient();
$checker = new DuplicateChecker();
$fetcher = new RssFetcher();

foreach ($campaigns as $campaign) {
    $interval = max(5, (int)($campaign['interval_minutes'] ?? 30));
    $lastRun  = (int)($campaign['last_run'] ?? 0);
    $nextRun  = $lastRun + ($interval * 60);

    if (time() < $nextRun) {
        echo "{$logPfx} [SKIP] {$campaign['name']} — henuz zamani gelmedi.\n";
        continue;
    }

    echo "{$logPfx} [RUN] {$campaign['name']}\n";

    $useAi = (bool)($campaign['use_ai'] ?? 0) && $ai->isConfigured();
    $proc  = new NewsProcessor($useAi ? $ai : new AIClient(''), $checker);
    $proc->setCampaignData($campaign);

    $feeds    = array_filter(array_map('trim', explode("\n", $campaign['feeds'] ?? '')));
    $maxNew   = (int)($campaign['max_per_run'] ?? 5);
    $allItems = [];

    foreach ($feeds as $feedLine) {
        if (str_starts_with($feedLine, '#')) continue;
        $parsed = RssFetcher::parseLine($feedLine);
        if (!$parsed) continue;
        $items = $fetcher->fetch($parsed['url']);
        foreach ($items as &$it) {
            if (!$it['category'] && $parsed['category']) {
                $it['category'] = $parsed['category'];
            }
        }
        $allItems = array_merge($allItems, $items);
    }

    if (empty($allItems)) {
        echo "{$logPfx} [WARN] {$campaign['name']} — hic oge cekilemedi.\n";
        cron_log((int)$campaign['id'], $campaign['name'], 'warning', 'cron_calistir', 'Hic RSS ogesi cekilemedi.');
        DB::query("UPDATE `{p}rss_campaigns` SET last_run=? WHERE id=?", [time(), (int)$campaign['id']]);
        continue;
    }

    // Gunluk limit kontrolu
    $maxPerDay = (int)($campaign['max_per_day'] ?? 0);
    if ($maxPerDay > 0) {
        try {
            $todayAdded = (int)DB::queryValue(
                "SELECT COUNT(*) FROM `{p}posts` WHERE post_type=? AND DATE(created_at)=CURDATE() AND source_url!=''",
                [$campaign['post_type'] ?? 'news']
            );
            if ($todayAdded >= $maxPerDay) {
                echo "{$logPfx} [SKIP] {$campaign['name']} — gunluk limit doldu ({$todayAdded}/{$maxPerDay}).\n";
                DB::query("UPDATE `{p}rss_campaigns` SET last_run=? WHERE id=?", [time(), (int)$campaign['id']]);
                continue;
            }
            $maxNew = min($maxNew, $maxPerDay - $todayAdded);
        } catch (\Throwable $e) {}
    }

    $result = $proc->processMany($allItems, $maxNew);
    DB::query("UPDATE `{p}rss_campaigns` SET last_run=?,total_added=total_added+? WHERE id=?",
        [time(), $result['added'], (int)$campaign['id']]);

    $level = $result['added'] > 0 ? 'success' : 'info';
    $msg   = "{$result['added']} eklendi, {$result['skipped']} atlandi / " . count($allItems) . " oge";
    cron_log((int)$campaign['id'], $campaign['name'], $level, 'cron_calistir', $msg);
    echo "{$logPfx} [{$campaign['name']}] {$msg}\n";
}

$elapsed = round(microtime(true) - $startTime, 2);
echo "{$logPfx} Cron tamamlandi ({$elapsed}s)\n";
