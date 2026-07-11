import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

export type KesfetHeroSuggestItem = {
  id: string;
  label: string;
  hint?: string;
  icon?: string;
};

export function KesfetHeroSuggestDropdown({
  open,
  anchorRef,
  items,
  activeIndex,
  listId,
  className = "kesfet-hero-suggest-panel",
  itemClassName = "kesfet-hero-suggest-item",
  onSelect,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  items: KesfetHeroSuggestItem[];
  activeIndex: number;
  listId: string;
  className?: string;
  itemClassName?: string;
  onSelect: (item: KesfetHeroSuggestItem) => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setRect(null);
      return;
    }
    const update = () => {
      if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, open, items.length]);

  useEffect(() => {
    if (!open || activeIndex < 0 || !listId) return;
    const el = document.getElementById(`${listId}-item-${activeIndex}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId, open]);

  if (!open || items.length === 0 || !rect || typeof document === "undefined") return null;

  return createPortal(
    <div
      id={listId}
      role="listbox"
      className={className}
      style={{
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 10060,
        maxHeight: "14rem",
        overflow: "auto",
        borderRadius: "10px",
        border: "1px solid #e2e8f0",
        background: "#fff",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
      }}
    >
      {items.map((item, idx) => (
        <button
          key={item.id}
          id={`${listId}-item-${idx}`}
          type="button"
          role="option"
          aria-selected={idx === activeIndex}
          className={`${itemClassName}${idx === activeIndex ? " active" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
        >
          {item.icon ? <span aria-hidden>{item.icon}</span> : null}
          <span className="min-w-0 flex-1">
            <span className="block truncate">{item.label}</span>
            {item.hint ? (
              <span className="block truncate text-[0.72rem] font-medium text-slate-400">{item.hint}</span>
            ) : null}
          </span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
