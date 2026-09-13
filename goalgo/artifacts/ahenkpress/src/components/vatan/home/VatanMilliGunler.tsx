import { useMemo } from "react";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { resolveIstanbulMonthDay, resolveUpcomingNationalDayIndex, VATAN_NATIONAL_DAYS } from "@/lib/hmVatanHomeContent";
import { VATAN_ASSETS } from "@/lib/hmVatanTheme";
import { VatanButton } from "@/components/vatan/ui/VatanButton";
import { VatanSectionHead } from "@/components/vatan/ui/VatanSectionHead";

export function VatanMilliGunler() {
  const h = useHmPublicHref();
  const { upcoming, today } = useMemo(() => {
    const md = resolveIstanbulMonthDay();
    return { upcoming: resolveUpcomingNationalDayIndex(md.month, md.day), today: md };
  }, []);

  return (
    <section className="vatan-section vatan-section--deep vatan-days" aria-labelledby="vatan-s6-title">
      <img className="vatan-days__bg" src={VATAN_ASSETS.milliGunler} alt="" loading="lazy" decoding="async" aria-hidden="true" />
      <div className="vatan-wrap vatan-days__inner">
        <VatanSectionHead
          numeral="04"
          eyebrow="Millî Günler"
          title="Unutmadığımız günler."
          lead="Her yıl aynı günlerde bir araya gelir, şehitlerimizi ve millî günlerimizi anarız."
          id="vatan-s6-title"
        />
        <ol className="vatan-rail" aria-label="Millî günler">
          {VATAN_NATIONAL_DAYS.map((d, i) => {
            const isPast = d.month < today.month || (d.month === today.month && d.day < today.day);
            const isNext = i === upcoming;
            return (
              <li
                key={d.id}
                className={`vatan-rail__node vatan-reveal${isNext ? " is-next" : ""}${isPast && !isNext ? " is-past" : ""}`}
                data-reveal-i={i}
              >
                <span className="vatan-rail__dot" aria-hidden="true" />
                {isNext ? <span className="vatan-rail__flag">Yaklaşan</span> : null}
                <time className="vatan-rail__date" dateTime={`--${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`}>
                  {d.dateLabel}
                </time>
                <span className="vatan-rail__label">{d.title}</span>
              </li>
            );
          })}
        </ol>
        <div className="vatan-actions vatan-reveal" data-reveal-i={7}>
          <VatanButton href={h("/milli-gunler")} variant="outline" arrow>
            Millî Günler
          </VatanButton>
        </div>
      </div>
    </section>
  );
}
