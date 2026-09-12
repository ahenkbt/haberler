import { useParams } from "wouter";
import { HmNestedLayout } from "@/components/HmNestedLayout";
import { HmArticleDetailErrorBoundary } from "@/components/HmArticleDetailErrorBoundary";
import HaberDetay from "@/pages/public/HaberDetay";

/** `/tr/:slug/haber/:id` — vitrin bağlamında haber detayı. */
export default function HmPublicHaberDetayRoute() {
  const params = useParams<{ id?: string }>();
  const articleSlug = String(params.id ?? "").trim();
  return (
    <HmNestedLayout>
      <HmArticleDetailErrorBoundary slug={articleSlug}>
        <HaberDetay />
      </HmArticleDetailErrorBoundary>
    </HmNestedLayout>
  );
}
