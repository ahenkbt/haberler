import { useState } from "react";
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
  image?: string;
  imageAlt?: string;
  size?: "xl" | "sm";
  eager?: boolean;
  className?: string;
  revealIndex?: number;
}) {
  const src = String(image ?? "").trim();
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = Boolean(src) && !imgFailed;

  return (
    <VatanLink
      href={href}
      className={`vatan-tile vatan-tile--${size}${showImg ? "" : " vatan-tile--no-img"} vatan-reveal${className ? ` ${className}` : ""}`}
      data-reveal-i={revealIndex}
    >
      {showImg ? (
        <img
          className="vatan-tile__img"
          src={src}
          alt={imageAlt || title}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          width={1280}
          height={720}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="vatan-tile__fallback" aria-hidden="true" />
      )}
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
