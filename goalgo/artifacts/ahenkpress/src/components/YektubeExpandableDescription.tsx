import { useState } from "react";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";

const SUMMARY_CHARS = 160;

export function YektubeExpandableDescription({
  text,
  className = "",
  emptyLabel = "Açıklama yok.",
}: {
  text?: string | null;
  className?: string;
  emptyLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const raw = decodeHtmlEntities((text ?? "").trim());
  if (!raw) {
    return <p className={`text-sm text-zinc-500 ${className}`.trim()}>{emptyLabel}</p>;
  }
  const needsToggle = raw.length > SUMMARY_CHARS;
  const shown = expanded || !needsToggle ? raw : `${raw.slice(0, SUMMARY_CHARS).trim()}…`;

  return (
    <p className={`text-sm text-zinc-600 leading-relaxed whitespace-pre-line ${className}`.trim()}>
      {shown}
      {needsToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="ml-1 font-bold text-zinc-800 hover:text-[#039D55]"
        >
          {expanded ? "daha az" : "daha fazla"}
        </button>
      ) : null}
    </p>
  );
}
