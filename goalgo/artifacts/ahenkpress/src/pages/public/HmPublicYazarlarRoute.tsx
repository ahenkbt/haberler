import { HmNestedLayout } from "@/components/HmNestedLayout";
import Yazarlar from "@/pages/public/Yazarlar";

/** `/tr/:slug/yazarlar` — vitrin bağlamında köşe yazarları (Yekpare tam header yok). */
export default function HmPublicYazarlarRoute() {
  return (
    <HmNestedLayout>
      <Yazarlar />
    </HmNestedLayout>
  );
}
