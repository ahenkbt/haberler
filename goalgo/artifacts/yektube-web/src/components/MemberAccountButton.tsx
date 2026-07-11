import { useState } from "react";
import { Link } from "wouter";
import { CircleUser, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { ytRoutes } from "@/lib/routes";
import { useMemberAuth } from "@/features/auth/MemberAuth";
import { MemberAuthDialog } from "@/features/auth/MemberAuthDialog";

export function MemberAccountButton({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { member, ready, logout } = useMemberAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [menuOpen, setMenuOpen] = useState(false);

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setMenuOpen(false);
  };

  if (!ready) {
    return <div className={cn("h-9 w-9 animate-pulse rounded-full yt-skeleton", className)} />;
  }

  if (member) {
    const initial = (member.firstName?.charAt(0) || member.email.charAt(0)).toUpperCase();
    return (
      <div className={cn("relative", className)}>
        <button
          type="button"
          aria-label="Hesabım"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-full yt-avatar text-sm font-bold yt-panel-hover"
        >
          {initial}
        </button>
        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[90]"
              aria-label="Menüyü kapat"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full z-[91] mt-1 min-w-[180px] rounded-xl border border-[var(--color-yt-border)] yt-panel py-1 shadow-lg">
              <div className="border-b border-[var(--color-yt-border)] px-3 py-2">
                <p className="truncate text-sm font-semibold">
                  {member.firstName} {member.lastName}
                </p>
                <p className="truncate text-xs text-[var(--color-yt-muted)]">{member.email}</p>
              </div>
              <Link
                href={ytRoutes.userPanel()}
                className="block px-3 py-2 text-sm yt-panel-hover"
                onClick={() => setMenuOpen(false)}
              >
                Hesabım
              </Link>
              <Link
                href={ytRoutes.userStudio()}
                className="block px-3 py-2 text-sm yt-panel-hover"
                onClick={() => setMenuOpen(false)}
              >
                Yek Gönder Stüdyo
              </Link>
              <Link
                href={ytRoutes.library()}
                className="block px-3 py-2 text-sm yt-panel-hover"
                onClick={() => setMenuOpen(false)}
              >
                Kütüphane
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm yt-panel-hover"
                onClick={() => {
                  setMenuOpen(false);
                  void logout();
                }}
              >
                <LogOut className="h-4 w-4" />
                Çıkış yap
              </button>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          aria-label="Oturum aç"
          onClick={() => openAuth("login")}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full yt-panel-hover",
            className,
          )}
        >
          <CircleUser className="h-5 w-5" />
        </button>
      ) : (
        <div className={cn("flex items-center gap-2", className)}>
          <button
            type="button"
            onClick={() => openAuth("register")}
            className="rounded-full border border-[var(--color-yt-border)] px-3 py-1.5 text-sm font-medium yt-panel-hover"
          >
            Kayıt ol
          </button>
          <button
            type="button"
            onClick={() => openAuth("login")}
            className="yt-btn-primary rounded-full px-4 py-1.5 text-sm font-semibold"
          >
            Oturum aç
          </button>
        </div>
      )}
      <MemberAuthDialog open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </>
  );
}
