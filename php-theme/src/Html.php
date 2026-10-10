<?php

declare(strict_types=1);

namespace Yenisafak;

final class Html
{
    public static function src(string $basePath, string $url): string
    {
        if ($url === '' || str_starts_with($url, 'http://') || str_starts_with($url, 'https://') || str_starts_with($url, '//')) {
            return $url;
        }
        if (str_starts_with($url, '/')) {
            return ($basePath === '' || $basePath === '/') ? $url : $basePath . $url;
        }
        return $url;
    }

    public static function e(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function json(mixed $value): string
    {
        return (string) json_encode(
            $value,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
        );
    }

    public static function text(string $html): string
    {
        $text = trim(html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        return trim($text);
    }

    /** Editor-authored HTML only. RSS bodies are never passed here. */
    public static function sanitize(string $html): string
    {
        $html = preg_replace('#<(script|style|iframe|object|embed|form|link|meta)\b[^>]*>.*?</\1>#is', '', $html) ?? '';
        $html = strip_tags($html, '<p><br><strong><b><em><i><ul><ol><li><h2><h3><blockquote><a>');
        $html = preg_replace('/\s(on\w+|style|class)\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html) ?? $html;
        return (string) preg_replace_callback(
            '/<a\s+[^>]*href\s*=\s*("|\')(.*?)\1[^>]*>/i',
            static function (array $m): string {
                $href = html_entity_decode($m[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                if (!preg_match('#^https?://#i', $href)) {
                    return '<a>';
                }
                return '<a href="' . self::e($href) . '" rel="noopener nofollow">';
            },
            $html
        );
    }

    public static function iso(?string $value): string
    {
        if ($value === null || $value === '') {
            return gmdate('c');
        }
        $ts = strtotime($value);
        return $ts === false ? gmdate('c') : gmdate('c', $ts);
    }

    public static function when(?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }
        $ts = strtotime($value);
        if ($ts === false) {
            return '';
        }
        $months = [1 => 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        return (int) gmdate('j', $ts) . ' ' . $months[(int) gmdate('n', $ts)] . ' ' . gmdate('H:i', $ts);
    }
}
