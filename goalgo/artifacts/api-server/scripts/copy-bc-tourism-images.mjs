/**
 * Booking Core v4 demo görsellerini ahenkpress public/assets/turizm-bc altına kopyalar.
 * Kaynak: turizm-ulaşım/Booking Core v4.0.2/public_html/uploads/demo (vendor ağacı commit edilmez).
 * Çıktı: artifacts/ahenkpress/public/assets/turizm-bc → canlı /assets/turizm-bc/…
 */
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../../../..");
const bcDemo = path.join(workspaceRoot, "turizm-ulaşım", "Booking Core v4.0.2", "public_html", "uploads", "demo");
const outRoot = path.resolve(__dirname, "../../ahenkpress/public/assets/turizm-bc");

/** targetModule → { srcSubdir, file } */
const COPIES = [
  // hotel (BC otel seed görselleri space-* ve hotel-gallery kullanır)
  ["hotel", "hotel", "hotel-featured-1.jpg"],
  ["hotel", "hotel", "hotel-featured-2.jpg"],
  ["hotel", "hotel", "hotel-featured-3.jpg"],
  ["hotel", "hotel", "hotel-featured-4.jpg"],
  ["hotel", "hotel", "gallery/hotel-gallery-1.jpg"],
  ["hotel", "hotel", "gallery/hotel-gallery-2.jpg"],
  ["hotel", "hotel", "gallery/hotel-gallery-3.jpg"],
  ["hotel", "hotel", "gallery/hotel-gallery-4.jpg"],
  ["hotel", "hotel", "gallery/hotel-gallery-5.jpg"],
  ["hotel", "hotel", "gallery/hotel-gallery-6.jpg"],
  ["hotel", "space", "space-5.jpg"],
  ["hotel", "space", "space-6.jpg"],
  ["hotel", "space", "space-7.jpg"],
  ["hotel", "space", "space-8.jpg"],
  ["hotel", "space", "space-9.jpg"],
  // villa / space
  ["space", "space", "space-1.jpg"],
  ["space", "space", "space-2.jpg"],
  ["space", "space", "space-3.jpg"],
  ["space", "space", "space-4.jpg"],
  ["space", "space", "space-5.jpg"],
  ["space", "space", "space-6.jpg"],
  ["space", "space", "gallery/space-gallery-1.jpg"],
  ["space", "space", "gallery/space-gallery-2.jpg"],
  ["space", "space", "gallery/space-gallery-3.jpg"],
  ["space", "space", "gallery/space-gallery-4.jpg"],
  ["space", "space", "gallery/space-gallery-5.jpg"],
  ["space", "space", "gallery/space-gallery-6.jpg"],
  ["space", "space", "gallery/space-gallery-7.jpg"],
  ["space", "space", "space-single-1.jpg"],
  ["space", "space", "space-single-2.jpg"],
  ["space", "space", "space-single-3.jpg"],
  // car
  ["car", "car", "car-1.jpg"],
  ["car", "car", "car-2.jpg"],
  ["car", "car", "car-3.jpg"],
  ["car", "car", "car-4.jpg"],
  ["car", "car", "car-5.jpg"],
  ["car", "car", "car-6.jpg"],
  ["car", "car", "gallery-1.jpg"],
  ["car", "car", "gallery-2.jpg"],
  ["car", "car", "gallery-3.jpg"],
  ["car", "car", "gallery-4.jpg"],
  ["car", "car", "gallery-5.jpg"],
  ["car", "car", "gallery-6.jpg"],
  ["car", "car", "gallery-7.jpg"],
  ["car", "car", "banner-single.jpg"],
  // boat
  ["boat", "boat", "boat-1.jpg"],
  ["boat", "boat", "boat-2.jpg"],
  ["boat", "boat", "boat-3.jpg"],
  ["boat", "boat", "boat-4.jpg"],
  ["boat", "boat", "boat-5.jpg"],
  ["boat", "boat", "boat-6.jpg"],
  ["boat", "boat", "gallery-1.jpg"],
  ["boat", "boat", "gallery-2.jpg"],
  ["boat", "boat", "gallery-3.jpg"],
  ["boat", "boat", "gallery-4.jpg"],
  ["boat", "boat", "gallery-5.jpg"],
  ["boat", "boat", "gallery-6.jpg"],
  ["boat", "boat", "banner-single.jpg"],
  // tour
  ["tour", "tour", "tour-1.jpg"],
  ["tour", "tour", "tour-2.jpg"],
  ["tour", "tour", "tour-3.jpg"],
  ["tour", "tour", "tour-4.jpg"],
  ["tour", "tour", "tour-5.jpg"],
  ["tour", "tour", "tour-6.jpg"],
  ["tour", "tour", "gallery-1.jpg"],
  ["tour", "tour", "gallery-2.jpg"],
  ["tour", "tour", "gallery-3.jpg"],
  ["tour", "tour", "gallery-4.jpg"],
  ["tour", "tour", "gallery-5.jpg"],
  ["tour", "tour", "gallery-6.jpg"],
  ["tour", "tour", "gallery-7.jpg"],
  // event (stub modülü için)
  ["event", "event", "event-1.jpg"],
  ["event", "event", "event-2.jpg"],
  ["event", "event", "event-3.jpg"],
  ["event", "event", "gallery-1.jpg"],
  ["event", "event", "gallery-2.jpg"],
  ["event", "event", "gallery-3.jpg"],
];

async function main() {
  let copied = 0;
  let missing = 0;

  for (const [targetModule, srcModule, relFile] of COPIES) {
    const src = path.join(bcDemo, srcModule, relFile);
    const baseName = path.basename(relFile);
    const dest = path.join(outRoot, targetModule, baseName);
    try {
      await mkdir(path.dirname(dest), { recursive: true });
      await cp(src, dest);
      copied++;
    } catch (err) {
      console.warn(`[skip] ${src} → ${err.message}`);
      missing++;
    }
  }

  console.log(`turizm-bc images: copied=${copied} missing=${missing} → ${outRoot}`);
  if (missing > 0) process.exitCode = 1;
}

main();
