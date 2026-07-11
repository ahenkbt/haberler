import { SearchEngineLocationPill } from "@/components/SearchEngineLocationPill";

/** Global footer location bar — SearchEnginePublicChrome and self-contained SERP pages. */
export function SearchEngineFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`seh-chrome-footer${className ? ` ${className}` : ""}`}>
      <SearchEngineLocationPill />
    </footer>
  );
}
