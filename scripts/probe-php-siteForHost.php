<?php
declare(strict_types=1);

require '/app/src/bootstrap.php';

use Yenisafak\Db;
use Yenisafak\Repository;

$url = getenv('DATABASE_URL') ?: '';
$pdo = Db::connect($url);
$repo = new Repository($pdo);
$row = $repo->siteForHost('sosyalhizmetler.tr');
echo json_encode(
    $row
        ? [
            'id' => $row['id'] ?? null,
            'slug' => $row['slug'] ?? null,
            'domain' => $row['domain'] ?? null,
            'domain2' => $row['domain2'] ?? null,
        ]
        : null,
    JSON_UNESCAPED_UNICODE,
);
