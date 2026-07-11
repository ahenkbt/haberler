import { useEffect, useState } from "react";
import { readEditorPageFlags, type EditorPageFlags } from "@/lib/editorPageFlags";

export function useEditorPageFlagsSync(): EditorPageFlags {
  const [flags, setFlags] = useState<EditorPageFlags>(() => readEditorPageFlags());

  useEffect(() => {
    const sync = () => setFlags(readEditorPageFlags());
    window.addEventListener("storage", sync);
    window.addEventListener("yekpare-editor-flags", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("yekpare-editor-flags", sync);
    };
  }, []);

  return flags;
}
