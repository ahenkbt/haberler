export type SellzyProduct = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  salePrice?: number | null;
  discountPercent?: number;
  imageUrl?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  href: string;
  vendorName?: string;
  slug?: string;
};

export type SellzyCategory = {
  id: number;
  name: string;
  slug?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  children?: SellzyCategory[];
};

export type SellzyBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  name?: string | null;
  description?: string | null;
  ctaLabel?: string;
  buttonTitle?: string;
  href: string;
  buttonHref?: string;
  imageUrl?: string | null;
  bgColor?: string;
  textColor?: string;
  discount?: string;
  tone?: "green" | "emerald" | "yellow" | "pink";
};

export type SellzyBrand = {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  href: string;
};

export type SellzyBlogPost = {
  id: number;
  title: string;
  excerpt: string;
  href: string;
  slug?: string;
  imageUrl?: string | null;
  publishedAt?: string | null;
  categoryName?: string | null;
};

export type SellzyPromoBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  name?: string | null;
  description?: string | null;
  href: string;
  buttonHref?: string;
  buttonTitle?: string;
  imageUrl?: string | null;
  bgColor?: string;
  layout?: "wide" | "split" | "row";
};

export type MarketplacePayload = {
  vendors: Array<{ id: number; name: string; slug: string; imageUrl?: string | null; storefrontHref?: string }>;
  categories: SellzyCategory[];
  products: SellzyProduct[];
  featuredProducts: SellzyProduct[];
  bestSelling: SellzyProduct[];
  topSelling?: SellzyProduct[];
  newest: SellzyProduct[];
  dailyDeals?: SellzyProduct[];
  highDiscountProducts?: SellzyProduct[];
  campaigns?: unknown[];
  heroBanners?: SellzyBanner[];
  promoBanners?: SellzyPromoBanner[];
  bottomPromoBanners?: SellzyPromoBanner[];
  brands?: SellzyBrand[];
  blogPosts?: SellzyBlogPost[];
  stats: { vendorCount: number; productCount: number; categoryCount: number; campaignCount?: number };
};

export const emptyMarketplacePayload: MarketplacePayload = {
  vendors: [],
  categories: [],
  products: [],
  featuredProducts: [],
  bestSelling: [],
  newest: [],
  stats: { vendorCount: 0, productCount: 0, categoryCount: 0 },
};
