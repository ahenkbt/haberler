import { SixAmMartTransportPage } from "@/themes/sixammart/SixAmMartTheme";
import { useParams } from "wouter";

export default function Ulasim() {
  const params = useParams<{ serviceSlug?: string }>();
  return <SixAmMartTransportPage serviceSlug={params.serviceSlug} />;
}
