<?php
/**
 * AhenkPress — AI İstemcisi (OpenAI GPT-4o / GPT-4o-mini)
 * WordPress bağımsız, saf PHP implementasyonu.
 * Kaynak ilham: Ahenk Ai İçerik Robotu v3.12.3
 */
defined('ROOT') or die();

class AIClient {

    private string $apiKey;
    private string $model;
    private string $endpoint = 'https://api.openai.com/v1/chat/completions';
    public  string $lastError = '';

    public function __construct(string $apiKey = '', string $model = '') {
        $this->apiKey = $apiKey ?: DB::setting('ai_api_key', '');
        $this->model  = $model  ?: DB::setting('ai_model', 'gpt-4o-mini');
    }

    /** Haberi özgünleştir ve yeniden yaz */
    public function uniquifyNews(string $title, string $content): ?array {
        $prompt = $this->buildUniquifyPrompt($title, $content);
        $resp   = $this->call($prompt, 0.75);
        if (!$resp) return null;
        $data = json_decode($resp, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $data = $this->extractJson($resp);
        }
        return $data;
    }

    /** AI köşe yazısı yaz */
    public function writeColumnistPost(string $topic, string $author, string $tone = 'samimi', int $words = 600): ?array {
        $sys = "Sen '{$author}' imzasıyla köşe yazıları yazan bir gazeteci ve yorumcusun. Ton: {$tone}. Haber dilini kullan, Türkçe yaz.";
        $usr = "Şu konu hakkında {$words} kelimelik bir köşe yazısı yaz: {$topic}\n\nJSON: {\"baslik\":\"...\",\"icerik\":\"...\",\"ozet\":\"...\"}";
        $resp = $this->call($usr, 0.85, $sys);
        if (!$resp) return null;
        return $this->extractJson($resp);
    }

    /** Tek prompt ile içerik üret */
    public function generate(string $prompt, float $temp = 0.7, string $systemMsg = ''): string {
        return $this->call($prompt, $temp, $systemMsg) ?? '';
    }

    /** İki haber aynı konuyu kapsıyor mu? */
    public function checkHotUpdate(string $newTitle, string $newContent, array $existing): ?array {
        if (empty($existing)) return ['action' => 'new', 'post_id' => null];
        $list = '';
        foreach ($existing as $p) {
            $list .= "ID: {$p['id']} | Başlık: {$p['title']}\n";
        }
        $sys = 'Sen bir haber arşivleme asistanısın. Yeni haberin mevcut haberlerden biriyle aynı olay mı kapsadığını belirle.';
        $usr = "Yeni haber:\nBAŞLIK: {$newTitle}\nİÇERİK: " . mb_substr($newContent,0,400)
             . "\n\nMevcut haberler:\n{$list}\n\nJSON: {\"action\":\"new|update\",\"post_id\":null|123,\"summary\":\"...\"}";
        $resp = $this->call($usr, 0.2, $sys);
        if (!$resp) return null;
        return $this->extractJson($resp);
    }

    /** SEO başlığı ve meta açıklaması üret */
    public function generateSeo(string $title, string $excerpt): array {
        $prompt = "Türkçe haber başlığı ve özeti verildi. SEO uyumlu yeni başlık (max 65 karakter) ve meta açıklaması (max 155 karakter) üret.\nJSON: {\"seo_baslik\":\"...\",\"meta_aciklama\":\"...\",\"etiketler\":[...]}\n\nBAŞLIK: {$title}\nÖZET: {$excerpt}";
        $resp = $this->call($prompt, 0.5);
        $data = $this->extractJson($resp ?? '');
        return $data ?? ['seo_baslik' => $title, 'meta_aciklama' => $excerpt, 'etiketler' => []];
    }

    // ─── Özel

    private function buildUniquifyPrompt(string $title, string $content): string {
        return "Aşağıdaki Türkçe haberi özgünleştir ve yeniden yaz. Gerçekleri koru, ama ifadeyi değiştir. "
             . "JSON formatında döndür: {\"baslik\":\"...\",\"icerik\":\"...\",\"ozet\":\"...\",\"etiketler\":[...],\"kategori\":\"...\"}\n\n"
             . "BAŞLIK: {$title}\nİÇERİK: " . mb_substr($content, 0, 2500);
    }

    private function call(string $userMsg, float $temp = 0.7, string $system = ''): ?string {
        if (empty($this->apiKey)) {
            $this->lastError = 'API anahtarı girilmemiş.';
            return null;
        }
        $messages = [];
        if ($system) $messages[] = ['role' => 'system', 'content' => $system];
        $messages[] = ['role' => 'user', 'content' => $userMsg];

        $body = json_encode([
            'model'       => $this->model,
            'messages'    => $messages,
            'temperature' => $temp,
            'max_tokens'  => 3000,
        ]);

        $ctx = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => implode("\r\n", [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $this->apiKey,
                    'User-Agent: AhenkPress/' . AP_VERSION,
                ]),
                'content' => $body,
                'timeout' => 60,
                'ignore_errors' => true,
            ],
            'ssl' => ['verify_peer' => false],
        ]);

        try {
            $raw  = @file_get_contents($this->endpoint, false, $ctx);
            $code = (int)(explode(' ', $http_response_header[0] ?? 'HTTP/1.1 0')[1] ?? 0);
            if ($raw === false || $code >= 400) {
                $this->lastError = "HTTP {$code}: " . mb_substr($raw ?? '', 0, 200);
                return null;
            }
            $json = json_decode($raw, true);
            return $json['choices'][0]['message']['content'] ?? null;
        } catch (\Throwable $e) {
            $this->lastError = $e->getMessage();
            return null;
        }
    }

    private function extractJson(string $text): ?array {
        if (preg_match('/\{.*\}/s', $text, $m)) {
            $data = json_decode($m[0], true);
            if (json_last_error() === JSON_ERROR_NONE) return $data;
        }
        return null;
    }

    public function isConfigured(): bool {
        return !empty($this->apiKey);
    }
}
