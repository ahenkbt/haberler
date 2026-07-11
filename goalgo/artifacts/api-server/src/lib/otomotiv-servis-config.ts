export {
  OTOMOTIV_SERVICE_GROUPS,
  OTOMOTIV_SERVICE_CATEGORY_ROWS,
  OTOMOTIV_SERVICE_STORE_TYPES,
  OTOMOTIV_SERVICE_STORE_TYPE_ALIASES,
  OTOMOTIV_SERVICE_POPULAR_SEARCH_LABELS,
  normalizeOtomotivServisStoreType,
  findOtomotivServiceCategoryBySlug,
  searchOtomotivServiceCategories,
  type OtomotivServiceCategorySeed,
  type OtomotivServiceGroupSeed,
} from "../data/otomotiv-service-categories-data.js";

import { OTOMOTIV_SERVICE_STORE_TYPES } from "../data/otomotiv-service-categories-data.js";

/** Genel servis türleri + uzmanlık alt tipleri */
export const OTOMOTIV_SERVIS_MAP_STORE_TYPES = [
  "hizmet_tamir",
  "otomotiv_servis",
  ...OTOMOTIV_SERVICE_STORE_TYPES,
];

/** @deprecated OTOMOTIV_SERVICE_STORE_TYPES kullanın */
export { OTOMOTIV_SERVICE_STORE_TYPES as OTOMOTIV_SERVIS_STORE_TYPES };

/** @deprecated OTOMOTIV_SERVICE_STORE_TYPE_ALIASES kullanın */
export { OTOMOTIV_SERVICE_STORE_TYPE_ALIASES as OTOMOTIV_SERVIS_STORE_TYPE_ALIASES } from "../data/otomotiv-service-categories-data.js";
