import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import type { VatanMosaicTile } from "@/lib/hmVatanHomeContent";
import { resolveVatanHomeCopyBundle } from "@/lib/hmVatanHomeCopy";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { VatanSectionHead } from "@/components/vatan/ui/VatanSectionHead";
import { VatanTile } from "@/components/vatan/ui/VatanTile";

export function VatanHafizaMekanlari({
  tiles,
  numeral = "01",
  layoutPrefs,
  siteSlug,
}: {
  tiles: VatanMosaicTile[];
  numeral?: string;
  layoutPrefs?: NewsSiteLayoutPrefs;
  siteSlug?: string;
}) {
  const h = useHmPublicHref();
  const mosaic = resolveVatanHomeCopyBundle(layoutPrefs?.hmVatanHomeCopy, siteSlug).mosaic;
  const isTraffic = tiles.some((t) => /trafik|tgu|proje|calisma/i.test(t.slug + t.href));
  return (
    <section className="vatan-section vatan-section--ivory" id="hafiza-mekanlari" aria-labelledby="vatan-s3-title">
      <div className="vatan-wrap">
        <VatanSectionHead
          numeral={numeral}
          eyebrow={mosaic?.eyebrow?.trim() || (isTraffic ? "Trafik & Yaşam" : "Şehitliklerimiz")}
          title={mosaic?.title?.trim() || (isTraffic ? "Projeler ve çalışmalar." : "Şehitliklerimiz ve kahramanlarımız.")}
          lead={
            mosaic?.lead?.trim() ||
            (isTraffic
              ? "Eğitim, inovasyon ve saha projelerimizle yollarımızı daha güvenli hale getiriyoruz."
              : "Şehitliklerimizi gezin, isimlerini arayın, hatıralarına sahip çıkın.")
          }
          id="vatan-s3-title"
        />
        <div className="vatan-mosaic">
          {tiles.map((tile, i) => (
            <VatanTile
              key={tile.slug}
              href={h(tile.href)}
              title={tile.title}
              kicker={tile.kicker}
              excerpt={tile.size === "xl" ? tile.excerpt : undefined}
              image={tile.image}
              imageAlt={tile.imageAlt}
              size={tile.size}
              eager={i === 0}
              className={`vatan-mosaic__tile vatan-mosaic__tile--${tile.slug.replace(/\//g, "-")}`}
              revealIndex={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
