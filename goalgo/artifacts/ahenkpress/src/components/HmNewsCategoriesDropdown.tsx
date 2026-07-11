import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { LayoutGrid } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { HmNewsCategoriesGridPanel } from "@/components/HmNewsCategoriesGridPanel";
import type { HmNewsCategoryMenuItem } from "@/lib/hmNewsCategoryMenu";
import "@/styles/hmNewsCategoriesMenu.css";

type HmNewsCategoriesDropdownProps = {
  items: HmNewsCategoryMenuItem[];
  triggerStyle: CSSProperties;
  accent?: string;
  /** Mobil sheet; masaüstünde portal popover. */
  mobile?: boolean;
};

export function HmNewsCategoriesDropdown({
  items,
  triggerStyle,
  accent = "#e61e25",
  mobile = false,
}: HmNewsCategoriesDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  useLayoutEffect(() => {
    if (mobile || !open || !triggerRef.current) {
      setPanelPos(null);
      return;
    }
    const sync = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const panelWidth = Math.min(352, Math.max(280, window.innerWidth - 24));
      const left = Math.min(Math.max(12, r.left), window.innerWidth - panelWidth - 12);
      setPanelPos({ top: r.bottom + 8, left, minWidth: panelWidth });
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [mobile, open]);

  useEffect(() => {
    if (!open || mobile) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [mobile, open]);

  if (!items.length) return null;

  const close = () => setOpen(false);
  const panel = (
    <HmNewsCategoriesGridPanel items={items} onClose={close} titleId="hm-news-categories-menu-title" />
  );

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={`hm-news-nav-dropdown-trigger hm-news-cat-menu-trigger hm-news-cat-menu-trigger--icon-only my-1 mr-1 shrink-0 rounded-md transition-colors duration-150${
        open ? " hm-news-nav-dropdown-trigger--open" : ""
      }`}
      style={triggerStyle}
      aria-expanded={open}
      aria-haspopup="true"
      aria-controls="hm-news-categories-menu"
      aria-label="Kategoriler menüsü"
      title="Kategoriler"
      onClick={() => setOpen((v) => !v)}
    >
      <span className="hm-news-cat-menu-icon" aria-hidden>
        <LayoutGrid className="h-[1.1rem] w-[1.1rem]" strokeWidth={2.25} />
      </span>
    </button>
  );

  if (mobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            id="hm-news-categories-menu"
            side="bottom"
            overlayClassName="hm-news-cat-menu-overlay"
            className="hm-news-cat-menu-sheet hm-news-cat-menu-sheet--bottom hm-news-cat-menu-popup border-0 p-3 pb-[calc(0.85rem+env(safe-area-inset-bottom,0px))]"
            style={{ ["--hm-cat-menu-accent" as string]: accent }}
          >
            <SheetTitle className="sr-only">Kategoriler</SheetTitle>
            {panel}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  const desktopPanel =
    open && panelPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id="hm-news-categories-menu"
            className="hm-news-cat-menu-popup bg-white text-slate-900"
            role="menu"
            style={{
              position: "fixed",
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.minWidth,
              zIndex: 10060,
              ["--hm-cat-menu-accent" as string]: accent,
            }}
          >
            {panel}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`hm-news-nav-dropdown${open ? " hm-news-nav-dropdown--open" : ""}`}>
      {trigger}
      {desktopPanel}
    </div>
  );
}
