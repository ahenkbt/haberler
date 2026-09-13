import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { VATAN_MOSAIC_TILES } from "@/lib/hmVatanHomeContent";
import { VatanSectionHead } from "@/components/vatan/ui/VatanSectionHead";
import { VatanTile } from "@/components/vatan/ui/VatanTile";

export function VatanHafizaMekanlari() {
  const h = useHmPublicHref();
  return (
    <section className="vatan-section vatan-section--ivory" id="hafiza-mekanlari" aria-labelledby="vatan-s3-title">
      <div className="vatan-wrap">
        <VatanSectionHead
          numeral="01"
          eyebrow="Şehitliklerimiz"
          title="Şehitliklerimiz ve kahramanlarımız."
          lead="Şehitliklerimizi gezin, isimlerini arayın, hatıralarına sahip çıkın."
          id="vatan-s3-title"
        />
        <div className="vatan-mosaic">
          {VATAN_MOSAIC_TILES.map((tile, i) => (
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
              className={`vatan-mosaic__tile vatan-mosaic__tile--${tile.slug}`}
              revealIndex={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
