<?php

declare(strict_types=1);

namespace Yenisafak;

/**
 * newsites25 2026-10-08: "TurkAta News - <Country>" dateline for world-news sites (world.fix.tc).
 * Setting-driven: only sites whose layout_json has hmWorldDateline = true show it (other sites unchanged).
 * The country is the earliest country (or capital / head-of-state) mention in the title, then the spot, then the
 * first part of the body; ties go to the longest match ("Güney Kore" over "Kore"). Fallback: the article's
 * continent category, else "World". Türkiye is used only when no other country is named.
 */
final class WorldDateline
{
    /** Turkish stem/regex => English country name. Stems match at a word start (Turkish suffixes allowed). */
    private const MAP = [
        'Almanya' => 'Germany', 'Alman' => 'Germany', 'Berlin' => 'Germany', 'Merz' => 'Germany',
        'Fransa' => 'France', 'Fransız' => 'France', 'Paris' => 'France', 'Macron' => 'France', 'Elysee' => 'France',
        'İngiltere' => 'United Kingdom', 'Birleşik Krallık' => 'United Kingdom', 'İngiliz' => 'United Kingdom', 'Londra' => 'United Kingdom', 'Starmer' => 'United Kingdom', 'İskoçya' => 'United Kingdom',
        'İtalya' => 'Italy', 'Roma' => 'Italy', 'Meloni' => 'Italy', 'İspanya' => 'Spain', 'Madrid' => 'Spain', 'Portekiz' => 'Portugal', 'Lizbon' => 'Portugal',
        'Hollanda' => 'Netherlands', 'Lahey' => 'Netherlands', 'Amsterdam' => 'Netherlands', 'Belçika' => 'Belgium', 'Brüksel' => 'Belgium',
        'İsviçre' => 'Switzerland', 'Cenevre' => 'Switzerland', 'Avusturya' => 'Austria', 'Viyana' => 'Austria',
        'Polonya' => 'Poland', 'Varşova' => 'Poland', 'Çekya' => 'Czechia', 'Çek Cumhuriyeti' => 'Czechia', 'Slovakya' => 'Slovakia', 'Macaristan' => 'Hungary', 'Budapeşte' => 'Hungary', 'Orban' => 'Hungary',
        'Romanya' => 'Romania', 'Bükreş' => 'Romania', 'Bulgaristan' => 'Bulgaria', 'Sofya' => 'Bulgaria', 'Yunanistan' => 'Greece', 'Atina' => 'Greece', 'Yunan' => 'Greece', 'Miçotakis' => 'Greece',
        'Sırbistan' => 'Serbia', 'Belgrad' => 'Serbia', 'Hırvatistan' => 'Croatia', 'Bosna' => 'Bosnia and Herzegovina', 'Saraybosna' => 'Bosnia and Herzegovina',
        'Kosova' => 'Kosovo', 'Arnavutluk' => 'Albania', 'Kuzey Makedonya' => 'North Macedonia', 'Karadağ' => 'Montenegro', 'Slovenya' => 'Slovenia', 'Moldova' => 'Moldova',
        'Ukrayna' => 'Ukraine', 'Kiev' => 'Ukraine', 'Kyiv' => 'Ukraine', 'Zelenskiy' => 'Ukraine', 'Zelenski' => 'Ukraine',
        'Rusya' => 'Russia', 'Rus' => 'Russia', 'Moskova' => 'Russia', 'Kremlin' => 'Russia', 'Putin' => 'Russia', 'Lavrov' => 'Russia', 'Peskov' => 'Russia',
        'Belarus' => 'Belarus', 'Beyaz Rusya' => 'Belarus', 'Litvanya' => 'Lithuania', 'Letonya' => 'Latvia', 'Estonya' => 'Estonia',
        'Finlandiya' => 'Finland', 'İsveç' => 'Sweden', 'Norveç' => 'Norway', 'Danimarka' => 'Denmark', 'İzlanda' => 'Iceland', 'İrlanda' => 'Ireland',
        'Güney Kıbrıs' => 'Cyprus', 'Rum Kesimi' => 'Cyprus', 'KKTC' => 'Northern Cyprus', 'Kuzey Kıbrıs' => 'Northern Cyprus', 'Lefkoşa' => 'Northern Cyprus', 'Malta' => 'Malta', 'Lüksemburg' => 'Luxembourg',
        'ABD' => 'United States', 'Amerika Birleşik Devletleri' => 'United States', 'Amerikan' => 'United States', 'Amerika' => 'United States', 'Washington' => 'United States', 'Beyaz Saray' => 'United States',
        'Trump' => 'United States', 'Pentagon' => 'United States', 'New York' => 'United States', 'Kaliforniya' => 'United States', 'Teksas' => 'United States', 'Rubio' => 'United States', 'Vance' => 'United States',
        'Kanada' => 'Canada', 'Ottawa' => 'Canada', 'Carney' => 'Canada', 'Meksika' => 'Mexico', 'Küba' => 'Cuba', 'Haiti' => 'Haiti', 'Panama' => 'Panama', 'Guatemala' => 'Guatemala', 'Honduras' => 'Honduras', 'Nikaragua' => 'Nicaragua', 'Kosta Rika' => 'Costa Rica', 'Grönland' => 'Greenland',
        'Brezilya' => 'Brazil', 'Lula' => 'Brazil', 'Arjantin' => 'Argentina', 'Buenos Aires' => 'Argentina', 'Milei' => 'Argentina', 'Şili' => 'Chile', 'Kolombiya' => 'Colombia', 'Venezuela' => 'Venezuela', 'Maduro' => 'Venezuela', 'Caracas' => 'Venezuela',
        'Peru' => 'Peru', 'Ekvador' => 'Ecuador', 'Bolivya' => 'Bolivia', 'Paraguay' => 'Paraguay', 'Uruguay' => 'Uruguay',
        'Çin' => 'China', 'Pekin' => 'China', 'Şi Cinping' => 'China', 'Şanghay' => 'China', 'Hong Kong' => 'Hong Kong', 'Tayvan' => 'Taiwan', 'Taipei' => 'Taiwan',
        'Japonya' => 'Japan', 'Tokyo' => 'Japan', 'Güney Kore' => 'South Korea', 'Seul' => 'South Korea', 'Kuzey Kore' => 'North Korea', 'Pyongyang' => 'North Korea', 'Kim Jong' => 'North Korea',
        'Hindistan' => 'India', 'Yeni Delhi' => 'India', 'Modi' => 'India', 'Pakistan' => 'Pakistan', 'İslamabad' => 'Pakistan', 'Afganistan' => 'Afghanistan', 'Kabil' => 'Afghanistan', 'Taliban' => 'Afghanistan',
        'Bangladeş' => 'Bangladesh', 'Sri Lanka' => 'Sri Lanka', 'Nepal' => 'Nepal', 'Myanmar' => 'Myanmar', 'Tayland' => 'Thailand', 'Vietnam' => 'Vietnam', 'Kamboçya' => 'Cambodia', 'Malezya' => 'Malaysia',
        'Endonezya' => 'Indonesia', 'Cakarta' => 'Indonesia', 'Filipinler' => 'Philippines', 'Singapur' => 'Singapore', 'Moğolistan' => 'Mongolia',
        'Kazakistan' => 'Kazakhstan', 'Astana' => 'Kazakhstan', 'Tokayev' => 'Kazakhstan', 'Özbekistan' => 'Uzbekistan', 'Taşkent' => 'Uzbekistan', 'Mirziyoyev' => 'Uzbekistan',
        'Kırgızistan' => 'Kyrgyzstan', 'Bişkek' => 'Kyrgyzstan', 'Türkmenistan' => 'Turkmenistan', 'Aşkabat' => 'Turkmenistan', 'Tacikistan' => 'Tajikistan',
        'Azerbaycan' => 'Azerbaijan', 'Bakü' => 'Azerbaijan', 'Aliyev' => 'Azerbaijan', 'Gürcistan' => 'Georgia', 'Tiflis' => 'Georgia', 'Ermenistan' => 'Armenia', 'Erivan' => 'Armenia', 'Paşinyan' => 'Armenia',
        'İran' => 'Iran', 'Tahran' => 'Iran', 'Pezeşkiyan' => 'Iran', 'Hamaney' => 'Iran', 'Arakçi' => 'Iran', 'Irak' => 'Iraq', 'Bağdat' => 'Iraq', 'Erbil' => 'Iraq', 'Kerkük' => 'Iraq',
        'Suriye' => 'Syria', 'Şam' => 'Syria', 'Halep' => 'Syria', 'Şara' => 'Syria', 'Lübnan' => 'Lebanon', 'Beyrut' => 'Lebanon', 'Hizbullah' => 'Lebanon',
        'İsrail' => 'Israel', 'Tel Aviv' => 'Israel', 'Netanyahu' => 'Israel', 'Filistin' => 'Palestine', 'Gazze' => 'Palestine', 'Batı Şeria' => 'Palestine', 'Hamas' => 'Palestine', 'Kudüs' => 'Palestine', 'Ürdün' => 'Jordan', 'Amman' => 'Jordan',
        'Suudi Arabistan' => 'Saudi Arabia', 'Riyad' => 'Saudi Arabia', 'Suudi' => 'Saudi Arabia', 'Katar' => 'Qatar', 'Doha' => 'Qatar', 'Birleşik Arap Emirlikleri' => 'United Arab Emirates', 'BAE' => 'United Arab Emirates', 'Dubai' => 'United Arab Emirates', 'Abu Dabi' => 'United Arab Emirates',
        'Kuveyt' => 'Kuwait', 'Bahreyn' => 'Bahrain', 'Umman' => 'Oman', 'Yemen' => 'Yemen', 'Husi' => 'Yemen', 'Mısır' => 'Egypt', 'Kahire' => 'Egypt', 'Sisi' => 'Egypt',
        'Libya' => 'Libya', 'Trablus' => 'Libya', 'Tunus' => 'Tunisia', 'Cezayir' => 'Algeria', 'Fas' => 'Morocco', 'Rabat' => 'Morocco', 'Sudan' => 'Sudan', 'Hartum' => 'Sudan', 'Güney Sudan' => 'South Sudan',
        'Etiyopya' => 'Ethiopia', 'Somali' => 'Somalia', 'Mogadişu' => 'Somalia', 'Kenya' => 'Kenya', 'Nairobi' => 'Kenya', 'Tanzanya' => 'Tanzania', 'Uganda' => 'Uganda', 'Ruanda' => 'Rwanda',
        'Kongo' => 'DR Congo', 'Nijerya' => 'Nigeria', 'Nijer' => 'Niger', 'Mali' => 'Mali', 'Burkina Faso' => 'Burkina Faso', 'Çad' => 'Chad', 'Senegal' => 'Senegal', 'Gana' => 'Ghana', 'Fildişi' => 'Ivory Coast',
        'Kamerun' => 'Cameroon', 'Angola' => 'Angola', 'Mozambik' => 'Mozambique', 'Zimbabve' => 'Zimbabwe', 'Zambiya' => 'Zambia', 'Güney Afrika' => 'South Africa', 'Madagaskar' => 'Madagascar', 'Cibuti' => 'Djibouti', 'Eritre' => 'Eritrea',
        'Avustralya' => 'Australia', 'Sidney' => 'Australia', 'Canberra' => 'Australia', 'Yeni Zelanda' => 'New Zealand', 'Papua Yeni Gine' => 'Papua New Guinea', 'Fiji' => 'Fiji',
        'Vatikan' => 'Vatican', 'Papa' => 'Vatican', 'Çinli' => 'China', 'Japon' => 'Japan', 'İsrailli' => 'Israel', 'Filistinli' => 'Palestine',
    ];

    /** Short stems that are also Turkish words/prefixes (Şampiyon, Çadır, Papatya, Modifiye, Roman, Fasıl, mali…): exact word (+ 'suffix) only. */
    private const STRICT = ['Papa', 'Şam', 'Çad', 'Modi', 'Mali', 'Roma', 'Fas', 'Rus', 'Çin', 'Gana', 'Peru', 'Sisi', 'Şara', 'Husi', 'Merz', 'Lula',
        'Kiev', 'Seul', 'Rabat', 'Doha', 'Erbil', 'Fiji', 'Malta', 'Haiti', 'Panama', 'Amman', 'Vance', 'Rubio', 'Orban', 'Nepal', 'Alman', 'Yunan',
        'Japon', 'Suudi', 'Kongo', 'Nijer', 'Somali', 'Umman', 'Sudan', 'Kenya', 'Sofya', 'Lahey', 'Fransız', 'İngiliz', 'Amerikan', 'Hamas', 'Taliban', 'Pentagon'];

    private const CONTINENT = [
        'avrupa' => 'Europe', 'asya' => 'Asia', 'orta-dogu' => 'Middle East', 'afrika' => 'Africa',
        'kuzey-amerika' => 'North America', 'guney-amerika' => 'South America', 'okyanusya' => 'Oceania',
    ];

    public static function enabled(Site $site): bool
    {
        $v = $site->layout['hmWorldDateline'] ?? null;
        return $v === true || $v === 1 || $v === '1' || $v === 'true';
    }

    /** @param array<string, mixed> $story */
    public static function label(array $story): string
    {
        $title = (string) ($story['title'] ?? '');
        $spot = (string) ($story['spot'] ?? '');
        $body = mb_substr(trim((string) preg_replace('/\s+/u', ' ', strip_tags((string) ($story['body'] ?? '')))), 0, 700, 'UTF-8');
        foreach ([$title, $spot, $body] as $text) {
            $c = self::country($text);
            if ($c !== '') {
                return 'TurkAta News - ' . $c;
            }
        }
        foreach ([$title, $spot] as $text) {
            if (preg_match('/(?<![\p{L}])Türkiye/u', $text) === 1) {
                return 'TurkAta News - Türkiye';
            }
        }
        $cat = (string) ($story['category'] ?? '');
        return 'TurkAta News - ' . (self::CONTINENT[$cat] ?? 'World');
    }

    public static function country(string $text): string
    {
        if ($text === '') {
            return '';
        }
        static $rx = null;
        if ($rx === null) {
            $keys = array_keys(self::MAP);
            usort($keys, static fn (string $a, string $b): int => mb_strlen($b) <=> mb_strlen($a));
            $rx = '/(?<![\p{L}\p{N}])(' . implode('|', array_map(static fn (string $k): string => preg_quote($k, '/'), $keys)) . ')(?=[\p{Ll}’\'\s\p{P}]|$)/u';
        }
        if (preg_match_all($rx, $text, $m, PREG_OFFSET_CAPTURE) < 1) {
            return '';
        }
        $best = null;
        foreach ($m[1] as [$word, $pos]) {
            if (in_array($word, self::STRICT, true) && preg_match('/^\p{Ll}/u', substr($text, $pos + strlen($word), 4)) === 1) {
                continue;
            }
            if ($best === null || $pos < $best[1] || ($pos === $best[1] && strlen($word) > strlen($best[0]))) {
                $best = [$word, $pos];
            }
        }
        return $best === null ? '' : (self::MAP[$best[0]] ?? '');
    }
}
