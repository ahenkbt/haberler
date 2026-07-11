<?php
/**
 * AhenkPress v5 — Widget Sistemi
 */
defined('ROOT') or die();

class Widget {
    private static array $areas    = [];
    private static array $widgets  = [];

    public static function register(string $id, string $name): void {
        self::$areas[$id] = $name;
    }

    public static function area(string $id): void {
        if (empty(self::$widgets[$id])) return;
        foreach (self::$widgets[$id] as $widget) {
            echo $widget;
        }
    }

    public static function add(string $area, string $html): void {
        self::$widgets[$area][] = $html;
    }

    public static function areas(): array { return self::$areas; }
}
