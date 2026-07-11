"""Apply newsmap in-map overlay navigation fixes to ahenkpress sources."""
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def git_blob(relpath: str) -> str:
    return subprocess.check_output(["git", "show", f"HEAD:{relpath}"], text=True, encoding="utf-8")


def write_utf8(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8", newline="\n")


def patch_sidebar(src: str) -> str:
    src = src.replace(
        "  onHeadlineClick?: (headline: HmMapCityHeadline) => void;\n  onClose?: () => void;",
        "  onHeadlineClick?: (headline: HmMapCityHeadline) => void;\n"
        "  /** Haber haritası — RSS haberler site içi URL'ye gitmez, overlay açılır. */\n"
        "  inMapOverlayMode?: boolean;\n"
        "  onClose?: () => void;",
        1,
    )
    src = src.replace(
        "  onHeadlineClick,\n  onClose,\n}: NewsmapSidebarPanelProps)",
        "  onHeadlineClick,\n  inMapOverlayMode = false,\n  onClose,\n}: NewsmapSidebarPanelProps)",
        1,
    )
    old = """              return (
                <li key={`${row.kind}-${row.city}-${row.href}`}>
                  {onHeadlineClick ? (
                    <button
                      type="button"
                      className="flex w-full items-start gap-2.5 rounded-2xl border border-white/80 bg-white/90 p-2.5 text-left shadow-sm transition hover:border-rose-100 hover:bg-white hover:shadow-md"
                      title={formatHmMapCityHeadlineLabel(row)}
                      onClick={() => onHeadlineClick(row)}
                    >
                      {itemBody}
                    </button>
                  ) : (
                    <a"""
    new = """              const useInMapActivate = inMapOverlayMode && Boolean(onHeadlineClick);
              return (
                <li key={`${row.kind}-${row.city}-${row.href}`}>
                  {useInMapActivate || onHeadlineClick ? (
                    <button
                      type="button"
                      className="flex w-full items-start gap-2.5 rounded-2xl border border-white/80 bg-white/90 p-2.5 text-left shadow-sm transition hover:border-rose-100 hover:bg-white hover:shadow-md"
                      title={formatHmMapCityHeadlineLabel(row)}
                      onClick={(ev) => {
                        ev.preventDefault();
                        onHeadlineClick?.(row);
                      }}
                    >
                      {itemBody}
                    </button>
                  ) : (
                    <a"""
    if old not in src:
        raise SystemExit("NewsmapSidebarPanel block missing")
    return src.replace(old, new, 1)


def patch_bottom_panel(src: str) -> str:
    src = src.replace(
        "  onHeadlineClick?: (headline: HmMapCityHeadline) => void;\n  onClearCity?: () => void;",
        "  onHeadlineClick?: (headline: HmMapCityHeadline) => void;\n"
        "  /** Haber haritası — RSS haberler site içi URL'ye gitmez, overlay açılır. */\n"
        "  inMapOverlayMode?: boolean;\n"
        "  onClearCity?: () => void;",
        1,
    )
    src = src.replace(
        "  onHeadlineClick,\n  onClearCity,\n}: HmMapCityNewsPanelProps)",
        "  onHeadlineClick,\n  inMapOverlayMode = false,\n  onClearCity,\n}: HmMapCityNewsPanelProps)",
        1,
    )
    old = """              if (onHeadlineClick) {
                return (
                  <button
                    key={`${row.kind}-${row.city}-${row.href}`}
                    type="button"
                    role="listitem"
                    className={cardClass}
                    title={formatHmMapCityHeadlineLabel(row)}
                    onClick={() => onHeadlineClick(row)}
                  >
                    {cardBody}
                  </button>
                );
              }"""
    new = """              const useInMapActivate = inMapOverlayMode && Boolean(onHeadlineClick);
              if (useInMapActivate || onHeadlineClick) {
                return (
                  <button
                    key={`${row.kind}-${row.city}-${row.href}`}
                    type="button"
                    role="listitem"
                    className={cardClass}
                    title={formatHmMapCityHeadlineLabel(row)}
                    onClick={(ev) => {
                      ev.preventDefault();
                      onHeadlineClick?.(row);
                    }}
                  >
                    {cardBody}
                  </button>
                );
              }"""
    if old not in src:
        raise SystemExit("HmMapCityNewsPanel block missing")
    return src.replace(old, new, 1)


def patch_ticker(src: str) -> str:
    src = src.replace(
        "  onHeadlineClick?: (headline: HmMapCityHeadline) => void;\n};",
        "  onHeadlineClick?: (headline: HmMapCityHeadline) => void;\n"
        "  /** Haber haritası — RSS haberler site içi URL'ye gitmez, overlay açılır. */\n"
        "  inMapOverlayMode?: boolean;\n};",
        1,
    )
    src = src.replace(
        "  onHeadlineClick,\n}: HaberHaritasiSonDakikaTickerProps)",
        "  onHeadlineClick,\n  inMapOverlayMode = false,\n}: HaberHaritasiSonDakikaTickerProps)",
        1,
    )
    old = """              if (onHeadlineClick) {
                return (
                  <button
                    key={`${row.city}-${row.href}-${idx}`}
                    type="button"
                    className={itemClass}
                    title={formatHmMapCityHeadlineLabel(row)}
                    onClick={() => onHeadlineClick(row)}
                  >
                    {inner}
                  </button>
                );
              }"""
    new = """              const useInMapActivate = inMapOverlayMode && Boolean(onHeadlineClick);
              if (useInMapActivate || onHeadlineClick) {
                return (
                  <button
                    key={`${row.city}-${row.href}-${idx}`}
                    type="button"
                    className={itemClass}
                    title={formatHmMapCityHeadlineLabel(row)}
                    onClick={(ev) => {
                      ev.preventDefault();
                      onHeadlineClick?.(row);
                    }}
                  >
                    {inner}
                  </button>
                );
              }"""
    if old not in src:
        raise SystemExit("SonDakikaTicker block missing")
    return src.replace(old, new, 1)


def patch_kesfet(src: str) -> str:
    block_old = """  const handleNewsReadMore = useCallback((headline: HmMapCityHeadline) => {
    registerNewsmapVideoIfNeeded(headline);
    expandNewsPreview(headline);
  }, [expandNewsPreview, registerNewsmapVideoIfNeeded]);

  useEffect(() => {"""
    block_new = """  const handleNewsReadMore = useCallback((headline: HmMapCityHeadline) => {
    registerNewsmapVideoIfNeeded(headline);
    expandNewsPreview(headline);
  }, [expandNewsPreview, registerNewsmapVideoIfNeeded]);

  const handleNewsmapHeadlineActivate = useCallback((headline: HmMapCityHeadline) => {
    registerNewsmapVideoIfNeeded(headline);
    openNewsOverlay(headline);
  }, [openNewsOverlay, registerNewsmapVideoIfNeeded]);

  useEffect(() => {"""
    if block_old not in src:
        raise SystemExit("Kesfet handleNewsReadMore block missing")
    src = src.replace(block_old, block_new, 1)
    src = src.replace(
        'marker.on("click", () => openNewsPreviewRef.current(headline));',
        'marker.on("click", () => openNewsOverlayRef.current(headline));',
        1,
    )
    src = src.replace(
        "onHeadlineClick={openNewsPreview}\n                    onClose={closeLeftResultsPanel}",
        "onHeadlineClick={isNewsmapPage ? handleNewsmapHeadlineActivate : openNewsPreview}\n"
        "                    inMapOverlayMode={isNewsmapPage}\n"
        "                    onClose={closeLeftResultsPanel}",
        1,
    )
    repl = "onHeadlineClick={handleNewsmapHeadlineActivate}\n              inMapOverlayMode"
    needle = "onHeadlineClick={openNewsPreview}"
    count = 0
    pos = 0
    parts: list[str] = []
    while True:
        idx = src.find(needle, pos)
        if idx < 0:
            parts.append(src[pos:])
            break
        ctx = src[max(0, idx - 500): idx + 120]
        if any(k in ctx for k in ("newsmapDisplayHeadlines", "newsmapPanelHeadlines", "haber-haritasi-newsmap-bottom-panel")):
            parts.append(src[pos:idx])
            parts.append(repl)
            count += 1
            pos = idx + len(needle)
        else:
            parts.append(src[pos : idx + len(needle)])
            pos = idx + len(needle)
    if count != 4:
        raise SystemExit(f"expected 4 newsmap headline handlers, got {count}")
    return "".join(parts)


def main() -> None:
    repo = ROOT.parents[2]
    rel = "goalgo/artifacts/ahenkpress/src"
    write_utf8(ROOT / "src/components/NewsmapSidebarPanel.tsx", patch_sidebar(git_blob(f"{rel}/components/NewsmapSidebarPanel.tsx")))
    write_utf8(ROOT / "src/components/HmMapCityNewsPanel.tsx", patch_bottom_panel(git_blob(f"{rel}/components/HmMapCityNewsPanel.tsx")))
    write_utf8(ROOT / "src/components/HaberHaritasiSonDakikaTicker.tsx", patch_ticker(git_blob(f"{rel}/components/HaberHaritasiSonDakikaTicker.tsx")))
    write_utf8(ROOT / "src/pages/public/Kesfet.tsx", patch_kesfet(git_blob(f"{rel}/pages/public/Kesfet.tsx")))
    print("patched newsmap overlay navigation")


if __name__ == "__main__":
    main()
