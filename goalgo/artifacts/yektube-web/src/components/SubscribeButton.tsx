import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { useMemberAuth } from "@/features/auth/MemberAuth";
import {
  fetchSubscriptionStatus,
  subscribeSource,
  unsubscribeSource,
} from "@/lib/memberApi";
import {
  isGuestSubscribed,
  toggleGuestSubscription,
} from "@/lib/guestStorage";
import { cn } from "@/lib/cn";

export function SubscribeButton({
  sourceId,
  className,
  compact,
}: {
  sourceId: number;
  className?: string;
  compact?: boolean;
}) {
  const { member } = useMemberAuth();
  const qc = useQueryClient();

  const { data: subscribed = false, isLoading } = useQuery({
    queryKey: ["sub-status", sourceId, member?.id ?? "guest"],
    queryFn: async () => {
      if (member) return fetchSubscriptionStatus(sourceId);
      return isGuestSubscribed(sourceId);
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (member) {
        if (subscribed) await unsubscribeSource(sourceId);
        else await subscribeSource(sourceId);
      } else {
        toggleGuestSubscription(sourceId);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sub-status", sourceId] });
      void qc.invalidateQueries({ queryKey: ["my-subs"] });
    },
  });

  if (isLoading) {
    return (
      <div className={cn("h-9 w-24 animate-pulse rounded-full yt-skeleton", className)} />
    );
  }

  const label = subscribed ? "Abone" : "Abone ol";
  const Icon = subscribed ? Bell : BellOff;

  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
        subscribed
          ? "yt-nav-active text-[var(--color-yt-text)] hover:opacity-90"
          : "yt-btn-primary hover:opacity-90",
        compact && "px-3 py-1.5 text-xs",
        className,
      )}
    >
      <Icon className={cn("h-4 w-4", compact && "h-3.5 w-3.5")} />
      {label}
    </button>
  );
}
