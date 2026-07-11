<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class GeminiTokenService
{
  protected $apiKey;
  protected $model;
  protected $maxInputTokens;

  public function __construct()
  {
    $this->apiKey = env('GEMINI_API_KEY');
    $this->model = env('GEMINI_MODEL', 'gemini-2.0-flash');
    $this->maxInputTokens = config('ai.gemini.max_input_tokens', 1000);
  }

  /**
   * Count tokens for given prompt
   * @param string $prompt
   * @return int
   */
  public function countTokens(string $prompt): int
  {
    if (!$this->apiKey) {
      Log::warning('Gemini API key not configured');
      return 0;
    }

    try {
      $response = Http::timeout(30)
        ->withHeaders(['x-goog-api-key' => $this->apiKey])
        ->post("https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:countTokens", [
          'contents' => [
            ['parts' => [['text' => $prompt]]]
          ]
        ]);

      if ($response->successful()) {
        $data = $response->json();
        return $data['totalTokens'] ?? 0;
      }

      Log::error('Gemini token counting failed', [
        'status' => $response->status(),
        'body' => $response->body()
      ]);
    } catch (Exception $e) {
      Log::error('Gemini token counting exception: ' . $e->getMessage());
    }

    return 0;
  }

  /**
   * Validate if prompt is within token limits
   * @param string $prompt
   * @return array
   */
  public function validateTokenLimit(string $prompt): array
  {
    $tokenCount = $this->countTokens($prompt);

    if ($tokenCount === 0) {
      Log::warning('Token counting returned 0, proceeding with caution');
      return [
        'valid' => true,
        'token_count' => 0,
        'max_tokens' => $this->maxInputTokens,
        'message' => 'Token count unavailable, proceeding'
      ];
    }

    $isValid = $tokenCount <= $this->maxInputTokens;

    return [
      'valid' => $isValid,
      'token_count' => $tokenCount,
      'max_tokens' => $this->maxInputTokens,
      'message' => $isValid
        ? "Token count within limit: {$tokenCount}/{$this->maxInputTokens}"
        : "Token limit exceeded: {$tokenCount}/{$this->maxInputTokens}"
    ];
  }

  /**
   * Calculate estimated tokens (fallback method without API call)
   * Rough estimate: 1 token ≈ 4 characters
   */
  public function estimateTokens(string $text): int
  {
    return (int) ceil(strlen($text) / 4);
  }

  /**
   * Get max input token limit
   */
  public function getMaxInputTokens(): int
  {
    return $this->maxInputTokens;
  }

  /**
   * Set custom max input tokens
   */
  public function setMaxInputTokens(int $tokens): self
  {
    $this->maxInputTokens = $tokens;
    return $this;
  }
}
