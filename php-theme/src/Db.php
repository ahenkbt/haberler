<?php

declare(strict_types=1);

namespace Yenisafak;

use PDO;
use RuntimeException;

/** Read-only Postgres connection. Session cannot INSERT/UPDATE/DELETE. */
final class Db
{
    public static function connect(string $databaseUrl): PDO
    {
        $databaseUrl = trim($databaseUrl);
        if ($databaseUrl === '') {
            throw new RuntimeException('DATABASE_URL is required');
        }

        $parts = parse_url($databaseUrl);
        if ($parts === false || empty($parts['host']) || empty($parts['path'])) {
            throw new RuntimeException('DATABASE_URL must be a postgres URL');
        }

        $query = [];
        if (!empty($parts['query'])) {
            parse_str($parts['query'], $query);
        }

        $dsn = sprintf(
            'pgsql:host=%s;port=%d;dbname=%s;connect_timeout=3',
            $parts['host'],
            isset($parts['port']) ? (int) $parts['port'] : 5432,
            ltrim((string) $parts['path'], '/')
        );
        $sslmode = isset($query['sslmode']) ? (string) $query['sslmode'] : '';
        if ($sslmode !== '' && preg_match('/^(disable|allow|prefer|require|verify-ca|verify-full)$/', $sslmode) === 1) {
            $dsn .= ';sslmode=' . $sslmode;
        }

        $pdo = new PDO(
            $dsn,
            rawurldecode((string) ($parts['user'] ?? '')),
            rawurldecode((string) ($parts['pass'] ?? '')),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => true,
            ]
        );
        $pdo->exec('SET default_transaction_read_only = on');
        $pdo->exec("SET TIME ZONE 'UTC'");
        return $pdo;
    }
}
