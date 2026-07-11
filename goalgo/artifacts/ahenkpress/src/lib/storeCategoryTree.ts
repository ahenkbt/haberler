import type { StoreCategoryNode } from "@/components/StoreCategoryAccordion";

export function findCategoryNode(tree: StoreCategoryNode[], id: number): StoreCategoryNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findCategoryNode(node.children, id);
    if (found) return found;
  }
  return null;
}

export function collectSubtreeIds(node: StoreCategoryNode): number[] {
  return [node.id, ...node.children.flatMap(collectSubtreeIds)];
}

/** Mağazada ürünü olan kategorileri ve üstlerini tut */
export function pruneCategoryTree(
  tree: StoreCategoryNode[],
  productCategoryIds: Set<number>,
): StoreCategoryNode[] {
  const out: StoreCategoryNode[] = [];
  for (const node of tree) {
    const children = pruneCategoryTree(node.children, productCategoryIds);
    if (productCategoryIds.has(node.id) || children.length > 0) {
      out.push({ ...node, children });
    }
  }
  return out;
}

export function normalizeStoreProduct(raw: Record<string, unknown>) {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    price: String(raw.price ?? "0"),
    salePrice: raw.salePrice != null || raw.sale_price != null
      ? String(raw.salePrice ?? raw.sale_price)
      : null,
    imageUrl: String(raw.imageUrl ?? raw.image_url ?? ""),
    menuCategoryId: Number(raw.menuCategoryId ?? raw.menu_category_id ?? 0),
    ecommerceCategoryId:
      raw.ecommerceCategoryId != null || raw.ecommerce_category_id != null
        ? Number(raw.ecommerceCategoryId ?? raw.ecommerce_category_id)
        : null,
    isPopular: Boolean(raw.isPopular ?? raw.is_popular),
    isVegan: Boolean(raw.isVegan ?? raw.is_vegan),
    isGlutenFree: Boolean(raw.isGlutenFree ?? raw.is_gluten_free),
  };
}
