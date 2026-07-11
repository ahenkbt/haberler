import { useQuery } from "@tanstack/react-query";
import type { YektubeSource } from "@workspace/yektube-core";
import { ytRoutes } from "@/lib/routes";
import { Link } from "wouter";
import { useMemberAuth } from "@/features/auth/MemberAuth";
import { fetchMySubscriptions } from "@/lib/memberApi";
import { fetchSources as fetchAllSources } from "@/lib/api";
import { loadGuestSubscriptions } from "@/lib/guestStorage";

import { ChannelAvatar } from "@/components/ChannelAvatar";

export function SubscriptionsPage() {
  const { member } = useMemberAuth();

  const { data: mySubs, isLoading: myLoading } = useQuery({
    queryKey: ["my-subs", member?.id ?? "guest"],
    queryFn: async () => {
      if (member) return fetchMySubscriptions();
      const ids = new Set(loadGuestSubscriptions());
      if (ids.size === 0) return [];
      const all = await fetchAllSources();
      return all.filter((s) => ids.has(s.id));
    },
  });

  const { data: discover, isLoading: discoverLoading } = useQuery({
    queryKey: ["yektube-v2-sources-discover"],
    queryFn: async () => {
      const sources = await fetchAllSources();
      return sources.filter((s) => s.active && s.sourceType === "channel" && !s.isLive);
    },
    enabled: Boolean(mySubs && mySubs.length === 0),
  });

  const isLoading = myLoading;
  const subscribed = mySubs ?? [];

  if (isLoading) {
    return (
      <div className="divide-y divide-[var(--color-yt-border)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-3">
            <div className="h-10 w-10 rounded-full bg-zinc-200" />
            <div className="h-4 flex-1 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="lg:p-6">
      <h1 className="px-4 py-3 text-xl font-bold lg:px-0 lg:pb-4">Abonelikler</h1>

      {subscribed.length > 0 ? (
        <div className="divide-y divide-[var(--color-yt-border)] lg:rounded-xl lg:border">
          {subscribed.map((s) => (
            <ChannelRow key={s.id} source={s} />
          ))}
        </div>
      ) : (
        <div className="px-4 lg:px-0">
          <p className="text-sm text-[var(--color-yt-muted)]">
            {member
              ? "Henüz abone olduğunuz kanal yok. Bir kanal sayfasından «Abone ol» ile ekleyin."
              : "Henüz abone olduğunuz kanal yok. Kanallardan abone olun; giriş yapınca hesabınıza aktarılır."}
          </p>

          {discoverLoading ? (
            <div className="mt-6 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-zinc-100" />
              ))}
            </div>
          ) : discover?.length ? (
            <>
              <h2 className="mt-8 mb-2 text-sm font-semibold text-zinc-700">Keşfet</h2>
              <div className="divide-y divide-[var(--color-yt-border)] rounded-xl border">
                {discover.slice(0, 12).map((s) => (
                  <ChannelRow key={s.id} source={s} />
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ChannelRow({ source: s }: { source: YektubeSource }) {
  return (
    <Link
      href={ytRoutes.channel({ id: s.id, name: s.name })}
      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 lg:rounded-lg"
    >
      <ChannelAvatar
        source={s}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
        fallbackClassName="h-10 w-10 shrink-0 rounded-full text-sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{s.name}</p>
        <p className="text-xs text-[var(--color-yt-muted)]">
          {(s.videoCount ?? 0) > 0 ? `${s.videoCount} video` : "Kanal"}
        </p>
      </div>
    </Link>
  );
}
