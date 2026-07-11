import { HmNestedLayout } from "@/components/HmNestedLayout";
import DunyadanKisaKisaPage from "@/pages/public/DunyadanKisaKisaPage";

/** `/tr/:slug/kisa-kisa` */
export default function HmPublicKisaKisaRoute() {
  return (
    <HmNestedLayout>
      <DunyadanKisaKisaPage />
    </HmNestedLayout>
  );
}
