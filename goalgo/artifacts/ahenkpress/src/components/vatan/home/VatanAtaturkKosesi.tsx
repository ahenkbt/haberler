import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { ATATURK_QUOTES } from "@/lib/hmAtaturkCorner";
import { VATAN_ATATURK_ROWS } from "@/lib/hmVatanHomeContent";
import { resolveVatanHomeCopyBundle } from "@/lib/hmVatanHomeCopy";
import { VATAN_ASSETS } from "@/lib/hmVatanTheme";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { VatanButton } from "@/components/vatan/ui/VatanButton";
import { VatanHairlineList } from "@/components/vatan/ui/VatanHairlineList";
import { VatanSectionHead } from "@/components/vatan/ui/VatanSectionHead";

export function VatanAtaturkKosesi({
  numeral = "05",
  layoutPrefs,
}: {
  numeral?: string;
  layoutPrefs?: NewsSiteLayoutPrefs;
}) {
  const h = useHmPublicHref();
  const quote = ATATURK_QUOTES[0];
  const copy = resolveVatanHomeCopyBundle(layoutPrefs?.hmVatanHomeCopy, undefined).ataturk;

  return (
    <section className="vatan-section vatan-section--navy vatan-split vatan-split--reverse vatan-ataturk" aria-labelledby="vatan-s7-title">
      <div className="vatan-wrap vatan-split__grid">
        <figure className="vatan-split__media vatan-split__media--bleed vatan-reveal">
          <img
            src={copy?.imageUrl?.trim() || VATAN_ASSETS.ataturk}
            alt={copy?.imageAlt?.trim() || "Alacakaranlıkta sütunlu anıt terası ve Türk bayrağı"}
            loading="lazy"
            decoding="async"
            width={1280}
            height={720}
          />
        </figure>
        <div className="vatan-split__body">
          <VatanSectionHead
            numeral={numeral}
            eyebrow={copy?.eyebrow?.trim() || "Atatürk Köşesi"}
            title={copy?.title?.trim() || "O’nu anmak,"}
            accent={copy?.accent?.trim() || "O’nu anlamak."}
            align="stack"
            id="vatan-s7-title"
          />
          {quote ? (
            <blockquote className="vatan-quote vatan-reveal">
              <p>“{quote.text}”</p>
              <cite>
                Mustafa Kemal Atatürk
                {quote.source ? ` — ${quote.source}` : ""}
                {quote.year ? `, ${quote.year}` : ""}
              </cite>
            </blockquote>
          ) : null}
          <VatanHairlineList
            tone="dark"
            ariaLabel="Atatürk Köşesi sayfaları"
            rows={VATAN_ATATURK_ROWS.map((r) => ({ key: r.href, href: h(r.href), title: r.title }))}
          />
          <div className="vatan-actions vatan-reveal">
            <VatanButton href={h("/ataturk")} variant="outline" arrow>
              Atatürk Köşesi
            </VatanButton>
          </div>
        </div>
      </div>
    </section>
  );
}
