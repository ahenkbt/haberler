import { Redirect, useLocation } from "wouter";

/** Eski rota — Yekpare havuzu artık Haberler sekmesinde. */
export default function EditorYekpareHaberleri() {
  const [loc] = useLocation();
  const q = new URLSearchParams((loc.split("?")[1] ?? "").trim());
  const kategori = q.get("kategori") ?? q.get("categorySlug") ?? "";
  const params = new URLSearchParams({ tab: "yekpare" });
  if (kategori) params.set("kategori", kategori);
  return <Redirect to={`/editor/haberler?${params.toString()}`} />;
}
