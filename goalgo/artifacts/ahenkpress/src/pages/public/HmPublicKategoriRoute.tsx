import { HmNestedLayout } from "@/components/HmNestedLayout";
import KategoriDetay from "@/pages/public/KategoriDetay";

/** `/tr/:slug/kategori/:catSlug` */
export default function HmPublicKategoriRoute() {
  return (
    <HmNestedLayout>
      <KategoriDetay />
    </HmNestedLayout>
  );
}
