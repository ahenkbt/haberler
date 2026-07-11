import { useMemo, useState } from "react";
import { Languages } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSiteTranslate, useSiteTranslateLanguageLabel } from "@/contexts/SiteTranslateContext";
import { SITE_PAGE_LANGUAGE, type SiteTranslateLangCode } from "@/lib/siteTranslateLocales";
import { cn } from "@/lib/utils";

type SiteTranslateControlProps = {
  /** SearchEngineHeader dairesel düğme stili. */
  variant?: "seh" | "hm";
  className?: string;
};

export function SiteTranslateControl({ variant = "seh", className }: SiteTranslateControlProps) {
  const { activeLang, applying, applyLanguage, languages, suggestion, isTranslated } = useSiteTranslate();
  const [open, setOpen] = useState(false);
  const activeLabel = useSiteTranslateLanguageLabel(activeLang);

  const sortedLanguages = useMemo(() => {
    const suggested = suggestion?.targetLang;
    const rest = languages.filter((l) => l.code !== suggested);
    if (!suggested) return languages;
    const hit = languages.find((l) => l.code === suggested);
    return hit ? [hit, ...rest.filter((l) => l.code !== hit.code)] : languages;
  }, [languages, suggestion?.targetLang]);

  const onPick = (code: SiteTranslateLangCode) => {
    setOpen(false);
    void applyLanguage(code === SITE_PAGE_LANGUAGE ? null : code);
  };

  const triggerClass =
    variant === "hm"
      ? "site-translate-control site-translate-control--hm"
      : "site-translate-control seh-circle-btn";

  const ariaLabel = isTranslated ? `Çeviri: ${activeLabel}` : "Sayfayı çevir";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(triggerClass, className)}
          aria-label={ariaLabel}
          aria-expanded={open}
          title={ariaLabel}
          disabled={applying}
        >
          <Languages className="h-5 w-5 shrink-0" aria-hidden />
          {variant === "hm" ? (
            <span className="site-translate-control__label">{isTranslated ? activeLabel : "Çevir"}</span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="site-translate-popover w-56 p-0"
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
      >
        <div className="site-translate-popover__head">
          <p className="site-translate-popover__title">Sayfa çevirisi</p>
          {suggestion && !isTranslated ? (
            <p className="site-translate-popover__hint">
              Öneri: {suggestion.labelTr}
            </p>
          ) : null}
        </div>
        <ul className="site-translate-popover__list" role="listbox" aria-label="Hedef dil">
          {sortedLanguages.map((lang) => {
            const selected = lang.code === activeLang || (lang.code === SITE_PAGE_LANGUAGE && !isTranslated);
            const suggested = suggestion?.targetLang === lang.code;
            return (
              <li key={lang.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "site-translate-popover__item",
                    selected && "site-translate-popover__item--active",
                    suggested && "site-translate-popover__item--suggested",
                  )}
                  onClick={() => onPick(lang.code)}
                >
                  <span className="site-translate-popover__native">{lang.nativeLabel}</span>
                  <span className="site-translate-popover__tr">{lang.labelTr}</span>
                  {suggested ? <span className="site-translate-popover__badge">Öneri</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
        {isTranslated ? (
          <div className="site-translate-popover__foot">
            <button type="button" className="site-translate-popover__reset" onClick={() => onPick(SITE_PAGE_LANGUAGE)}>
              Orijinal dile dön (Türkçe)
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
