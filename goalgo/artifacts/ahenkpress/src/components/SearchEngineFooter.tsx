import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { SearchEngineLocationPill } from "@/components/SearchEngineLocationPill";

/** Global footer location bar — SearchEnginePublicChrome and self-contained SERP pages. */
export function SearchEngineFooter({ className = "" }: { className?: string }) {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const showLocation = host ? !isDefaultPortalHost(host) : false;

  if (!showLocation) {
    return null;
  }

  return (
    <footer className={`seh-chrome-footer${className ? ` ${className}` : ""}`}>
      <SearchEngineLocationPill />
    </footer>
  );
}
