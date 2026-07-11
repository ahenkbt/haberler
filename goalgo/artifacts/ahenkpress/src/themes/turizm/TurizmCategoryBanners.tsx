import type { TurizmCmsBannerRow } from "./turizmCmsTypes";

type Props = {
  banners: TurizmCmsBannerRow[];
};

/** Kategori intro üstünde 1–3 geniş banner (ad count'a göre genişlik) */
export function TurizmCategoryBanners({ banners }: Props) {
  const active = banners.filter((b) => b.image_url).slice(0, 3);
  if (active.length === 0) return null;

  const countClass =
    active.length === 1 ? "bc-cat-banners--1" : active.length === 2 ? "bc-cat-banners--2" : "bc-cat-banners--3";

  return (
    <div className={`bc-cat-banners ${countClass}`}>
      {active.map((b) => {
        const inner = (
          <>
            <img src={b.image_url} alt={b.title || ""} loading="lazy" />
            {b.title ? <span className="bc-cat-banners__label">{b.title}</span> : null}
          </>
        );
        return b.link_url ? (
          <a key={b.id} href={b.link_url} className="bc-cat-banners__item" target="_blank" rel="noopener noreferrer">
            {inner}
          </a>
        ) : (
          <div key={b.id} className="bc-cat-banners__item">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
