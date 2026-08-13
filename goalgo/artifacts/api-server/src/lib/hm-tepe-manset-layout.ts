function ensureTepeMansetInModuleOrder(order: unknown): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  if (Array.isArray(order)) {
    for (const item of order) {
      const id = String(item ?? "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      next.push(id);
    }
  }
  if (!next.includes("tepeManset")) {
    return ["tepeManset", ...next];
  }
  return ["tepeManset", ...next.filter((id) => id !== "tepeManset")];
}

/** Editör Tepe manşeti kapattıysa onarım onu geri açmaz. */
export function nextTepeMansetLayoutPatch(
  prev: Record<string, unknown>,
): Record<string, unknown> | null {
  if (prev.hmNewsTepeMansetEnabled === false) return null;
  const nextOrder = ensureTepeMansetInModuleOrder(prev.hmNewsHomeModuleOrder);
  const prevOrder = Array.isArray(prev.hmNewsHomeModuleOrder)
    ? (prev.hmNewsHomeModuleOrder as string[]).join(",")
    : "";
  const orderChanged = prevOrder !== nextOrder.join(",");
  const needsEnable = prev.hmNewsTepeMansetEnabled !== true;
  if (!orderChanged && !needsEnable) return null;
  return {
    ...prev,
    hmNewsTepeMansetEnabled: true,
    hmNewsHomeModuleOrder: nextOrder,
  };
}
