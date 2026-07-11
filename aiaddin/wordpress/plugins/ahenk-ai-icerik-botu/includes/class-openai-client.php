<?php

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! class_exists( 'AHB_OpenAI_Client' ) ) {
class AHB_OpenAI_Client {

    private $api_key;
    private $model;
    private $endpoint = 'https://api.openai.com/v1/chat/completions';
    public $last_error = '';

    public function __construct( $api_key ) {
        $this->api_key = $api_key;
        $this->model   = get_option( 'ahb_openai_model', 'gpt-4o-mini' );
    }

    /**
     * Haberi özgünleştir ve analiz et.
     *
     * @param string $title Orijinal başlık
     * @param string $content Orijinal içerik
     * @return array|false
     */
    public function uniquify_news( $title, $content ) {
        $prompt = $this->build_uniquify_prompt( $title, $content );
        $response = $this->call( $prompt, 0.7 );

        if ( ! $response ) return false;

        $data = json_decode( $response, true );
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            $data = $this->extract_json_from_text( $response );
        }

        return $data;
    }

    /**
     * Yeni haberi eski haberlerle karşılaştırarak güncelleme gerekip gerekmediğini belirle.
     *
     * @param string $new_title Yeni haber başlığı
     * @param string $new_content Yeni haber içeriği
     * @param array  $existing_posts [ ['id'=>123,'title'=>'...','slug'=>'...'], ... ]
     * @return array|false
     */
    public function check_hot_update( $new_title, $new_content, $existing_posts ) {
        if ( empty( $existing_posts ) ) {
            return array( 'action' => 'new', 'post_id' => null, 'summary' => '' );
        }

        $list = '';
        foreach ( $existing_posts as $p ) {
            $list .= sprintf( "ID: %d | Başlık: %s\n", $p['id'], $p['title'] );
        }

        $system = 'Sen bir haber arşivleme ve güncelleme asistanısın. Görevin, yeni gelen haberin elimizdeki haberlerden biriyle aynı olay veya kuruma ait olup olmadığını tespit etmek. Kesin olmadıkça "yeni" olarak işaretle. Asla uydurma.';

        $user = "Yeni haber:\nBaşlık: {$new_title}\nİçerik: " . mb_substr( $new_content, 0, 600 ) . "\n\n" .
                "Sitedeki son haberler:\n{$list}\n\n" .
                'Çıktı olarak SADECE şu JSON formatını ver: {"action":"update","post_id":123,"summary":"gelişmenin özeti"} veya {"action":"new","post_id":null,"summary":""}. Başka hiçbir şey yazma.';

        $response = $this->call_with_system( $system, $user, 0.2 );
        if ( ! $response ) return false;

        $data = json_decode( $response, true );
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            $data = $this->extract_json_from_text( $response );
        }

        return $data;
    }

    /**
     * Haber için anahtar varlıkları (kişi/kurum/konu) çıkar.
     *
     * @param string $title
     * @param string $content
     * @return array
     */
    /**
     * Verilen kategori listesinden haber için en uygun olanı seçer.
     *
     * @param string $title
     * @param string $content
     * @param array  $categories [ ['id'=>1,'name'=>'Spor','slug'=>'spor'], ... ]
     * @return int|null Seçilen kategori ID'si
     */
    public function categorize_news( $title, $content, $categories ) {
        if ( empty( $categories ) ) return null;

        $list = '';
        foreach ( $categories as $c ) {
            $list .= sprintf( "ID: %d | %s\n", $c['id'], $c['name'] );
        }

        $system = 'Sen bir haber editörüsün. Verilen kategorilerden HABER İÇERİĞİNE EN UYGUN olanı seç. Asla yeni kategori önerme, sadece listeden seç.';
        $user   = "Haber:\nBaşlık: {$title}\nİçerik: " . mb_substr( $content, 0, 500 ) . "\n\n" .
                  "Mevcut kategoriler:\n{$list}\n\n" .
                  'SADECE şu JSON formatını ver: {"category_id":123}. Hiç emin değilsen ilk kategoriyi seç. Başka hiçbir şey yazma.';

        $response = $this->call_with_system( $system, $user, 0.1 );
        if ( ! $response ) return null;

        $data = json_decode( $response, true );
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            $data = $this->extract_json_from_text( $response );
        }

        return isset( $data['category_id'] ) ? (int) $data['category_id'] : null;
    }

    public function extract_entities( $title, $content ) {
        $system = 'Sen bir metin analiz asistanısın. Verilen haber metninden anahtar varlıkları (kişi adları, kurum adları, ülkeler, ana olaylar) çıkar.';
        $user   = "Haber başlığı: {$title}\nİçerik: " . mb_substr( $content, 0, 500 ) . "\n\n" .
                  'SADECE şu JSON formatını ver: {"entities":["varlık1","varlık2"]}. Maksimum 5 varlık, başka hiçbir şey yazma.';

        $response = $this->call_with_system( $system, $user, 0.2 );
        if ( ! $response ) return array();

        $data = json_decode( $response, true );
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            $data = $this->extract_json_from_text( $response );
        }

        return isset( $data['entities'] ) ? $data['entities'] : array();
    }

    private function build_uniquify_prompt( $title, $content ) {
        $min_words = (int) get_option( 'ahb_min_words', 400 );
        $max_words = (int) get_option( 'ahb_max_words', 700 );
        if ( $min_words < 100 ) $min_words = 100;
        if ( $max_words < $min_words ) $max_words = $min_words + 200;

        $system = 'Sen profesyonel, deneyimli bir Türk haber editörüsün. Görevin, sana verilen haberi ÖZET DEĞİL, TAM UZUNLUKTA ve ÖZGÜN bir haber yazısı olarak yeniden kaleme almak. Kuralların:'
                . "\n- ASLA özet geçme. Olayı tam, ayrıntılı, akıcı bir gazetecilik diliyle anlat."
                . "\n- Orijinal metindeki TÜM bilgileri (kim, ne, nerede, ne zaman, neden, nasıl) koru ve genişlet."
                . "\n- Cümleleri tamamen yeniden yaz; orijinalden cümle kopyalama. Eş anlamlılar ve farklı cümle yapıları kullan."
                . "\n- Giriş paragrafı (lead), gelişme paragrafları ve bir kapanış paragrafı yaz."
                . "\n- Konu hakkında genel bağlam/arka plan bilgisi ekleyerek değer kat."
                . "\n- Tarafsız, profesyonel, haber dili kullan. Asla 'kaynağa göre', 'haberde belirtildiğine göre' gibi ifadeler kullanma."
                . "\n- Kesin bilmediğin ek bilgi UYDURMA; sadece orijinal metindeki bilgileri yeniden ifade et ve genişlet."
                . "\n- ASLA dış bağlantı, kaynak adı veya 'devamı için tıklayın' gibi yönlendirmeler ekleme."
                . "\n- Çıktı tam, yayına hazır bir haber yazısı olmalı.";

        $user = "Aşağıdaki haberi yukarıdaki kurallara göre {$min_words}-{$max_words} kelime aralığında, TAM UZUNLUKTA ve ÖZGÜN biçimde yeniden yaz:\n\n"
              . "ORİJİNAL BAŞLIK: {$title}\n\n"
              . "ORİJİNAL İÇERİK:\n{$content}\n\n"
              . "Çıktıyı SADECE şu geçerli JSON formatında ver, başka hiçbir şey yazma:\n"
              . "{\n"
              . "  \"baslik\": \"SEO uyumlu, dikkat çekici, özgün başlık (orijinalden farklı sözlerle)\",\n"
              . "  \"icerik\": \"<p>Giriş paragrafı...</p><p>Gelişme paragrafı 1...</p><p>Gelişme paragrafı 2...</p><p>Detay paragrafı...</p><p>Kapanış paragrafı...</p>\",\n"
              . "  \"etiketler\": [\"etiket1\",\"etiket2\",\"etiket3\",\"etiket4\",\"etiket5\"],\n"
              . "  \"ana_varliklar\": [\"Kişi/Kurum/Yer\"],\n"
              . "  \"konu_slug\": \"konu-ozeti-slug\"\n"
              . "}\n\n"
              . "ÖNEMLİ: 'icerik' alanı en az {$min_words} kelime olmalı ve birden fazla <p> paragrafı içermelidir. Özet değil, tam haber yazısıdır.";

        return array(
            array( 'role' => 'system', 'content' => $system ),
            array( 'role' => 'user',   'content' => $user ),
        );
    }

    private function call( $messages, $temperature = 0.7 ) {
        $body = array(
            'model'       => $this->model,
            'messages'    => $messages,
            'temperature' => $temperature,
            'max_tokens'  => (int) get_option( 'ahb_max_tokens', 3500 ),
        );

        $args = array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->api_key,
                'Content-Type'  => 'application/json',
            ),
            'body'    => wp_json_encode( $body ),
            'timeout' => 60,
        );

        // Sunucu CA bundle güncel değilse kullanıcı bu ayarı açabilir.
        if ( get_option( 'ahb_ssl_skip_verify', '0' ) === '1' ) {
            $args['sslverify'] = false;
        }

        $response = wp_remote_post( $this->endpoint, $args );

        // SSL süresi dolmuş sertifika gibi sorunlar için otomatik tek seferlik fallback.
        if ( is_wp_error( $response ) ) {
            $err = $response->get_error_message();
            if ( stripos( $err, 'SSL' ) !== false || stripos( $err, 'certificate' ) !== false || stripos( $err, 'cURL error 60' ) !== false ) {
                error_log( '[AI Haber Botu] SSL hatası nedeniyle sslverify=false ile yeniden deneniyor: ' . $err );
                $args['sslverify'] = false;
                $response = wp_remote_post( $this->endpoint, $args );
                if ( ! is_wp_error( $response ) ) {
                    update_option( 'ahb_ssl_skip_verify', '1' );
                    $this->last_error = '';
                }
            }
        }

        if ( is_wp_error( $response ) ) {
            $this->last_error = 'Network: ' . $response->get_error_message();
            error_log( '[AI Haber Botu] API isteği hatası: ' . $response->get_error_message() );
            return false;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $raw  = wp_remote_retrieve_body( $response );
        if ( $code !== 200 ) {
            $msg = '';
            $j = json_decode( $raw, true );
            if ( ! empty( $j['error']['message'] ) ) {
                $msg = $j['error']['message'];
            } else {
                $msg = substr( wp_strip_all_tags( (string) $raw ), 0, 250 );
            }
            $this->last_error = 'HTTP ' . $code . ': ' . $msg;
            error_log( '[AI Haber Botu] API yanıt kodu: ' . $code . ' | ' . $raw );
            return false;
        }

        $body_decoded = json_decode( $raw, true );
        if ( empty( $body_decoded['choices'][0]['message']['content'] ) ) {
            $this->last_error = 'Boş içerik döndü (model: ' . $this->model . ')';
            error_log( '[AI Haber Botu] API boş içerik döndürdü.' );
            return false;
        }

        return $body_decoded['choices'][0]['message']['content'];
    }

    private function call_with_system( $system, $user, $temperature = 0.2 ) {
        return $this->call(
            array(
                array( 'role' => 'system', 'content' => $system ),
                array( 'role' => 'user',   'content' => $user ),
            ),
            $temperature
        );
    }

    /**
     * DALL-E 3 ile profil görseli üret. Base64 PNG döndürür.
     *
     * @param string $prompt
     * @param string $size  '1024x1024' | '1024x1792' | '1792x1024'
     * @return string|false  base64 PNG verisi (data: prefix YOK)
     */
    public function generate_image( $prompt, $size = '1024x1024' ) {
        $body = array(
            'model'           => 'dall-e-3',
            'prompt'          => $prompt,
            'n'               => 1,
            'size'            => $size,
            'response_format' => 'b64_json',
            'quality'         => 'standard',
        );

        $response = wp_remote_post(
            'https://api.openai.com/v1/images/generations',
            array(
                'headers' => array(
                    'Authorization' => 'Bearer ' . $this->api_key,
                    'Content-Type'  => 'application/json',
                ),
                'body'    => wp_json_encode( $body ),
                'timeout' => 90,
            )
        );

        if ( is_wp_error( $response ) ) {
            error_log( '[AHB] image gen error: ' . $response->get_error_message() );
            return false;
        }

        $code = wp_remote_retrieve_response_code( $response );
        if ( $code !== 200 ) {
            error_log( '[AHB] image gen kod: ' . $code . ' | ' . wp_remote_retrieve_body( $response ) );
            return false;
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( ! empty( $data['data'][0]['b64_json'] ) ) {
            return $data['data'][0]['b64_json'];
        }
        return false;
    }

    /**
     * AI köşe yazarı için günlük köşe yazısı üret.
     *
     * @param array $profile  ['name','bio','tone','topic']
     * @param int   $min_words
     * @return array|false  ['baslik','icerik','etiketler','ozet']
     */
    public function write_column( $profile, $min_words = 600 ) {
        $name  = ! empty( $profile['name'] )  ? $profile['name']  : 'Köşe Yazarı';
        $bio   = ! empty( $profile['bio'] )   ? $profile['bio']   : '';
        $tone  = ! empty( $profile['tone'] )  ? $profile['tone']  : 'samimi ve özgün';
        $topic = ! empty( $profile['topic'] ) ? $profile['topic'] : 'güncel konular';
        $today = date_i18n( 'd F Y, l' );

        $system = "Sen '{$name}' adında deneyimli bir köşe yazarısın. " .
                  ( $bio ? "Kısa profilin: {$bio}. " : '' ) .
                  "Üslubun: {$tone}. " .
                  "Görevin günlük köşe yazısı kaleme almak. Yazıların özgün, akıcı ve birinci tekil şahıs (ben) bakış açısıyla yazılmalı. " .
                  "Asla 'yapay zeka' olduğunu söyleme, gerçek bir yazar gibi yaz. " .
                  "Bugünün tarihi: {$today}.";

        $user = "Bugünkü köşe yazımın konusu: \"{$topic}\".\n\n" .
                "Bu konuda en az {$min_words} kelimelik özgün bir köşe yazısı yaz. " .
                "Çıktı SADECE şu JSON formatında olsun, başka hiçbir şey yazma:\n\n" .
                "{\n" .
                "  \"baslik\": \"Çekici, dikkat çekici bir başlık (haber başlığı değil köşe yazısı başlığı)\",\n" .
                "  \"ozet\": \"1-2 cümlelik özet (meta description için)\",\n" .
                "  \"icerik\": \"<p>Giriş paragrafı (kişisel bir gözlem veya soruyla başla)...</p><p>Gelişme 1...</p><p>Gelişme 2...</p><p>Örnek/anekdot...</p><p>Sonuç paragrafı...</p>\",\n" .
                "  \"etiketler\": [\"etiket1\",\"etiket2\",\"etiket3\",\"etiket4\"]\n" .
                "}\n\n" .
                "ÖNEMLİ: 'icerik' alanı en az {$min_words} kelime, birden fazla <p> paragrafı, kişisel ses tonu içermeli. Köşe yazısıdır — tarafsız haber DEĞİL.";

        $response = $this->call_with_system( $system, $user, 0.85 );
        if ( ! $response ) return false;

        $data = json_decode( $response, true );
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            $data = $this->extract_json_from_text( $response );
        }
        return $data;
    }

    /**
     * AI yazar için kısa biyografi (1-2 cümle) üret.
     */
    public function generate_bio( $name, $gender, $expertise ) {
        $g = $gender === 'male' ? 'erkek' : ( $gender === 'female' ? 'kadın' : '' );
        $system = 'Sen kısa, profesyonel köşe yazarı biyografileri yazan bir editörsün.';
        $user = "İsim: {$name}\nCinsiyet: {$g}\nUzmanlık: {$expertise}\n\n" .
                "Bu yazar için 2 kısa cümlelik (40-60 kelime) Türkçe profesyonel biyografi yaz. SADECE biyografi metnini döndür, başka hiçbir şey yazma.";
        $r = $this->call_with_system( $system, $user, 0.6 );
        return $r ? trim( wp_strip_all_tags( $r ) ) : '';
    }

    private function extract_json_from_text( $text ) {
        preg_match( '/\{.*\}/s', $text, $matches );
        if ( ! empty( $matches[0] ) ) {
            $decoded = json_decode( $matches[0], true );
            if ( json_last_error() === JSON_ERROR_NONE ) {
                return $decoded;
            }
        }
        return array();
    }
}
} // end class_exists guard
