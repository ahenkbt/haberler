import type { ComponentType } from "react";

export function SadeOptionPill({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
        active
          ? "border-[#0f766e] bg-[#0f766e] text-white shadow-md"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
      }`}
      style={active ? { color: "#fff" } : undefined}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

export function SadeBookingSummaryCard({
  icon: Icon,
  label,
  value,
  tone = "emerald",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "emerald" | "sky" | "orange";
}) {
  const toneClass =
    tone === "sky"
      ? "bg-sky-50 text-sky-700"
      : tone === "orange"
        ? "bg-orange-50 text-orange-700"
        : "bg-emerald-50 text-[#0f766e]";
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
