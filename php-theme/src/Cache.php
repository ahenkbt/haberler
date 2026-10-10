<?php

declare(strict_types=1);

namespace Yenisafak;

/** APCu when the extension is loaded, otherwise an atomic file cache. */
final class Cache
{
    public function __construct(private string $dir, private int $ttl)
    {
        if (!is_dir($this->dir) && !@mkdir($this->dir, 0775, true) && !is_dir($this->dir)) {
            $this->dir = '';
        }
    }

    public function get(string $key): ?string
    {
        $id = $this->id($key);
        if (function_exists('apcu_fetch')) {
            $value = apcu_fetch($id, $ok);
            if ($ok && is_string($value)) {
                return $value;
            }
        }
        if ($this->dir === '') {
            return null;
        }
        $path = $this->dir . '/' . $id;
        if (!is_file($path)) {
            return null;
        }
        $raw = @file_get_contents($path);
        if ($raw === false || strlen($raw) < 10) {
            return null;
        }
        $exp = (int) substr($raw, 0, 10);
        if ($exp < time()) {
            @unlink($path);
            return null;
        }
        return substr($raw, 10);
    }

    public function set(string $key, string $value): void
    {
        $id = $this->id($key);
        if (function_exists('apcu_store')) {
            apcu_store($id, $value, $this->ttl);
        }
        if ($this->dir === '') {
            return;
        }
        $path = $this->dir . '/' . $id;
        $tmp = $path . '.' . getmypid() . '.tmp';
        $payload = sprintf('%010d', time() + $this->ttl) . $value;
        if (@file_put_contents($tmp, $payload, LOCK_EX) === false) {
            return;
        }
        @rename($tmp, $path);
    }

    private function id(string $key): string
    {
        return hash('sha256', $key);
    }
}
