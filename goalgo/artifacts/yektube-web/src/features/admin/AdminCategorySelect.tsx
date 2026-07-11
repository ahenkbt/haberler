import { useAdminCategoryOptions } from "@/features/admin/useAdminCategoryOptions";

export function AdminCategorySelect({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const options = useAdminCategoryOptions();
  return (
    <select
      className={`w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
