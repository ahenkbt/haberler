import type { ReactNode } from "react";

export type EditorialNewsDetailHeaderProps = {
  accent: string;
  title: string;
  categoryName?: string | null;
  /** `badge` = yeşil etiket; `eyebrow` = üst başlık metni (Sade portal). */
  categoryVariant?: "badge" | "eyebrow" | "none";
  dateLabel?: string | null;
  readMin?: number;
  excerpt?: string | null;
  imageSrc?: string | null;
  imageAlt?: string;
  authorSlot?: ReactNode;
  beforeExcerptSlot?: ReactNode;
  afterExcerptSlot?: ReactNode;
};

/** Editör haber sitesi düzeni: kategori → başlık → meta → tam görsel → özet. */
export function EditorialNewsDetailHeader({
  accent,
  title,
  categoryName,
  categoryVariant = "badge",
  dateLabel,
  readMin,
  excerpt,
  imageSrc,
  imageAlt,
  authorSlot,
  beforeExcerptSlot,
  afterExcerptSlot,
}: EditorialNewsDetailHeaderProps) {
  const metaParts: string[] = [];
  if (dateLabel) metaParts.push(dateLabel);
  if (typeof readMin === "number") metaParts.push(`${readMin} dk okuma`);

  return (
    <header className="mb-8 space-y-4 md:space-y-5">
      {categoryName && categoryVariant === "eyebrow" ? (
        <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: accent }}>
          {categoryName}
        </p>
      ) : null}

      <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-900 md:text-[2rem] lg:text-[2.15rem]">
        {title}
      </h1>

      {authorSlot ? <div>{authorSlot}</div> : null}

      {(categoryName && categoryVariant === "badge") || metaParts.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {categoryName && categoryVariant === "badge" ? (
            <span
              className="rounded px-2 py-0.5 text-[10px] font-black uppercase text-white"
              style={{ background: accent }}
            >
              {categoryName}
            </span>
          ) : null}
          {metaParts.map((part) => (
            <span key={part}>{part}</span>
          ))}
        </div>
      ) : null}

      {imageSrc ? (
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
          <img
            src={imageSrc}
            alt={imageAlt ?? title}
            className="mx-auto block h-auto w-full max-h-[min(70vh,560px)] object-contain"
            loading="eager"
          />
        </div>
      ) : null}

      {beforeExcerptSlot}

      {excerpt ? (
        <p
          className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-4 text-base font-medium leading-relaxed text-slate-700 md:text-lg"
          style={{ borderLeftWidth: 4, borderLeftColor: accent }}
        >
          {excerpt}
        </p>
      ) : null}

      {afterExcerptSlot}
    </header>
  );
}
