import { useCallback, useEffect, useState } from "react";
import { loadModuleFlags, type YektubeModuleFlags } from "@/lib/moduleFlags";

export function useYektubeModules(): YektubeModuleFlags {
  const [flags, setFlags] = useState<YektubeModuleFlags>(() => loadModuleFlags());

  const refresh = useCallback(() => {
    setFlags(loadModuleFlags());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "yektube-v2-module-flags") refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("yektube-modules-updated", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("yektube-modules-updated", refresh);
    };
  }, [refresh]);

  return flags;
}
