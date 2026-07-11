import { HmNestedLayout } from "@/components/HmNestedLayout";
import YazarPublicYazilari from "@/pages/public/YazarPublicYazilari";

/** `/tr/:slug/yazar/:authorKey` — köşe yazarına ait yayınlanmış yazılar */
export default function HmPublicYazarYazilariRoute() {
  return (
    <HmNestedLayout>
      <YazarPublicYazilari />
    </HmNestedLayout>
  );
}
