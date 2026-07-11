/** Otomotiv admin — paylaşılan tipler */

export type OtomotivBusinessType =
  | "galeri"
  | "yedek_parca"
  | "cikma"
  | "servis"
  | "yikama"
  | "lastik"
  | "genel";

export interface OtomotivBusiness {
  id: number;
  vendor_id: number | null;
  map_business_id: string | null;
  name: string;
  slug: string;
  business_type: OtomotivBusinessType;
  servis_category_slug?: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  image_url: string | null;
  description: string | null;
  subscription_tier: string;
  status: string;
  google_place_id: string | null;
  working_hours_json: Record<string, unknown> | null;
  cargo_settings_json: Record<string, unknown> | null;
  is_featured: boolean;
  listing_count: number;
  created_at: string;
}

export interface VehicleBrand {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  logo_url: string | null;
  vehicle_class: string;
  sort_order: number;
  is_active: boolean;
}

export interface VehicleModel {
  id: number;
  brand_id: number;
  name: string;
  slug: string;
  year_from: number | null;
  year_to: number | null;
  vehicle_class: string;
  brand_name?: string;
  is_active: boolean;
}

export interface OtomotivListing {
  id: number;
  business_id: number;
  listing_kind: "vehicle" | "part" | "service_package" | "tire";
  title: string;
  slug: string;
  brand_id: number | null;
  model_id: number | null;
  year: number | null;
  km: number | null;
  fuel: string | null;
  transmission: string | null;
  price: string | null;
  stock: number | null;
  sku: string | null;
  status: string;
  is_featured: boolean;
  is_zero_km: boolean;
  business_name?: string;
  business_type?: string;
  brand_name?: string;
  model_name?: string;
}

export interface OtomotivService {
  id: number;
  business_id: number;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  price: string | null;
  service_category: string | null;
  is_active: boolean;
  business_name?: string;
  business_type?: string;
}

export interface OtomotivAppointmentSlot {
  id: number;
  business_id: number;
  service_id: number | null;
  slot_date: string;
  slot_time: string;
  capacity: number;
  booked_count: number;
  is_available: boolean;
}

export interface MapImportCandidate {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  district: string | null;
  phone: string | null;
  google_place_id: string | null;
  store_type: string | null;
  category_slug: string | null;
}
