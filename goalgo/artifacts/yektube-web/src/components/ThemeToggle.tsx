import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/features/theme/ThemeProvider";
import type { ThemePreference } from "@/lib/themeStorage";

const OPTIONS: { id: Exclude<ThemePreference, "auto">; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Açık", icon: Sun },
  { id: "dark", label: "Koyu", icon: Moon },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const active = preference === "dark" ? "dark" : "light";

  if (compact) {
    const next: ThemePreference = active === "dark" ? "light" : "dark";
    const Icon = active === "dark" ? Moon : Sun;
    return (
      <button
        type="button"
        aria-label={`Tema: ${active === "dark" ? "Koyu" : "Açık"}. Değiştirmek için dokunun.`}
        title={`Tema: ${active === "dark" ? "Koyu" : "Açık"}`}
        onClick={() => setPreference(next)}
        className="flex h-10 w-10 items-center justify-center rounded-full yt-panel-hover text-[var(--color-yt-text)]"
      >
        <Icon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      className="inline-flex rounded-full border border-[var(--color-yt-border)] p-0.5 yt-panel-muted"
      role="group"
      aria-label="Tema seçimi"
    >
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={active === id}
          onClick={() => setPreference(id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            active === id
              ? "bg-[var(--color-yt-primary)] text-[var(--color-yt-primary-text)]"
              : "text-[var(--color-yt-muted)] hover:text-[var(--color-yt-text)]",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
