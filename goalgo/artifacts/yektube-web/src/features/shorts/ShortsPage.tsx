import { useEffect } from "react";
import { Link } from "wouter";
import { Upload } from "lucide-react";
import { ShortsReel } from "./ShortsReel";
import { useOptionalMusicPlayer } from "@/features/music/MusicContext";
import { useMemberAuth } from "@/features/auth/MemberAuth";
import { ytRoutes } from "@/lib/routes";

export function ShortsPage() {
  const { clear } = useOptionalMusicPlayer() ?? {};
  const { member } = useMemberAuth();

  useEffect(() => {
    clear?.();
  }, [clear]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {member ? (
        <Link
          href={ytRoutes.studioAdd({ yekcek: true })}
          className="absolute right-3 top-3 z-30 flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-white/25"
        >
          <Upload className="h-3.5 w-3.5" />
          Yekçek yükle
        </Link>
      ) : null}
      <ShortsReel />
    </div>
  );
}
