import SaticiDetay from "@/pages/public/SaticiDetay";
import EcomSatici from "@/pages/public/EcomSatici";

type Props = {
  slug: string;
  storefrontPath: string;
};

/** Özel mağaza alanında kök (`/`) — portal chrome olmadan vitrin. */
export function VendorDomainStorefront({ slug, storefrontPath }: Props) {
  const base = String(storefrontPath ?? "").trim();
  if (!slug || !base.startsWith("/")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-slate-600">
        Mağaza yükleniyor…
      </div>
    );
  }

  if (base.startsWith("/siparis/")) {
    return <SaticiDetay slugOverride={slug} />;
  }
  if (base.startsWith("/alisveris/")) {
    return <EcomSatici slugOverride={slug} />;
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-slate-600">
      Mağaza yükleniyor…
    </div>
  );
}
