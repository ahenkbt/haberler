type Props = {
  sourceName: string;
  feedUrl?: string | null;
  sourceScope?: "editor" | "portal" | "corporate" | null;
  className?: string;
};

/** RSS detay — turk.eco / kurumsal kaynak künyesi. Editör sitelerinde kaynak linki yok. */
export function RssNewsDisclaimer({ sourceName, feedUrl, sourceScope, className = "" }: Props) {
  const isEditor = sourceScope === "editor";
  // Editör vitrininde kaynak bağlantısı / künye gösterme.
  if (isEditor) return null;
  const isCorporate = sourceScope === "corporate";
  const label = isCorporate ? sourceName : `${sourceName} RSS`;
  const suffix = " kaynağından derlenmiştir.";
  const linkClass = isCorporate
    ? "font-semibold text-slate-600 no-underline hover:underline"
    : "text-inherit no-underline hover:underline";
  const wrapperClass = isCorporate
    ? `mt-8 block border-t border-slate-200 pt-4 text-sm leading-relaxed text-slate-600 ${className}`.trim()
    : `mt-8 block border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-400 ${className}`.trim();

  return (
    <small className={wrapperClass}>
      {feedUrl ? (
        <a href={feedUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {label}
        </a>
      ) : (
        label
      )}
      {suffix}
    </small>
  );
}
