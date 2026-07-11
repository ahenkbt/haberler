/** Portal “blog” yazıları: kategori slug veya adı `blog` (büyük/küçük harf duyarsız). */
export function isBlogCategoryNews(n: { categorySlug?: string | null; categoryName?: string | null }): boolean {
  const slug = String(n.categorySlug ?? "").trim().toLowerCase();
  const name = String(n.categoryName ?? "").trim().toLowerCase();
  return slug === "blog" || name === "blog";
}
