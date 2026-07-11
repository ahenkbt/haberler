<?php
/**
 * AhenkPress v5 — Veritabanı Sınıfı
 */
defined('ROOT') or die();

class DB {
    private static ?PDO $pdo = null;
    private static array $settingCache = [];

    public static function connect(): void {
        if (self::$pdo) return;
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        self::$pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }

    public static function pdo(): PDO {
        if (!self::$pdo) self::connect();
        return self::$pdo;
    }

    private static function sql(string $sql): string {
        return str_replace('{p}', DB_PREFIX, $sql);
    }

    public static function query(string $sql, array $params = []): array {
        $stmt = self::pdo()->prepare(self::sql($sql));
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function queryRow(string $sql, array $params = []): ?array {
        $stmt = self::pdo()->prepare(self::sql($sql));
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function queryValue(string $sql, array $params = []): mixed {
        $stmt = self::pdo()->prepare(self::sql($sql));
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_NUM);
        return $row ? $row[0] : null;
    }

    public static function execute(string $sql, array $params = []): int {
        $stmt = self::pdo()->prepare(self::sql($sql));
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * İki kullanım şekli:
     *   DB::insert("INSERT INTO `{p}tablo` (a,b) VALUES(?,?)", [$a,$b])  → raw SQL
     *   DB::insert('tablo', ['a'=>1,'b'=>2])                              → ORM stili
     * Her ikisi de lastInsertId döndürür.
     */
    public static function insert(string $sqlOrTable, array $params = []): string {
        // ORM stili: ilk arg boşluk içermiyorsa tablo adıdır
        if (!str_contains($sqlOrTable, ' ')) {
            $table  = DB_PREFIX . $sqlOrTable;
            $cols   = implode(',', array_map(fn($c) => "`$c`", array_keys($params)));
            $places = implode(',', array_fill(0, count($params), '?'));
            $sql    = "INSERT INTO `$table` ($cols) VALUES($places)";
            $stmt   = self::pdo()->prepare($sql);
            $stmt->execute(array_values($params));
            return self::pdo()->lastInsertId();
        }
        // Raw SQL stili
        self::execute($sqlOrTable, $params);
        return self::pdo()->lastInsertId();
    }

    /**
     * ORM stili UPDATE:
     *   DB::update('tablo', ['col'=>val, ...], ['id'=>5])
     * $where dizisi AND ile birleştirilir (=? eşleşme).
     */
    public static function update(string $table, array $data, array $where): int {
        if (empty($data) || empty($where)) return 0;
        $tableFull = DB_PREFIX . $table;
        $setParts  = implode(',', array_map(fn($c) => "`$c`=?", array_keys($data)));
        $whereParts= implode(' AND ', array_map(fn($c) => "`$c`=?", array_keys($where)));
        $params    = array_merge(array_values($data), array_values($where));
        $stmt      = self::pdo()->prepare("UPDATE `$tableFull` SET $setParts WHERE $whereParts");
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public static function prefix(): string { return DB_PREFIX; }

    public static function setting(string $key, mixed $default = ''): mixed {
        if (array_key_exists($key, self::$settingCache)) return self::$settingCache[$key];
        try {
            $row = self::queryRow("SELECT val FROM `{p}settings` WHERE `key`=?", [$key]);
            $val = $row ? $row['val'] : $default;
        } catch (\Throwable) { $val = $default; }
        self::$settingCache[$key] = $val;
        return $val;
    }

    public static function setSetting(string $key, mixed $val): void {
        self::$settingCache[$key] = $val;
        self::execute(
            "INSERT INTO `{p}settings`(`key`,`val`) VALUES(?,?) ON DUPLICATE KEY UPDATE `val`=VALUES(`val`)",
            [$key, $val]
        );
    }

    public static function clearSettingCache(): void { self::$settingCache = []; }

    /**
     * ORM stili DELETE:  DB::delete('tablo', ['id'=>5])
     * Where koşulları AND ile birleştirilir.
     */
    public static function delete(string $table, array $where): int {
        if (empty($where)) return 0;
        $tableFull  = DB_PREFIX . $table;
        $whereParts = implode(' AND ', array_map(fn($c) => "`$c`=?", array_keys($where)));
        $stmt = self::pdo()->prepare("DELETE FROM `$tableFull` WHERE $whereParts");
        $stmt->execute(array_values($where));
        return $stmt->rowCount();
    }

    /** DB::execute() için kısa alias */
    public static function exec(string $sql, array $params = []): int {
        return self::execute($sql, $params);
    }

    /** Son INSERT'in ID'sini döndür */
    public static function lastInsertId(): string {
        return self::pdo()->lastInsertId();
    }

    public static function tableExists(string $table): bool {
        try {
            self::query("SELECT 1 FROM `" . DB_PREFIX . $table . "` LIMIT 1");
            return true;
        } catch (\Throwable) { return false; }
    }
}
