import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListPlus } from "lucide-react";
import { useMemberAuth } from "@/features/auth/MemberAuth";
import { addToPlaylist, createPlaylist, fetchPlaylists } from "@/lib/memberApi";
import { cn } from "@/lib/cn";

export function AddToPlaylistButton({
  videoId,
  className,
}: {
  videoId: number;
  className?: string;
}) {
  const { member } = useMemberAuth();
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const qc = useQueryClient();

  const { data: playlists = [] } = useQuery({
    queryKey: ["my-playlists"],
    queryFn: fetchPlaylists,
    enabled: Boolean(member && open),
  });

  const addMut = useMutation({
    mutationFn: ({ playlistId }: { playlistId: number }) => addToPlaylist(playlistId, videoId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-playlists"] });
      setOpen(false);
    },
  });

  const createMut = useMutation({
    mutationFn: async (title: string) => {
      const pl = await createPlaylist(title);
      await addToPlaylist(pl.id, videoId);
    },
    onSuccess: () => {
      setNewTitle("");
      void qc.invalidateQueries({ queryKey: ["my-playlists"] });
      setOpen(false);
    },
  });

  if (!member || !videoId) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--color-yt-border)] px-3 py-1.5 text-sm font-medium yt-row-hover"
      >
        <ListPlus className="h-4 w-4" />
        Listeye ekle
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Kapat"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-[var(--color-yt-border)] yt-panel p-2 shadow-lg">
            {playlists.length === 0 ? (
              <p className="px-2 py-1 text-xs text-[var(--color-yt-muted)]">Henüz liste yok.</p>
            ) : (
              <ul className="max-h-48 overflow-y-auto">
                {playlists.map((pl) => (
                  <li key={pl.id}>
                    <button
                      type="button"
                      disabled={addMut.isPending}
                      onClick={() => addMut.mutate({ playlistId: pl.id })}
                      className="w-full rounded-lg px-2 py-2 text-left text-sm yt-row-hover"
                    >
                      {pl.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-2 flex gap-1 border-t border-[var(--color-yt-border)] pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (newTitle.trim()) createMut.mutate(newTitle.trim());
              }}
            >
              <input
                className="min-w-0 flex-1 rounded border yt-input px-2 py-1 text-xs"
                placeholder="Yeni liste"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <button type="submit" className="rounded yt-btn-primary px-2 py-1 text-xs">
                +
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
