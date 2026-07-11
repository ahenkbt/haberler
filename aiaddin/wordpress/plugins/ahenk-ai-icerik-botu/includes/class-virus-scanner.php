<?php
/**
 * AHB_Virus_Scanner
 * Çekilen HTML/metin içeriği için hafif zararlı içerik / spam taraması.
 * Harici servis kullanmaz; düzenli ifade tabanlı sezgisel kontrol yapar.
 *
 * Kullanım:
 *   $r = AHB_Virus_Scanner::scan( $html );
 *   if ( ! $r['ok'] ) { // reddet, $r['reason'], $r['matches'] }
 *
 * Ayarlar:
 *   ahb_virus_scan_enabled (bool, default 1)
 *   ahb_virus_scan_strict  (bool, default 0)  — strict modda spam/casino vb. de reddeder
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class AHB_Virus_Scanner {

    /** Tarama aktif mi */
    public static function enabled() {
        return (bool) get_option( 'ahb_virus_scan_enabled', 1 );
    }

    /** Strict mod (spam keyword'lar da reddedilir) */
    public static function strict() {
        return (bool) get_option( 'ahb_virus_scan_strict', 0 );
    }

    /**
     * Ana tarama. $context = 'html' (raw HTML) veya 'text' (temiz metin).
     * @return array { ok:bool, reason:string, matches:array, score:int }
     */
    public static function scan( $content, $context = 'html' ) {
        $content = (string) $content;
        if ( $content === '' ) {
            return array( 'ok' => true, 'reason' => '', 'matches' => array(), 'score' => 0 );
        }
        if ( ! self::enabled() ) {
            return array( 'ok' => true, 'reason' => '', 'matches' => array(), 'score' => 0 );
        }
        // Performans: çok büyük içerikte ilk 80KB yeterli — zararlı kod genelde başta olur.
        if ( strlen( $content ) > 81920 ) {
            $content = substr( $content, 0, 81920 );
        }

        $matches = array();
        $score   = 0;

        // ── 1) Açıkça zararlı / istismar kalıpları (HER ZAMAN reddet) ──
        $danger = array(
            'inline_script_eval'   => '/<script[^>]*>[\s\S]*?\beval\s*\(/i',
            'inline_script_unescape' => '/<script[^>]*>[\s\S]*?unescape\s*\(/i',
            'document_write_script' => '/document\.write\s*\(\s*[\'"]?<script/i',
            'iframe_hidden'        => '/<iframe[^>]*(?:display\s*:\s*none|visibility\s*:\s*hidden|width\s*=\s*[\'"]?0|height\s*=\s*[\'"]?0)/i',
            'data_uri_html'        => '/data:text\/html\s*[;,]\s*base64/i',
            'js_redirect_loc'      => '/<script[^>]*>[\s\S]{0,200}?(?:window\.)?location(?:\.href)?\s*=\s*[\'"]https?:/i',
            'meta_refresh_evil'    => '/<meta[^>]+http-equiv\s*=\s*[\'"]refresh[\'"][^>]+url=https?:\/\/[^\'"\s>]*\.(?:ru|tk|ml|ga|cf|gq|xyz|top)/i',
            'eicar_test'           => '/X5O!P%@AP\[4\\\\PZX54\(P\^\)7CC\)7\}\$EICAR/',
            'php_eval_payload'     => '/<\?php[\s\S]{0,200}?(?:eval|base64_decode|gzinflate|str_rot13|assert)\s*\(/i',
            'shell_payload'        => '/(?:passthru|shell_exec|system|popen|proc_open)\s*\(/i',
            'obfuscated_js'        => '/(?:String\.fromCharCode\s*\(\s*\d+(?:\s*,\s*\d+){10,}|\\\\x[0-9a-f]{2}(?:\\\\x[0-9a-f]{2}){15,})/i',
            'malware_ext_link'     => '/href\s*=\s*[\'"]https?:\/\/[^\'"\s>]+\.(?:exe|scr|bat|msi|jar|vbs|cmd|ps1)(?:[?\'"\s>]|$)/i',
        );
        foreach ( $danger as $name => $regex ) {
            if ( preg_match( $regex, $content, $m ) ) {
                $matches[] = $name;
                $score += 100; // kritik
            }
        }

        // ── 2) Şüpheli ama tek başına yetmeyen kalıplar (skor topla) ──
        $suspicious = array(
            'script_tag'        => array( '/<script\b/i',                 5 ),
            'iframe_tag'        => array( '/<iframe\b/i',                 5 ),
            'onclick_inline'    => array( '/\son(?:click|load|error|mouseover)\s*=/i', 3 ),
            'js_link'           => array( '/href\s*=\s*[\'"]javascript:/i', 4 ),
            'base64_blob_long'  => array( '/[A-Za-z0-9+\/]{300,}={0,2}/',  4 ),
            'phishing_brand'    => array( '/(?:paypaI|amaz0n|g00gle|micros0ft|app1e|faceb00k)/i', 6 ),
            'crypto_miner'      => array( '/coinhive|cryptoloot|webminerpool|coinimp|jsecoin/i', 50 ),
        );
        foreach ( $suspicious as $name => $row ) {
            list( $regex, $w ) = $row;
            if ( preg_match( $regex, $content ) ) {
                $matches[] = $name;
                $score += $w;
            }
        }

        // ── 3) Strict modda spam / yetişkin / kumar ──
        if ( self::strict() ) {
            $spam = array(
                'spam_pharma'  => '/\b(?:viagra|cialis|levitra|tadalafil|sildenafil)\b/i',
                'spam_casino'  => '/\b(?:bahis|casino|kumar|slot oyunlar|bet siteleri|deneme bonusu)\b/i',
                'spam_loan'    => '/\b(?:payday loan|quick cash|kredi karti borcu sil)\b/i',
                'spam_porn'    => '/\b(?:porno|sex|xxx|escort|escort bayan)\b/i',
            );
            foreach ( $spam as $name => $regex ) {
                if ( preg_match( $regex, $content ) ) {
                    $matches[] = $name;
                    $score += 30;
                }
            }
        }

        // Eşik: ≥50 → reddet
        $ok     = ( $score < 50 );
        $reason = '';
        if ( ! $ok ) {
            $reason = 'Zararlı/şüpheli içerik tespit edildi (skor=' . $score . '): ' . implode( ', ', $matches );
        }

        return array(
            'ok'      => $ok,
            'reason'  => $reason,
            'matches' => $matches,
            'score'   => $score,
        );
    }

    /**
     * URL'yi tara — domain karaliste, şüpheli TLD vb.
     * @return array { ok:bool, reason:string }
     */
    /**
     * Engelli domain kontrolü — virüs taramasından BAĞIMSIZ çalışır.
     * @return string|false  Engelliyse engellenmiş domain adı, değilse false
     */
    public static function is_domain_blocked( $url ) {
        $url = trim( (string) $url );
        if ( $url === '' ) return false;
        $p = @parse_url( $url );
        if ( ! $p || empty( $p['host'] ) ) return false;
        $host_clean = preg_replace( '/^www\./', '', strtolower( $p['host'] ) );
        $blocked = (array) get_option( 'ahb_blocked_domains_list', array() );
        foreach ( $blocked as $bad ) {
            $bad = strtolower( trim( (string) $bad ) );
            if ( $bad === '' ) continue;
            if ( $host_clean === $bad || substr( $host_clean, -strlen( '.' . $bad ) ) === '.' . $bad ) {
                return $bad;
            }
        }
        return false;
    }

    public static function scan_url( $url ) {
        $url = trim( (string) $url );
        // Engelli domain kontrolü — virüs taraması kapalı olsa bile çalışsın
        $blocked_match = self::is_domain_blocked( $url );
        if ( $blocked_match !== false ) {
            return array( 'ok' => false, 'reason' => 'Kaynak engellenmiş: ' . $blocked_match );
        }
        if ( $url === '' || ! self::enabled() ) {
            return array( 'ok' => true, 'reason' => '' );
        }
        $p = @parse_url( $url );
        if ( ! $p || empty( $p['host'] ) ) {
            return array( 'ok' => false, 'reason' => 'Geçersiz URL' );
        }
        $host = strtolower( $p['host'] );

        // Karaliste opsiyonu (satır satır)
        $bl_raw = (string) get_option( 'ahb_virus_url_blacklist', '' );
        if ( $bl_raw !== '' ) {
            $lines = array_filter( array_map( 'trim', preg_split( '/\r?\n/', $bl_raw ) ) );
            foreach ( $lines as $bad ) {
                $bad = strtolower( $bad );
                if ( $bad === '' ) continue;
                if ( $host === $bad || substr( $host, -strlen( '.' . $bad ) ) === '.' . $bad ) {
                    return array( 'ok' => false, 'reason' => 'Domain karalistede: ' . $bad );
                }
            }
        }

        // Bilinen kötü TLD
        $bad_tld = array( '.tk', '.ml', '.ga', '.cf', '.gq' );
        foreach ( $bad_tld as $tld ) {
            if ( substr( $host, -strlen( $tld ) ) === $tld ) {
                return array( 'ok' => false, 'reason' => 'Şüpheli TLD: ' . $tld );
            }
        }

        return array( 'ok' => true, 'reason' => '' );
    }
}
