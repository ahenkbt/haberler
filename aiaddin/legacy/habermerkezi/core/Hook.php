<?php
/**
 * AhenkPress v5 — Hook / Filter / Action Sistemi
 */
defined('ROOT') or die();

class Hook {
    private static array $filters  = [];
    private static array $actions  = [];

    public static function addFilter(string $tag, callable $cb, int $priority = 10): void {
        self::$filters[$tag][$priority][] = $cb;
    }

    public static function applyFilters(string $tag, mixed $value, mixed ...$args): mixed {
        if (empty(self::$filters[$tag])) return $value;
        ksort(self::$filters[$tag]);
        foreach (self::$filters[$tag] as $callbacks) {
            foreach ($callbacks as $cb) {
                $value = $cb($value, ...$args);
            }
        }
        return $value;
    }

    public static function addAction(string $tag, callable $cb, int $priority = 10): void {
        self::$actions[$tag][$priority][] = $cb;
    }

    public static function doAction(string $tag, mixed ...$args): void {
        if (empty(self::$actions[$tag])) return;
        ksort(self::$actions[$tag]);
        foreach (self::$actions[$tag] as $callbacks) {
            foreach ($callbacks as $cb) {
                $cb(...$args);
            }
        }
    }

    public static function hasFilter(string $tag): bool {
        return !empty(self::$filters[$tag]);
    }

    public static function hasAction(string $tag): bool {
        return !empty(self::$actions[$tag]);
    }
}
