type Props = {
  sourceName: string;
  feedUrl?: string | null;
  sourceScope?: "editor" | "portal" | "corporate" | null;
  className?: string;
};

/** RSS detay — yekpare.net tam künye; HM editör küçük «Haber Kaynağı»; kurumsal belirgin kaynak. */
export function RssNewsDisclaimer({ sourceName, feedUrl, sourceScope, className = "" }: Props) {
  const isEditor = sourceScope === "editor";
  const isCorporate = sourceScope === "corporate";
  const label = isEditor ? "Haber Kaynağı" : isCorporate ? sourceName : `${sourceName} RSS`;
  const suffix = isEditor
    ? " — Yekpare haber havuzundan derlenmiştir."
    : " kaynağından derlenmiştir.";
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
