import { useEffect } from "react";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { hmSiteContentShellClass } from "@/lib/hmChromeLayout";
import { VATAN_ASSETS } from "@/lib/hmVatanTheme";
import { VKD_CONTACT_PHONE_DISPLAY, VKD_CONTACT_PHONE_TEL, VKD_DONATION_ACCOUNTS } from "@/lib/vkdPublicContact";
import { VatanIbanAccounts } from "@/components/vatan/ui/VatanIbanAccounts";

export default function HmVatanBagisPage() {
  const ctx = useHmPublicLinkContextOptional();
  const shell = hmSiteContentShellClass(ctx?.layoutPrefs);

  useEffect(() => {
    if (!ctx) return;
    document.title = `Bağış · ${ctx.displayName}`;
  }, [ctx]);

  return (
    <article className="vatan-page">
      <header className="vatan-hero">
        <img
          className="vatan-hero__img"
          src={VATAN_ASSETS.haklar}
          alt="Açık kitap üzerinde altın terazi"
          fetchPriority="high"
          decoding="async"
          width={1280}
          height={720}
        />
        <div className="vatan-hero__shade" />
        <div className={`vatan-hero__inner ${shell}`}>
          <p className="vatan-hero__kicker">Vatan Kahramanları Derneği</p>
          <h1 className="vatan-hero__title">
            Bağış
            <em>Desteğiniz için teşekkür ederiz.</em>
          </h1>
          <p className="vatan-hero__lead">
            Katkınız şehitlerimizin anısına, kıymetli ailelerinin yanında durmaya gider. Aşağıdaki hesaplarımız geçerlidir.
          </p>
        </div>
      </header>

      <section className="vatan-sec">
        <div className={shell}>
          <p className="vatan-sec__kicker">Havale / EFT</p>
          <h2 className="vatan-sec__title">Bağış hesaplarımız</h2>
          <p>Ziraat Bankası ve Vakıfbank üzerinden, alıcı adı Vatan Kahramanları Derneği olarak bağış yapabilirsiniz.</p>
          <VatanIbanAccounts accounts={VKD_DONATION_ACCOUNTS} />
          <p className="vatan-note">
            Sorunuz olursa bizi arayın:{" "}
            <a href={`tel:${VKD_CONTACT_PHONE_TEL}`}>{VKD_CONTACT_PHONE_DISPLAY}</a>
          </p>
        </div>
      </section>
    </article>
  );
}
