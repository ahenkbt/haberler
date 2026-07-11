# Sellzy theme port manifest

Authoritative source (Codecanyon archive):

`C:\Users\ahenk\Downloads\codecanyon-62681835-sellzy-multivendor-ecommerce-marketplace-nodejs-script-nextjs-react-mongodb\Main_File\Sellzy_Main_File\apps\web` (authoritative Codecanyon archive)

## Ported components (adapted for Vite + wouter)

| Yekpare file | Sellzy source |
|---|---|
| `SellzyContainer.tsx` | `src/components/common/Container.tsx` |
| `SellzyHeader.tsx` | `src/components/common/header/TopHeader.tsx`, `MiddleHeader.tsx`, `BottomHeader.tsx` |
| `SellzyFooter.tsx` | `src/components/common/footer/Footer.tsx`, `SubscriptionTab.tsx` |
| `SellzyHero.tsx` | `src/components/home/Hero.tsx` |
| `SellzyHomeSections.tsx` | `SupportInfo.tsx`, `ShopByCategory.tsx`, `ProductCard.tsx`, `HomePromoBanners.tsx`, `LatestBlogsClient.tsx`, `OurProductsClient.tsx` |
| `SellzyHomeExtraSections.tsx` | `BestSellingProductsClient.tsx`, `TopSellingProductsClient.tsx`, `FeaturedProductCard.tsx`, `TopSellingHorizontalCard.tsx`, `HotDealsWeekClient.tsx`, `BottomPromoBanners.tsx`, `NewlyLaunchedProductsClient.tsx`, `BeautyProductsClient.tsx` |
| `SellzyProductDetail.tsx` | `product/[slug]/page.tsx`, `ProductGallery.tsx`, `ProductInfo.tsx`, `ProductTabs.tsx`, `ProductReviews.tsx`, `RelatedProducts.tsx`, `Breadcrumb.tsx` |
| `MagazaHakkimizda.tsx` | `(public)/about/page.tsx`, `AboutHero.tsx`, `AboutFeatures.tsx` (simplified) |
| `SellzyMarketplaceLayout.tsx` | `src/app/[locale]/layout.tsx` (Header + Footer shell) |
| `styles/sellzy-theme.css` | `src/app/globals.css` (CSS variables + utility classes) |

## Homepage section order (home-1 parity)

`Magaza.tsx` follows Sellzy `apps/web/src/app/[locale]/page.tsx`:

Hero → SupportInfo → BestSelling → ShopByCategory → TopSelling → OurProducts tabs → HomePromoBanners → NewlyLaunched → HotDealsWeek → Beauty → LatestBlogs → BottomPromoBanners

## Routes (Yekpare)

| Sellzy | Yekpare |
|---|---|
| `/` | `/magaza` |
| `/product/:slug` | `/magaza/urun/:slug` |
| `/shop` | `/magaza/urunler` |
| `/about` | `/magaza/hakkimizda` |
| category/brand/store/blog | `/magaza/kategori/:slug`, `/magaza/marka/:slug`, `/magaza/magaza/:slug`, `/magaza/blog/:slug` |

## Chrome policy

`/magaza/*` uses **Yekpare SadePublicChrome** (site header/footer, Mağaza aktif, Haritalar vb.) with **Sellzy body only** via `SellzyMarketplaceLayout bodyOnly` — no duplicate Sellzy header/footer.

## Assets

Copied to `public/sellzy/` from:

- `apps/web/public/images/`
- `apps/web/src/images/icons/`

## Not yet ported (honest gaps)

- `CartClient.tsx`, `CheckoutClient.tsx` — stub pages only (`MagazaSepet`, `MagazaOdeme`)
- Sellzy `apps/api` payment/order endpoints (Yekpare uses `/api/delivery/marketplace`)
- Admin/vendor Sellzy panels
- `ComparePageClient`, `WishlistClient`, full auth sidebar flows
- Rich-text `ProductTabs` HTML parser (simplified plain-text tab port)
- Live review submission API (read-only + seed reviews on product detail)
- `shop/[...slug]` advanced filters (price, brand, sort parity)
- Pixel-perfect motion (`motion/react` stagger) — uses `framer-motion` subset
- Banner/footer decorative shape PNG pack from archive (inline SVG used where source uses SVG paths)
