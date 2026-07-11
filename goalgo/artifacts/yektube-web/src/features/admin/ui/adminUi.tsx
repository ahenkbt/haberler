import { Children, isValidElement, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { isAdminEmbedLight } from "../adminEmbedTheme";

type AdminBtnVariant = "primary" | "secondary" | "danger" | "ghost";

function adminBtnPalette(variant: AdminBtnVariant, light: boolean): CSSProperties {
  if (light) {
    if (variant === "primary") {
      return { color: "#ffffff", WebkitTextFillColor: "#ffffff", backgroundColor: "#dc2626", borderColor: "#dc2626" };
    }
    if (variant === "danger") {
      return { color: "#991b1b", WebkitTextFillColor: "#991b1b", backgroundColor: "#fef2f2", borderColor: "#fecaca" };
    }
    if (variant === "ghost") {
      return { color: "#52525b", WebkitTextFillColor: "#52525b", backgroundColor: "transparent", borderColor: "transparent" };
    }
    return { color: "#18181b", WebkitTextFillColor: "#18181b", backgroundColor: "#ffffff", borderColor: "#d4d4d8" };
  }
  if (variant === "primary") {
    return { color: "#ffffff", WebkitTextFillColor: "#ffffff" };
  }
  if (variant === "danger") {
    return { color: "#fecaca", WebkitTextFillColor: "#fecaca" };
  }
  if (variant === "ghost") {
    return { color: "#d4d4d8", WebkitTextFillColor: "#d4d4d8" };
  }
  return { color: "#f4f4f5", WebkitTextFillColor: "#f4f4f5" };
}

/** Düğme metni — embed temada okunurluk için inline renk miras alır */
export function AdminBtnLabel({ children }: { children: ReactNode }) {
  return <span className="yt-admin-btn-label">{children}</span>;
}

function normalizeAdminBtnChildren(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return <AdminBtnLabel>{child}</AdminBtnLabel>;
    }
    if (isValidElement(child) && child.type === AdminBtnLabel) return child;
    return child;
  });
}

function useAdminUiTheme() {
  const light = isAdminEmbedLight();
  return {
    light,
    pageBorder: light ? "border-slate-200" : "border-zinc-800",
    title: light ? "text-zinc-900" : "text-white",
    muted: light ? "text-zinc-500" : "text-zinc-400",
    label: light ? "text-zinc-700" : "text-zinc-300",
    card: light ? "border-slate-200 bg-white" : "border-zinc-800 bg-zinc-900/80",
    cardHeader: light ? "border-slate-200" : "border-zinc-800",
    input: light
      ? "border-slate-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-red-500/50 focus:ring-red-500/30"
      : "border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-red-500/30",
    stat: light
      ? "border-slate-200 bg-white"
      : "border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950",
    statValue: light ? "text-zinc-900" : "text-white",
  };
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const t = useAdminUiTheme();
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-5", t.pageBorder)}>
      <div>
        <h1 className={cn("text-2xl font-bold tracking-tight", t.title)}>{title}</h1>
        {description ? <p className={cn("mt-1 max-w-2xl text-sm", t.muted)}>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const t = useAdminUiTheme();
  return (
    <section className={cn("rounded-xl border", t.card, className)}>
      {title ? (
        <div className={cn("border-b px-4 py-3", t.cardHeader)}>
          <h2 className={cn("text-sm font-semibold", t.title)}>{title}</h2>
          {description ? <p className={cn("mt-0.5 text-xs", t.muted)}>{description}</p> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const t = useAdminUiTheme();
  return (
    <label className="block">
      <span className={cn("text-xs font-medium", t.label)}>{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className={cn("mt-1 text-[11px]", t.muted)}>{hint}</p> : null}
    </label>
  );
}

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const t = useAdminUiTheme();
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
        t.input,
        props.className,
      )}
    />
  );
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const t = useAdminUiTheme();
  return (
    <select
      {...props}
      className={cn("w-full rounded-lg border px-3 py-2 text-sm focus:border-red-500/50 focus:outline-none", t.input, props.className)}
    />
  );
}

export function AdminBtn({
  children,
  variant = "secondary",
  className,
  style,
  title,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminBtnVariant;
}) {
  const light = isAdminEmbedLight();
  const palette = adminBtnPalette(variant, light);
  const labelText = typeof children === "string" ? children : title;
  return (
    <button
      type={type}
      {...props}
      title={title ?? (typeof labelText === "string" ? labelText : undefined)}
      style={{ ...palette, ...style }}
      className={cn(
        "yt-admin-btn inline-flex min-h-10 min-w-fit items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
        variant === "primary" && "yt-admin-btn--primary bg-red-600 hover:bg-red-700",
        variant === "secondary" &&
          (light
            ? "yt-admin-btn--secondary border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
            : "yt-admin-btn--secondary border-zinc-500 bg-zinc-800 hover:border-zinc-400 hover:bg-zinc-700"),
        variant === "danger" &&
          (light
            ? "yt-admin-btn--danger border-red-200 bg-red-50 hover:bg-red-100"
            : "yt-admin-btn--danger border-red-700/70 bg-red-950/60 hover:bg-red-950/90"),
        variant === "ghost" &&
          (light
            ? "yt-admin-btn--ghost border-transparent hover:bg-slate-100"
            : "yt-admin-btn--ghost border-transparent hover:bg-zinc-800"),
        className,
      )}
    >
      {normalizeAdminBtnChildren(children)}
    </button>
  );
}

export function AdminTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  const light = isAdminEmbedLight();
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const isActive = active === t.id;
        const tabStyle: CSSProperties = isActive
          ? { color: "#ffffff", WebkitTextFillColor: "#ffffff", backgroundColor: "#dc2626", borderColor: "#dc2626" }
          : light
            ? { color: "#3f3f46", WebkitTextFillColor: "#3f3f46", backgroundColor: "#ffffff", borderColor: "#d4d4d8" }
            : { color: "#f4f4f5", WebkitTextFillColor: "#f4f4f5", backgroundColor: "#27272a", borderColor: "#52525b" };
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={tabStyle}
            className={cn(
              "yt-admin-tab rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
              isActive && "yt-admin-tab--active shadow-md shadow-red-900/30",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function AdminAlert({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "warn" }) {
  const light = isAdminEmbedLight();
  return (
    <p
      className={cn(
        "rounded-lg px-3 py-2 text-sm",
        tone === "info" &&
          (light
            ? "border border-sky-200 bg-sky-50 text-sky-900"
            : "border border-sky-900/40 bg-sky-950/30 text-sky-200"),
        tone === "success" &&
          (light
            ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border border-emerald-900/40 bg-emerald-950/30 text-emerald-300"),
        tone === "warn" &&
          (light
            ? "border border-amber-200 bg-amber-50 text-amber-950"
            : "border border-amber-900/40 bg-amber-950/30 text-amber-200"),
      )}
    >
      {children}
    </p>
  );
}

export function AdminStatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

export function AdminStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  const t = useAdminUiTheme();
  return (
    <div className={cn("rounded-xl border p-4", t.stat)}>
      <p className={cn("text-[10px] font-bold uppercase tracking-wider", t.muted)}>{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", t.statValue)}>{value}</p>
      {sub ? <p className={cn("mt-0.5 text-xs", t.muted)}>{sub}</p> : null}
    </div>
  );
}
