import { useState } from "react";
import { cn } from "@/lib/cn";

export function MemberAuthPanel({
  mode,
  onModeChange,
  onLogin,
  onRegister,
  compact,
}: {
  mode: "login" | "register";
  onModeChange: (m: "login" | "register") => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (body: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className={cn(
        "rounded-xl border border-[var(--color-yt-border)] yt-panel-muted p-4",
        compact ? "mt-0 max-w-none" : "mt-4 max-w-md",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        setLoading(true);
        setErr("");
        const action =
          mode === "login"
            ? onLogin(email, password)
            : onRegister({ firstName, lastName, email, password });
        void action.catch((ex: Error) => setErr(ex.message)).finally(() => setLoading(false));
      }}
    >
      <div className="mb-3 flex gap-2 text-xs font-semibold">
        <button
          type="button"
          className={cn(
            "rounded-full px-3 py-1",
            mode === "login" ? "yt-btn-primary" : "text-[var(--color-yt-muted)]",
          )}
          onClick={() => onModeChange("login")}
        >
          Giriş
        </button>
        <button
          type="button"
          className={cn(
            "rounded-full px-3 py-1",
            mode === "register" ? "yt-btn-primary" : "text-[var(--color-yt-muted)]",
          )}
          onClick={() => onModeChange("register")}
        >
          Kayıt ol
        </button>
      </div>
      {mode === "register" ? (
        <div className="mb-2 grid grid-cols-2 gap-2">
          <input
            className="yt-input rounded-lg border px-3 py-2 text-sm"
            placeholder="Ad"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            className="yt-input rounded-lg border px-3 py-2 text-sm"
            placeholder="Soyad"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      ) : null}
      <input
        type="email"
        className="yt-input mb-2 w-full rounded-lg border px-3 py-2 text-sm"
        placeholder="E-posta"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <input
        type="password"
        className="yt-input mb-2 w-full rounded-lg border px-3 py-2 text-sm"
        placeholder="Şifre (en az 6 karakter)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        required
        minLength={6}
      />
      {err ? <p className="mb-2 text-sm text-red-600">{err}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="yt-btn-primary w-full rounded-lg py-2 text-sm font-semibold disabled:opacity-60"
      >
        {loading ? "Bekleyin…" : mode === "login" ? "Giriş yap" : "Hesap oluştur"}
      </button>
      <p className="mt-2 text-xs text-[var(--color-yt-muted)]">Yekpare site üyeliği ile aynı hesap kullanılır.</p>
    </form>
  );
}
