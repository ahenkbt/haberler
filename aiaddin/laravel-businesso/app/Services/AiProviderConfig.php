<?php

namespace App\Services;

use App\Models\BasicSetting;
use Illuminate\Support\Facades\Cache;

class AiProviderConfig
{
  public static function get(): array
  {
    return Cache::remember('ai_provider_config', 60, function () {
      $s = BasicSetting::first();

      return [
        'openai' => [
          'enabled'      => (int) ($s->is_openai ?? 0) === 1,
          'api_key'      => (string) ($s->openai_api_key ?? ''),
          'text_model'   => (string) ($s->openai_text_model ?? 'gpt-4o'),
          'image_model'  => (string) ($s->openai_image_model ?? 'dall-e-3'),
          'content_type' => strtolower((string) ($s->openai_content_type ?? 'all')), 
        ],
        'gemini' => [
          'enabled'      => (int) ($s->is_gemini ?? 0) === 1,
          'api_key'      => (string) ($s->gemini_api_key ?? ''),
          'text_model'   => (string) ($s->gemini_text_model ?? 'gemini-2.0-flash'),
          'image_model'  => (string) ($s->gemini_image_model ?? 'imagen-3'),
          'content_type' => strtolower((string) ($s->gemini_content_type ?? 'all')), 
        ],
        'pollinations' => [
          'enabled'      => (int) ($s->is_pollinations ?? 0) === 1,
          'content_type' => strtolower((string) ($s->pollinations_content_type ?? 'all')), 
        ],
      ];
    });
  }

  public static function forgetCache(): void
  {
    Cache::forget('ai_provider_config');
  }
}
