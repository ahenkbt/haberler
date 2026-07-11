export type TravllaDestination = {
  id: number;
  title: string;
  slug: string;
  image: string;
  listings: number;
  excerpt?: string;
  detailTitle?: string;
  gallery?: string[];
};

export type TravllaTour = {
  id: number;
  type: string;
  title: string;
  slug: string;
  city: string | null;
  district?: string | null;
  image_url: string | null;
  gallery?: string[];
  price: string;
  sale_price: string | null;
  price_unit: string;
  rating: number;
  review_count: number;
  star_rating?: number | null;
  description?: string | null;
  amenities?: string[];
  duration_days?: number | null;
  duration_nights?: number | null;
  itinerary?: { day: string; title: string; body: string }[];
  reviews?: { author: string; rating: number; text: string; date?: string }[];
  href?: string | null;
};

export type TravllaBookingForm = {
  name: string;
  phone: string;
  email: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  notes: string;
};
