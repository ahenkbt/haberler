import type { ReactElement } from "react";

export type EcommerceCategoryNode = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  position: number;
  children: EcommerceCategoryNode[];
};

function leafOptions(node: EcommerceCategoryNode, ancestors: string[]): ReactElement[] {
  if (node.children.length === 0) {
    const label = [...ancestors, node.name].join(" › ");
    return [
      <option key={node.id} value={String(node.id)}>
        {label}
      </option>,
    ];
  }
  return node.children.flatMap((child) => leafOptions(child, [...ancestors, node.name]));
}

export function EcommerceCategorySelect({
  tree,
  value,
  onChange,
  className,
}: {
  tree: EcommerceCategoryNode[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ??
        "w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-indigo-500"
      }
    >
      <option value="">— Alışveriş kategorisi seçin —</option>
      {tree.map((top) => (
        <optgroup key={top.id} label={top.name}>
          {leafOptions(top, [])}
        </optgroup>
      ))}
    </select>
  );
}
