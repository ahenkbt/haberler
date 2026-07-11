import { Link } from "wouter";
import { ytRoutes } from "@/lib/routes";
import { cn } from "@/lib/cn";

export function WatchDetailMetaBar({
  title,
  channelName,
  channelHref,
  logoUrl,
  viewLabel,
  loading,
  compact,
  titleOnly,
  className,
}: {
  title: string;
  channelName: string;
  channelHref: string;
  logoUrl?: string;
  viewLabel?: string | null;
  loading?: boolean;
  compact?: boolean;
  /** Üst kromda yalnızca başlık; kanal logosu/adı video altında kalır. */
  titleOnly?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn("px-3 py-2.5 lg:px-4", className)}>
        <div className="h-5 w-3/4 max-w-xl animate-pulse rounded yt-skeleton" />
        {!titleOnly ? <div className="mt-2 h-4 w-40 animate-pulse rounded yt-skeleton" /> : null}
      </div>
    );
  }

  return (
    <div className={cn("px-3 py-2.5 lg:px-4", compact && "py-2", className)}>
      <h1
        className={cn(
          "font-semibold leading-snug text-[var(--color-yt-text)]",
          compact ? "line-clamp-2 text-sm lg:text-base" : "text-base lg:text-lg",
        )}
      >
        {title}
      </h1>
      {titleOnly ? null : (
        <Link href={channelHref} className="mt-1.5 flex min-w-0 items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full yt-avatar text-xs font-bold">
              {channelName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{channelName}</p>
            {viewLabel ? (
              <p className="text-xs text-[var(--color-yt-muted)]">{viewLabel}</p>
            ) : (
              <p className="text-xs text-[var(--color-yt-muted)]">Kanala git</p>
            )}
          </div>
        </Link>
      )}
    </div>
  );
}

export function watchChannelHref(
  effectiveSource: { id: number; name: string } | null | undefined,
  channelRef: string,
  effectiveChannelId: number,
): string {
  if (effectiveSource) {
    return ytRoutes.channel({ id: effectiveSource.id, name: effectiveSource.name });
  }
  if (effectiveChannelId > 0) {
    return ytRoutes.channel({ id: effectiveChannelId, name: channelRef });
  }
  return ytRoutes.channel(channelRef);
}
