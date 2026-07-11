<?php

namespace App\Http\Helpers;

class EnvHelper
{
  public static function setEnvValue(string $key, ?string $value): void
  {
    $value = $value ?? '';
    $path = base_path('.env');

    if (!file_exists($path) || !is_writable($path)) {
      return; 
    }

    $env = file_get_contents($path);

    $safeValue = str_replace('"', '\"', trim($value));
    // if contains spaces, wrap with quotes
    if (preg_match('/\s/', $safeValue)) {
      $safeValue = "\"{$safeValue}\"";
    }

    // key exists -> replace
    if (preg_match("/^{$key}=.*/m", $env)) {
      $env = preg_replace("/^{$key}=.*/m", "{$key}={$safeValue}", $env);
    } else {
      // key not exists -> add new line
      $env .= PHP_EOL . "{$key}={$safeValue}";
    }

    file_put_contents($path, $env);
  }
}
