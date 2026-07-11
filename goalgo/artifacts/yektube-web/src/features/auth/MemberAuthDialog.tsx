import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useMemberAuth } from "@/features/auth/MemberAuth";
import { MemberAuthPanel } from "@/features/auth/MemberAuthPanel";

export function MemberAuthDialog({
  open,
  onClose,
  initialMode = "login",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}) {
  const { login, register, member } = useMemberAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  useEffect(() => {
    if (member && open) onClose();
  }, [member, open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-dialog-title"
    >
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Kapat" onClick={onClose} />
      <div className="relative z-[1] w-full max-w-md rounded-t-2xl border border-[var(--color-yt-border)] yt-panel p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="auth-dialog-title" className="text-lg font-bold">
              {mode === "login" ? "Oturum aç" : "Hesap oluştur"}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-yt-muted)]">
              Geçmiş, abonelikler ve listeleriniz senkronlanır.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 yt-panel-hover"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <MemberAuthPanel
          compact
          mode={mode}
          onModeChange={setMode}
          onLogin={login}
          onRegister={register}
        />
      </div>
    </div>
  );
}
