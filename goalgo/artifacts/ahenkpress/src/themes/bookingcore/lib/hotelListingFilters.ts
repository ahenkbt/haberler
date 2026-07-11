/** Backward-compatible re-exports — prefer `listingFilters.ts` for new code. */
export {
  DEFAULT_LISTING_FILTERS as DEFAULT_HOTEL_FILTERS,
  hotelFiltersFromSearchParams,
  hotelFiltersToApiParams,
  hotelFiltersToSearchParams,
  listingFiltersFromSearchParams,
  listingFiltersToApiParams,
  listingFiltersToSearchParams,
} from "./listingFilters";

export type { ListingFilterState as HotelFilterState } from "../components/BookingCoreFilterSidebar";
