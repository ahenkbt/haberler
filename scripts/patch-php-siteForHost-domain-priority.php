<?php
declare(strict_types=1);

$path = $argv[1] ?? '/app/src/Repository.php';
$text = file_get_contents($path);
if ($text === false) {
    fwrite(STDERR, "read failed\n");
    exit(1);
}

$broken = <<<'SQL'
             ORDER BY
               CASE
                 WHEN lower(domain) = :host OR lower(domain) = :bare THEN 0
                 WHEN lower(coalesce(domain2, '')) = :host OR lower(coalesce(domain2, '')) = :bare THEN 1
                 WHEN lower(coalesce(domain3, '')) = :host OR lower(coalesce(domain3, '')) = :bare THEN 2
                 ELSE 3
               END,
               id ASC
             LIMIT 1'
SQL;

$fixed = <<<'SQL'
             ORDER BY
               CASE
                 WHEN lower(domain) = :host OR lower(domain) = :bare THEN 0
                 WHEN lower(coalesce(domain2, \'\')) = :host OR lower(coalesce(domain2, \'\')) = :bare THEN 1
                 WHEN lower(coalesce(domain3, \'\')) = :host OR lower(coalesce(domain3, \'\')) = :bare THEN 2
                 ELSE 3
               END,
               id ASC
             LIMIT 1'
SQL;

if (str_contains($text, $broken)) {
    file_put_contents($path, str_replace($broken, $fixed, $text));
    echo "fixed broken quotes\n";
    exit(0);
}

$search = <<<'SQL'
               )
             LIMIT 1'
        );
        $stmt->execute(['host' => $host, 'bare' => $bare]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null */
    public function siteBySlug(string $slug): ?array
SQL;

$replace = <<<'SQL'
               )
             ORDER BY
               CASE
                 WHEN lower(domain) = :host OR lower(domain) = :bare THEN 0
                 WHEN lower(coalesce(domain2, \'\')) = :host OR lower(coalesce(domain2, \'\')) = :bare THEN 1
                 WHEN lower(coalesce(domain3, \'\')) = :host OR lower(coalesce(domain3, \'\')) = :bare THEN 2
                 ELSE 3
               END,
               id ASC
             LIMIT 1'
        );
        $stmt->execute(['host' => $host, 'bare' => $bare]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null */
    public function siteBySlug(string $slug): ?array
SQL;

if (str_contains($text, $fixed) || str_contains($text, 'WHEN lower(domain) = :host OR lower(domain) = :bare THEN 0')) {
    echo "already patched ok\n";
    exit(0);
}

if (!str_contains($text, $search)) {
    fwrite(STDERR, "pattern not found\n");
    exit(1);
}
file_put_contents($path, str_replace($search, $replace, $text, $count));
echo "patched count={$count}\n";
