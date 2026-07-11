import { useState } from "react";
import { ChevronDown, Menu } from "lucide-react";

export type StoreCategoryNode = {
  id: number;
  name: string;
  children: StoreCategoryNode[];
};

type Props = {
  tree: StoreCategoryNode[];
  activeId: number | null;
  expandedIds: Set<number>;
  onSelect: (id: number | null) => void;
  onToggleExpand: (id: number) => void;
  topVisible?: number;
  className?: string;
};

function AccordionNode({
  node,
  depth,
  activeId,
  expandedIds,
  onSelect,
  onToggleExpand,
}: {
  node: StoreCategoryNode;
  depth: number;
  activeId: number | null;
  expandedIds: Set<number>;
  onSelect: (id: number) => void;
  onToggleExpand: (id: number) => void;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = expandedIds.has(node.id);
  const isActive = activeId === node.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) onToggleExpand(node.id);
        }}
        className={`flex w-full items-center justify-between gap-2 py-2.5 text-left text-sm transition border-b border-gray-100 last:border-0 ${
          isActive ? "bg-blue-50 text-blue-800 font-semibold" : "text-gray-700 hover:bg-gray-50"
        }`}
        style={{ paddingLeft: `${12 + depth * 14}px`, paddingRight: 12 }}
      >
        <span className="min-w-0 truncate">
          {depth > 0 && !hasChildren ? <span className="text-gray-400 mr-1">-</span> : null}
          {node.name}
        </span>
        {hasChildren ? (
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        ) : null}
      </button>
      {hasChildren && expanded ? (
        <div className="bg-gray-50/80">
          {node.children.map((child) =>
            child.children.length > 0 ? (
              <AccordionNode
                key={child.id}
                node={child}
                depth={depth + 1}
                activeId={activeId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
              />
            ) : (
              <button
                key={child.id}
                type="button"
                onClick={() => onSelect(child.id)}
                className={`flex w-full items-center py-2 text-left text-sm border-b border-gray-100/80 last:border-0 transition ${
                  activeId === child.id
                    ? "bg-blue-100/80 text-blue-800 font-semibold"
                    : "text-gray-600 hover:bg-white hover:text-gray-900"
                }`}
                style={{ paddingLeft: `${26 + depth * 14}px`, paddingRight: 12 }}
              >
                <span className="text-gray-400 mr-1.5">-</span>
                {child.name}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

export function StoreCategoryAccordion({
  tree,
  activeId,
  expandedIds,
  onSelect,
  onToggleExpand,
  topVisible = 11,
  className = "",
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const tops = showAll ? tree : tree.slice(0, topVisible);
  const hasMore = tree.length > topVisible;

  return (
    <div className={`store-category-accordion rounded-xl overflow-hidden shadow-sm border border-gray-200 sticky top-20 ${className}`}>
      <div className="bg-[#3d4f5f] text-white px-3 py-2.5 flex items-center gap-2">
        <Menu className="w-4 h-4 shrink-0 opacity-90" />
        <span className="text-sm font-semibold tracking-wide">Kategoriler</span>
      </div>
      <div className="bg-white">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2.5 text-sm font-medium border-b border-gray-100 transition ${
            activeId === null ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          Tümü
        </button>
        {tops.map((top) => (
          <AccordionNode
            key={top.id}
            node={top}
            depth={0}
            activeId={activeId}
            expandedIds={expandedIds}
            onSelect={onSelect}
            onToggleExpand={onToggleExpand}
          />
        ))}
        {hasMore && !showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full text-left px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 border-t border-gray-100 flex items-center justify-between"
          >
            DEVAMI
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
