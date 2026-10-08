<?php
declare(strict_types=1);

/**
 * One-off: twilight-pine hm_news_sites row drift (id 1134 marmara vs API sosyalhizmetler).
 * Clears domain2 on conflicting rows and upserts canonical sosyalhizmetler.tr site from API meta.
 */

require '/app/src/bootstrap.php';

use Yenisafak\Db;

$domain = 'sosyalhizmetler.tr';
$api = 'https://ahenk.net.tr/api/hm/meta/by-domain?domain=' . rawurlencode($domain);
$json = file_get_contents($api, false, stream_context_create([
    'http' => ['header' => "Accept: application/json\r\n", 'timeout' => 15],
]));
if (!is_string($json) || $json === '') {
    fwrite(STDERR, "api fetch failed\n");
    exit(1);
}
$meta = json_decode($json, true);
if (!is_array($meta) || empty($meta['slug'])) {
    fwrite(STDERR, "bad meta\n");
    exit(1);
}

$pdo = Db::connect(getenv('DATABASE_URL') ?: '');
$pdo->beginTransaction();
try {
    $pdo->exec("UPDATE hm_news_sites SET domain2 = NULL, updated_at = NOW()
        WHERE lower(coalesce(domain2,'')) = " . $pdo->quote($domain));
    $pdo->exec("UPDATE hm_news_sites SET domain3 = NULL, updated_at = NOW()
        WHERE lower(coalesce(domain3,'')) = " . $pdo->quote($domain));
    $pdo->exec("UPDATE hm_news_sites SET domain = NULL, updated_at = NOW()
        WHERE id <> (SELECT id FROM hm_news_sites WHERE slug = " . $pdo->quote($meta['slug']) . " LIMIT 1)
        AND lower(coalesce(domain,'')) = " . $pdo->quote($domain));

    $stmt = $pdo->prepare('SELECT id FROM hm_news_sites WHERE slug = :slug LIMIT 1');
    $stmt->execute(['slug' => $meta['slug']]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    $layout = json_encode($meta['layout'] ?? [], JSON_UNESCAPED_UNICODE);
    $contact = json_encode($meta['contact'] ?? [], JSON_UNESCAPED_UNICODE);
    if ($existing) {
        $upd = $pdo->prepare(
            'UPDATE hm_news_sites SET domain = :domain, domain2 = NULL, domain3 = NULL,
             display_name = :name, description = :desc, contact_json = :contact::jsonb,
             layout_json = :layout::jsonb, active = true, updated_at = NOW()
             WHERE id = :id',
        );
        $upd->execute([
            'domain' => $domain,
            'name' => $meta['displayName'] ?? 'Sosyal Hizmetler Haber',
            'desc' => $meta['description'] ?? '',
            'contact' => $contact,
            'layout' => $layout,
            'id' => $existing['id'],
        ]);
        echo "updated id={$existing['id']}\n";
    } else {
        $ins = $pdo->prepare(
            'INSERT INTO hm_news_sites (slug, domain, domain2, domain3, display_name, description,
             contact_json, layout_json, active, created_at, updated_at)
             VALUES (:slug, :domain, NULL, NULL, :name, :desc, :contact::jsonb, :layout::jsonb, true, NOW(), NOW())',
        );
        $ins->execute([
            'slug' => $meta['slug'],
            'domain' => $domain,
            'name' => $meta['displayName'] ?? 'Sosyal Hizmetler Haber',
            'desc' => $meta['description'] ?? '',
            'contact' => $contact,
            'layout' => $layout,
        ]);
        echo "inserted slug={$meta['slug']}\n";
    }
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
