<?php

declare(strict_types=1);

namespace Yenisafak;

/**
 * spor 2026-10-10: Süper Lig puan durumu ve fikstür — yalnız gerçek JSON.
 *
 * Kaynak: herkese açık ESPN site API (anahtarsız), lig slug tur.1.
 *   Puan:  https://site.api.espn.com/apis/v2/sports/soccer/tur.1/standings
 *   Skor:  https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/scoreboard?dates=YYYYMMDD
 * Basketbol / voleybol için aynı API'de Türkiye ligi yok; o branşlarda skor uydurulmaz, şerit haber olarak kalır.
 * Başlamamış maçın skoru (ESPN "0" yazar) gösterilmez. Kaynak yoksa veya 6 saatten eskiyse boş dizi döner.
 */
final class SporLive
{
    public const SOURCE = 'ESPN';
    public const STALE_MAX = 21600;
    public const FRESH = 90;
    private const MIN_TABLE = 8;

    private const STANDINGS_URL = 'https://site.api.espn.com/apis/v2/sports/soccer/tur.1/standings';
    private const SCORE_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/scoreboard?limit=100&dates=';

    /** ESPN displayName → Türkçe yazım. Eşleşmeyen ad olduğu gibi kalır. */
    private const TR_NAME = [
        'Fenerbahce' => 'Fenerbahçe',
        'Besiktas' => 'Beşiktaş',
        'Genclerbirligi' => 'Gençlerbirliği',
        'Kasimpasa' => 'Kasımpaşa',
        'Caykur Rizespor' => 'Çaykur Rizespor',
        'Goztepe' => 'Göztepe',
        'Eyupspor' => 'Eyüpspor',
        'Istanbul Basaksehir' => 'Başakşehir',
    ];

    /** ESPN note.description → kısa Türkçe etiket. Bilinmeyen not olduğu gibi kalır, uydurulmaz. */
    private const ZONE_TR = [
        'Champions League' => 'Şampiyonlar Ligi',
        'Champions League qualifying' => 'ŞL elemesi',
        'Europa League' => 'Avrupa Ligi',
        'Europa League qualifying' => 'Avrupa Ligi elemesi',
        'Conference League' => 'Konferans Ligi',
        'Conference League qualifying' => 'Konferans Ligi elemesi',
        'Relegated' => 'Düşme hattı',
        'Relegation' => 'Düşme hattı',
    ];

    private const STATUS_TR = [
        'STATUS_SCHEDULED' => 'Başlamadı',
        'STATUS_IN_PROGRESS' => 'Canlı',
        'STATUS_FIRST_HALF' => 'Canlı',
        'STATUS_SECOND_HALF' => 'Canlı',
        'STATUS_HALFTIME' => 'Devre',
        'STATUS_FULL_TIME' => 'MS',
        'STATUS_FINAL' => 'MS',
        'STATUS_FINAL_PEN' => 'Pen.',
        'STATUS_FINAL_AET' => 'Uzt.',
        'STATUS_POSTPONED' => 'Ertelendi',
        'STATUS_CANCELED' => 'İptal',
        'STATUS_CANCELLED' => 'İptal',
        'STATUS_DELAYED' => 'Gecikmeli',
        'STATUS_SUSPENDED' => 'Askıda',
        'STATUS_ABANDONED' => 'Yarıda kaldı',
    ];

    private const NO_SCORE = ['STATUS_POSTPONED', 'STATUS_CANCELED', 'STATUS_CANCELLED', 'STATUS_DELAYED', 'STATUS_SUSPENDED', 'STATUS_ABANDONED'];

    /** @var array<string, mixed>|null */
    private static ?array $memo = null;

    /**
     * @return array{
     *   standings: list<array<string, mixed>>,
     *   matches: list<array<string, mixed>>,
     *   live: list<array<string, mixed>>,
     *   results: list<array<string, mixed>>,
     *   upcoming: list<array<string, mixed>>,
     *   season: string,
     *   league: string,
     *   fetchedAt: int|null,
     *   degraded: bool,
     *   source: string
     * }
     */
    public static function bundle(): array
    {
        if (self::$memo !== null) {
            return self::$memo;
        }
        $file = self::cacheFile();
        $cached = self::readCache($file);
        $freshEnough = $cached !== null && time() - (int) $cached['t'] < self::FRESH;
        if ($freshEnough) {
            return self::$memo = self::present($cached['b'], (int) $cached['t'], false);
        }
        $fail = $file . '.fail';
        if (is_file($fail) && time() - (int) @filemtime($fail) < 30) {
            return self::$memo = self::fromCacheOrEmpty($cached, true);
        }
        $got = self::fetch();
        if ($got === null) {
            @touch($fail);
            return self::$memo = self::fromCacheOrEmpty($cached, true);
        }
        $merged = self::merge($got, $cached);
        if ($merged === null) {
            @touch($fail);
            return self::$memo = self::fromCacheOrEmpty($cached, true);
        }
        $payload = ['t' => time(), 'b' => $merged];
        $tmp = $file . '.' . getmypid() . '.tmp';
        if (@file_put_contents($tmp, json_encode($payload, JSON_UNESCAPED_UNICODE)) !== false) {
            @rename($tmp, $file);
        }
        @unlink($fail);
        return self::$memo = self::present($merged, (int) $payload['t'], false);
    }

    public static function hasTable(array $b): bool
    {
        return ($b['standings'] ?? []) !== [];
    }

    public static function hasFixtures(array $b): bool
    {
        return ($b['live'] ?? []) !== [] || ($b['results'] ?? []) !== [] || ($b['upcoming'] ?? []) !== [];
    }

    public static function hasStrip(array $b): bool
    {
        return self::hasTable($b) || self::hasFixtures($b);
    }

    /** @param array<string, mixed> $json @return list<array<string, mixed>> */
    public static function parseStandings(array $json): array
    {
        $rows = [];
        $children = $json['children'] ?? null;
        if (!is_array($children)) {
            return [];
        }
        foreach ($children as $child) {
            if (!is_array($child)) {
                continue;
            }
            $entries = $child['standings']['entries'] ?? null;
            if (!is_array($entries)) {
                continue;
            }
            foreach ($entries as $entry) {
                if (!is_array($entry)) {
                    continue;
                }
                $row = self::standingRow($entry);
                if ($row !== null) {
                    $rows[] = $row;
                }
            }
        }
        usort($rows, static fn (array $a, array $b): int => $a['rank'] <=> $b['rank']);
        $rows = array_values($rows);
        return count($rows) >= self::MIN_TABLE ? $rows : [];
    }

    /** @param array<string, mixed> $json @return list<array<string, mixed>> */
    public static function parseScoreboard(array $json): array
    {
        $events = $json['events'] ?? null;
        if (!is_array($events)) {
            return [];
        }
        $out = [];
        foreach ($events as $event) {
            if (!is_array($event)) {
                continue;
            }
            $row = self::matchRow($event);
            if ($row !== null) {
                $out[$row['id']] = $row;
            }
        }
        return array_values($out);
    }

    public static function seasonLabel(array $json): string
    {
        $raw = (string) ($json['season']['displayName'] ?? '');
        if ($raw === '' && isset($json['children'][0]['standings']['seasonDisplayName'])) {
            $raw = (string) $json['children'][0]['standings']['seasonDisplayName'];
        }
        if ($raw === '') {
            return '';
        }
        if (preg_match('/\d{4}\s*[-\/]\s*\d{2,4}/', $raw, $m) === 1) {
            return (string) preg_replace('/\s+/', '', $m[0]);
        }
        return $raw;
    }

    public static function teamName(string $display): string
    {
        $display = trim($display);
        return self::TR_NAME[$display] ?? $display;
    }

    /** @param array<string, mixed> $entry */
    private static function standingRow(array $entry): ?array
    {
        $team = $entry['team'] ?? null;
        if (!is_array($team)) {
            return null;
        }
        $raw = trim((string) ($team['displayName'] ?? ''));
        if ($raw === '') {
            return null;
        }
        $stats = [];
        foreach ($entry['stats'] ?? [] as $s) {
            if (is_array($s) && isset($s['name'])) {
                $stats[(string) $s['name']] = $s;
            }
        }
        $rank = self::num($stats, 'rank');
        $played = self::num($stats, 'gamesPlayed');
        $wins = self::num($stats, 'wins');
        $draws = self::num($stats, 'ties');
        $losses = self::num($stats, 'losses');
        $gf = self::num($stats, 'pointsFor');
        $ga = self::num($stats, 'pointsAgainst');
        $points = self::num($stats, 'points');
        if ($rank === null || $played === null || $wins === null || $draws === null || $losses === null
            || $gf === null || $ga === null || $points === null) {
            return null;
        }
        if ($rank < 1 || $rank > 30 || $played < 0 || $played > 60 || $points < 0 || $points > 180) {
            return null;
        }
        if ($wins < 0 || $draws < 0 || $losses < 0 || $gf < 0 || $ga < 0) {
            return null;
        }
        $note = '';
        if (isset($entry['note']) && is_array($entry['note'])) {
            $note = trim((string) ($entry['note']['description'] ?? ''));
        }
        $abbr = strtoupper(trim((string) ($team['abbreviation'] ?? '')));
        if ($abbr === '') {
            $abbr = mb_strtoupper(mb_substr($raw, 0, 3));
        }
        $change = self::num($stats, 'rankChange');
        return [
            'rank' => $rank,
            'team' => self::teamName($raw),
            'teamRaw' => $raw,
            'abbr' => $abbr,
            'played' => $played,
            'wins' => $wins,
            'draws' => $draws,
            'losses' => $losses,
            'gf' => $gf,
            'ga' => $ga,
            'gd' => $gf - $ga,
            'points' => $points,
            'rankChange' => $change,
            'zone' => $note === '' ? '' : (self::ZONE_TR[$note] ?? $note),
            'zoneRaw' => $note,
        ];
    }

    /** @param array<string, mixed> $event */
    private static function matchRow(array $event): ?array
    {
        $comp = $event['competitions'][0] ?? null;
        if (!is_array($comp)) {
            return null;
        }
        $type = $comp['status']['type'] ?? ($event['status']['type'] ?? []);
        if (!is_array($type)) {
            $type = [];
        }
        $state = (string) ($type['state'] ?? '');
        if (!in_array($state, ['pre', 'in', 'post'], true)) {
            $state = '';
        }
        $name = (string) ($type['name'] ?? '');
        $home = null;
        $away = null;
        foreach ($comp['competitors'] ?? [] as $c) {
            if (!is_array($c)) {
                continue;
            }
            if (($c['homeAway'] ?? '') === 'home') {
                $home = $c;
            } elseif (($c['homeAway'] ?? '') === 'away') {
                $away = $c;
            }
        }
        if (!is_array($home) || !is_array($away)) {
            return null;
        }
        $homeRaw = trim((string) ($home['team']['displayName'] ?? ''));
        $awayRaw = trim((string) ($away['team']['displayName'] ?? ''));
        if ($homeRaw === '' || $awayRaw === '') {
            return null;
        }
        $date = (string) ($comp['date'] ?? $event['date'] ?? '');
        try {
            $dt = new \DateTimeImmutable($date);
        } catch (\Throwable) {
            return null;
        }
        $dt = $dt->setTimezone(new \DateTimeZone('Europe/Istanbul'));
        $completed = (bool) ($type['completed'] ?? false);
        $homeScore = null;
        $awayScore = null;
        $show = ($state === 'in' || ($state === 'post' && $completed)) && !in_array($name, self::NO_SCORE, true);
        if ($show && self::scoreOk($home['score'] ?? null) && self::scoreOk($away['score'] ?? null)) {
            $homeScore = (int) $home['score'];
            $awayScore = (int) $away['score'];
        }
        $clock = '';
        if ($state === 'in') {
            $clock = trim((string) ($comp['status']['displayClock'] ?? ''));
            if ($clock === "0'" || $clock === '0') {
                $clock = '';
            }
        }
        $id = trim((string) ($event['id'] ?? $comp['id'] ?? ''));
        if ($id === '') {
            $id = $dt->format('YmdHi') . '-' . $homeRaw . '-' . $awayRaw;
        }
        $habbr = strtoupper(trim((string) ($home['team']['abbreviation'] ?? '')));
        $aabbr = strtoupper(trim((string) ($away['team']['abbreviation'] ?? '')));
        $months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        $days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        return [
            'id' => $id,
            'start' => $dt->getTimestamp(),
            'dayKey' => $dt->format('Y-m-d'),
            'dayLabel' => $dt->format('j') . ' ' . $months[(int) $dt->format('n')] . ' ' . $days[(int) $dt->format('w')],
            'clockLabel' => $dt->format('H:i'),
            'state' => $state,
            'status' => self::STATUS_TR[$name] ?? ($state === 'in' ? 'Canlı' : ($state === 'pre' ? 'Başlamadı' : '')),
            'statusRaw' => $name,
            'clock' => $clock,
            'home' => self::teamName($homeRaw),
            'away' => self::teamName($awayRaw),
            'homeAbbr' => $habbr !== '' ? $habbr : mb_strtoupper(mb_substr($homeRaw, 0, 3)),
            'awayAbbr' => $aabbr !== '' ? $aabbr : mb_strtoupper(mb_substr($awayRaw, 0, 3)),
            'homeScore' => $homeScore,
            'awayScore' => $awayScore,
            'venue' => trim((string) ($comp['venue']['fullName'] ?? '')),
        ];
    }

    /** @param array<string, mixed> $stats */
    private static function num(array $stats, string $name): ?int
    {
        if (!isset($stats[$name]) || !is_array($stats[$name])) {
            return null;
        }
        $v = $stats[$name]['value'] ?? $stats[$name]['displayValue'] ?? null;
        if (is_string($v)) {
            $v = str_replace(['+', ' ', ','], '', $v);
        }
        if (!is_numeric($v)) {
            return null;
        }
        return (int) round((float) $v);
    }

    private static function scoreOk(mixed $v): bool
    {
        return is_numeric($v) && (float) $v >= 0 && (float) $v <= 30 && abs((float) $v - (int) $v) < 0.001;
    }

    /** @return array{standings: list<array<string, mixed>>, matches: list<array<string, mixed>>, season: string, league: string}|null */
    private static function fetch(): ?array
    {
        $tz = new \DateTimeZone('Europe/Istanbul');
        $today = new \DateTimeImmutable('today', $tz);
        $urls = ['standings' => self::STANDINGS_URL];
        for ($i = -1; $i <= 6; $i++) {
            $d = $today->modify(sprintf('%+d days', $i));
            $urls['d' . $d->format('Ymd')] = self::SCORE_URL . $d->format('Ymd');
        }
        $bodies = self::curlMulti($urls);
        if ($bodies === []) {
            return null;
        }
        $standings = [];
        $season = '';
        $league = '';
        if (isset($bodies['standings'])) {
            $j = json_decode($bodies['standings'], true);
            if (is_array($j)) {
                $standings = self::parseStandings($j);
                $season = self::seasonLabel($j);
                $league = trim((string) ($j['name'] ?? ''));
            }
        }
        $byId = [];
        foreach ($bodies as $key => $body) {
            if ($key === 'standings') {
                continue;
            }
            $j = json_decode($body, true);
            if (!is_array($j)) {
                continue;
            }
            foreach (self::parseScoreboard($j) as $m) {
                $byId[$m['id']] = $m;
            }
        }
        $matches = array_values($byId);
        usort($matches, static fn (array $a, array $b): int => $a['start'] <=> $b['start']);
        if ($standings === [] && $matches === []) {
            return null;
        }
        return ['standings' => $standings, 'matches' => $matches, 'season' => $season, 'league' => $league !== '' ? $league : 'Turkish Super Lig'];
    }

    /**
     * @param array{standings: list<array<string, mixed>>, matches: list<array<string, mixed>>, season: string, league: string} $got
     * @param array{t: int, b: array<string, mixed>}|null $cached
     * @return array<string, mixed>|null
     */
    private static function merge(array $got, ?array $cached): ?array
    {
        $prev = ($cached !== null && time() - (int) $cached['t'] < self::STALE_MAX) ? $cached['b'] : null;
        if ($got['standings'] === [] && is_array($prev) && ($prev['standings'] ?? []) !== []) {
            $got['standings'] = $prev['standings'];
            if ($got['season'] === '') {
                $got['season'] = (string) ($prev['season'] ?? '');
            }
        }
        if ($got['matches'] === [] && is_array($prev) && ($prev['matches'] ?? []) !== []) {
            $got['matches'] = $prev['matches'];
        }
        if ($got['standings'] === [] && $got['matches'] === []) {
            return null;
        }
        return $got;
    }

    /** @param array{t: int, b: array<string, mixed>}|null $cached */
    private static function fromCacheOrEmpty(?array $cached, bool $degraded): array
    {
        if ($cached !== null && time() - (int) $cached['t'] < self::STALE_MAX) {
            return self::present($cached['b'], (int) $cached['t'], $degraded);
        }
        return self::present(['standings' => [], 'matches' => [], 'season' => '', 'league' => ''], null, false);
    }

    /** @param array<string, mixed> $b */
    private static function present(array $b, ?int $at, bool $degraded): array
    {
        $tz = new \DateTimeZone('Europe/Istanbul');
        $today = (new \DateTimeImmutable('now', $tz))->format('Y-m-d');
        $matches = is_array($b['matches'] ?? null) ? $b['matches'] : [];
        $live = [];
        $results = [];
        $upcoming = [];
        foreach ($matches as $m) {
            if (!is_array($m)) {
                continue;
            }
            if (($m['state'] ?? '') === 'in') {
                $live[] = $m;
            } elseif (($m['state'] ?? '') === 'post' && ($m['dayKey'] ?? '') === $today && $m['homeScore'] !== null) {
                $results[] = $m;
            } elseif (($m['state'] ?? '') === 'pre' && (int) ($m['start'] ?? 0) >= time() - 3600) {
                $upcoming[] = $m;
            }
        }
        return [
            'standings' => is_array($b['standings'] ?? null) ? $b['standings'] : [],
            'matches' => $matches,
            'live' => $live,
            'results' => $results,
            'upcoming' => $upcoming,
            'season' => (string) ($b['season'] ?? ''),
            'league' => (string) ($b['league'] ?? ''),
            'fetchedAt' => $at,
            'degraded' => $degraded,
            'source' => self::SOURCE,
        ];
    }

    /** @return array<string, string> */
    private static function curlMulti(array $urls): array
    {
        if (!function_exists('curl_multi_init')) {
            return [];
        }
        $mh = curl_multi_init();
        $handles = [];
        foreach ($urls as $key => $url) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_TIMEOUT => 4,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; SporGundemi/1.0)',
                CURLOPT_ENCODING => '',
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles[$key] = $ch;
        }
        $running = 0;
        $t0 = microtime(true);
        do {
            curl_multi_exec($mh, $running);
            if ($running > 0) {
                curl_multi_select($mh, 0.2);
            }
        } while ($running > 0 && microtime(true) - $t0 < 6.0);
        $out = [];
        foreach ($handles as $key => $ch) {
            $body = (string) curl_multi_getcontent($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
            if ($code === 200 && $body !== '') {
                $out[$key] = $body;
            }
        }
        curl_multi_close($mh);
        return $out;
    }

    /** @return array{t: int, b: array<string, mixed>}|null */
    private static function readCache(string $file): ?array
    {
        if (!is_file($file)) {
            return null;
        }
        $raw = json_decode((string) @file_get_contents($file), true);
        if (!is_array($raw) || !isset($raw['t'], $raw['b']) || !is_array($raw['b'])) {
            return null;
        }
        return ['t' => (int) $raw['t'], 'b' => $raw['b']];
    }

    private static function cacheFile(): string
    {
        $dir = getenv('WIDGET_CACHE_DIR');
        $dir = is_string($dir) && $dir !== '' ? $dir : sys_get_temp_dir() . '/ys-widgets';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return $dir . '/spor-live-v1.json';
    }
}
