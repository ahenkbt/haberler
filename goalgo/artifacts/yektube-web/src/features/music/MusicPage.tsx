import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, Search } from "lucide-react";
import { fetchSources, fetchVideos } from "@/lib/api";
import { decodeHtml } from "@/lib/constants";
import { ytRoutes } from "@/lib/routes";
import { dedupeFeedVideos } from "@/lib/dedupeVideos";
import { filterMusicVideos, filterVideosByMood, MUSIC_MOODS, splitMusicAlbums } from "@/lib/musicFilter";
import { readSessionFeedSeed } from "@/lib/sessionFeedSeed";
import { MusicQuickPicks, MusicShelf } from "@/components/MusicShelf";
import { ChannelAvatar } from "@/components/ChannelAvatar";
import { cn } from "@/lib/cn";
import { useMusicPlayer } from "@/features/music/MusicContext";

const MUSIC_SLUG = "muzik";

export function MusicPage() {
  const [moodId, setMoodId] = useState("all");
  const { setCatalog } = useMusicPlayer();
  const mood = MUSIC_MOODS.find((m) => m.id === moodId) ?? MUSIC_MOODS[0]!;

  const { data: sources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ["yektube-music-sources"],
    queryFn: async () => {
      try {
        return await fetchSources();
      } catch {
        return [];
      }
    },
    select: (rows) =>
      rows.filter((s) => {
        if (!s.active) return false;
        const slug = s.categorySlug?.trim().toLowerCase();
        return slug === MUSIC_SLUG || slug === "müzik" || slug === "music";
      }),
    retry: 1,
  });

  const musicSourceIds = useMemo(() => new Set(sources.map((s) => s.id)), [sources]);
  const sourceIdList = useMemo(() => sources.map((s) => s.id).slice(0, 16), [sources]);

  const feedSeed = useMemo(() => readSessionFeedSeed("yektube-music-seed"), []);

  const { data: categoryFeed, isLoading: categoryLoading, isError, refetch } = useQuery({
    queryKey: ["yektube-music-feed", feedSeed],
    queryFn: () =>
      fetchVideos({
        limit: 128,
        categorySlug: MUSIC_SLUG,
        excludeStories: true,
        longFormOnly: true,
        mixChannels: true,
        seed: feedSeed,
      }),
    retry: 1,
  });

  const { data: sourceFeedItems = [], isLoading: sourceFeedLoading } = useQuery({
    queryKey: ["yektube-music-source-feeds", sourceIdList],
    enabled: sourceIdList.length > 0,
    queryFn: async () => {
      const batches = await Promise.allSettled(
        sourceIdList.map((id) =>
          fetchVideos({
            sourceId: id,
            limit: 32,
            excludeStories: true,
            longFormOnly: true,
            musicCatalogOnly: true,
          }),
        ),
      );
      return batches.flatMap((b) => (b.status === "fulfilled" ? b.value.items : []));
    },
    retry: 1,
  });

  const allTracks = useMemo(() => {
    const merged = dedupeFeedVideos([...(categoryFeed?.items ?? []), ...sourceFeedItems]);
    return filterMusicVideos(merged, musicSourceIds);
  }, [categoryFeed?.items, sourceFeedItems, musicSourceIds]);

  const tracks = useMemo(() => filterVideosByMood(allTracks, moodId), [allTracks, moodId]);
  const { albums: albumTracks, tracks: streamTracks } = useMemo(() => splitMusicAlbums(tracks), [tracks]);
  const isLoading = categoryLoading || (sourceIdList.length > 0 && sourceFeedLoading);

  useEffect(() => {
    setCatalog(allTracks);
  }, [allTracks, setCatalog]);

  const listenAgain = streamTracks.slice(0, 12);
  const recommended = streamTracks.slice(12, 24);
  const quickPicks = streamTracks.slice(0, 30);
  const liveStyle = streamTracks
    .filter((v) => /canlı|live|performans|concert/i.test(`${v.title} ${v.description ?? ""}`))
    .slice(0, 10);
  const newReleases = streamTracks.slice(0, 10);

  return (
    <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden bg-[var(--color-yt-bg)] pb-4 text-[var(--color-yt-text)]">
      <div className="sticky top-0 z-20 bg-[var(--color-yt-bg)]/95 px-4 py-3 backdrop-blur-md lg:px-6">
        <Link
          href={ytRoutes.search()}
          className="mx-auto flex max-w-2xl items-center gap-3 rounded-full bg-[var(--color-yt-chip)] px-4 py-2.5 text-sm text-[var(--color-yt-muted)] ring-1 ring-[var(--color-yt-border)] hover:ring-[var(--color-yt-text)]/20"
        >
          <Search className="h-5 w-5 shrink-0" />
          <span>Şarkı, albüm, sanatçı veya podcast arayın</span>
        </Link>
      </div>

      <section className="mt-2 min-w-0 px-4 lg:px-6">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MUSIC_MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMoodId(m.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                moodId === m.id
                  ? "bg-[var(--color-yt-text)] text-[var(--color-yt-bg)]"
                  : "bg-[var(--color-yt-chip)] text-[var(--color-yt-text)] hover:bg-[var(--color-yt-border)]",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-yt-muted)]" />
        </div>
      ) : null}

      {isError ? (
        <div className="py-12 text-center">
          <p className="text-sm text-red-600">Müzik listesi yüklenemedi.</p>
          <button type="button" onClick={() => void refetch()} className="mt-2 text-sm font-medium underline">
            Yeniden dene
          </button>
        </div>
      ) : null}

      {!isLoading && tracks.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-[var(--color-yt-muted)]">
          Bu türde müzik videosu bulunamadı. Yönetici panelinden «Müzik Yönetimi» ile içerik ekleyin.
        </p>
      ) : null}

      {!isLoading && tracks.length > 0 ? (
        <>
          <MusicShelf
            title={moodId === "all" ? "Yeniden dinleyin" : mood.label}
            videos={listenAgain}
            queue={tracks}
          />
          <MusicShelf title="Sizin için önerilen parçalar" videos={recommended.length ? recommended : listenAgain} queue={tracks} />

          <section className="mb-8 min-w-0 px-4 lg:px-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Müzik kanalları</h2>
              {sourcesLoading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--color-yt-muted)]" /> : null}
            </div>
            {sources.length === 0 && !sourcesLoading ? (
              <p className="text-sm text-[var(--color-yt-muted)]">Henüz müzik kanalı yok.</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                {sources.map((s) => (
                  <Link
                    key={s.id}
                    href={ytRoutes.channel({ id: s.id, name: s.name })}
                    className="flex w-24 shrink-0 flex-col items-center gap-2 text-center"
                  >
                    <ChannelAvatar
                      source={s}
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-[var(--color-yt-border)]"
                      fallbackClassName="h-16 w-16 rounded-full text-lg ring-2 ring-[var(--color-yt-border)]"
                    />
                    <span className="line-clamp-2 text-xs font-medium">{decodeHtml(s.name)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <MusicQuickPicks title="Hızlı seçimler" videos={quickPicks} queue={tracks} />

          {albumTracks.length > 0 ? (
            <MusicShelf title="Albümler" videos={albumTracks} queue={tracks} variant="wide" />
          ) : null}

          {liveStyle.length > 0 ? (
            <MusicShelf title="Canlı performanslar" videos={liveStyle} queue={tracks} variant="wide" />
          ) : null}

          <MusicShelf title="Yeni çıkanlar" videos={newReleases} queue={tracks} />
        </>
      ) : null}
    </div>
  );
}
