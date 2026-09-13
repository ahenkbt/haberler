import { VatanArrow } from "@/components/vatan/ui/VatanButton";
import { VatanLink } from "@/components/vatan/ui/VatanLink";

export function VatanTile({
  href,
  title,
  kicker,
  excerpt,
  image,
  imageAlt,
  size = "sm",
  eager = false,
  className,
  revealIndex,
}: {
  href: string;
  title: string;
  kicker?: string;
  excerpt?: string;
  image: string;
  imageAlt: string;
  size?: "xl" | "sm";
  eager?: boolean;
  className?: string;
  revealIndex?: number;
}) {
  return (
    <VatanLink
      href={href}
      className={`vatan-tile vatan-tile--${size} vatan-reveal${className ? ` ${className}` : ""}`}
      data-reveal-i={revealIndex}
    >
      <img
        className="vatan-tile__img"
        src={image}
        alt={imageAlt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        width={1280}
        height={720}
      />
      <span className="vatan-tile__scrim" aria-hidden="true" />
      <span className="vatan-tile__arrow" aria-hidden="true">
        <VatanArrow />
      </span>
      <span className="vatan-tile__copy">
        {kicker ? <span className="vatan-tile__kicker">{kicker}</span> : null}
        <span className="vatan-tile__title">
          <span className="vatan-tile__title-text">{title}</span>
        </span>
        {excerpt ? <span className="vatan-tile__excerpt">{excerpt}</span> : null}
      </span>
    </VatanLink>
  );
}
