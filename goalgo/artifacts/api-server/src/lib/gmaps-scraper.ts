import puppeteer from "puppeteer-core";
import { execSync } from "child_process";
import fs from "node:fs";

let lastChromiumProbe: { ok: boolean; path: string | null; error: string | null; checkedAt: string } | null = null;

function getChromiumPath(): string {
  const fromEnv =
    (process.env["CHROMIUM_PATH"] || process.env["PUPPETEER_EXECUTABLE_PATH"] || "").trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const commonPaths = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
  ];
  for (const p of commonPaths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }

  const candidates = [
    () => execSync("which chromium 2>/dev/null", { encoding: "utf8", shell: "/bin/sh" }).trim(),
    () => execSync("which chromium-browser 2>/dev/null", { encoding: "utf8", shell: "/bin/sh" }).trim(),
    () => execSync("which google-chrome-stable 2>/dev/null", { encoding: "utf8", shell: "/bin/sh" }).trim(),
  ];
  for (const fn of candidates) {
    try {
      const p = fn();
      if (p && fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }

  throw new Error(
    "Chromium bulunamadı. Docker imajında 'chromium' kurulu olmalı veya CHROMIUM_PATH ortam değişkeni " +
      "tarayıcı yürütülebilir dosyasına ayarlanmalı. Google Maps Bot bu olmadan çalışmaz; OpenStreetMap veya Places API kullanın.",
  );
}

const BROWSER_ARGS = [
  "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
  "--disable-gpu", "--no-first-run", "--no-zygote",
  "--disable-extensions", "--disable-background-networking",
  "--disable-default-apps", "--disable-sync", "--disable-translate",
  "--hide-scrollbars", "--metrics-recording-only", "--mute-audio",
  "--safebrowsing-disable-auto-update", "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
  "--lang=tr-TR,tr",
  "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

export function getChromiumPathForStatus(): { path: string | null; fromEnv: boolean } {
  const fromEnv = Boolean((process.env["CHROMIUM_PATH"] || process.env["PUPPETEER_EXECUTABLE_PATH"] || "").trim());
  try {
    return { path: getChromiumPath(), fromEnv };
  } catch {
    return { path: null, fromEnv };
  }
}

export async function verifyChromiumStartup(): Promise<{ ok: boolean; path: string | null; error: string | null }> {
  let path: string | null = null;
  try {
    path = getChromiumPath();
    const browser = await puppeteer.launch({
      executablePath: path,
      headless: true,
      args: [...BROWSER_ARGS, "--single-process"],
    });
    await browser.version();
    await browser.close();
    lastChromiumProbe = { ok: true, path, error: null, checkedAt: new Date().toISOString() };
    return lastChromiumProbe;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    lastChromiumProbe = { ok: false, path, error, checkedAt: new Date().toISOString() };
    return lastChromiumProbe;
  }
}

export function getLastChromiumProbe() {
  return lastChromiumProbe;
}

type Browser = Awaited<ReturnType<typeof puppeteer.launch>>;
let sharedBrowser: Browser | null = null;

export async function resetSharedBrowser(): Promise<void> {
  if (sharedBrowser) {
    try { await sharedBrowser.close(); } catch {}
    sharedBrowser = null;
  }
}

let browserBirthTime = 0;
const BROWSER_MAX_AGE_MS = 10 * 60 * 1000; // recycle browser every 10 minutes

async function getSharedBrowser(): Promise<Browser> {
  const now = Date.now();
  if (sharedBrowser && now - browserBirthTime < BROWSER_MAX_AGE_MS) {
    try { await sharedBrowser.version(); return sharedBrowser; } catch {}
  }
  // Close stale browser
  if (sharedBrowser) { try { await sharedBrowser.close(); } catch {} sharedBrowser = null; }
  sharedBrowser = await puppeteer.launch({
    executablePath: getChromiumPath(),
    headless: true,
    args: BROWSER_ARGS,
  });
  browserBirthTime = now;
  return sharedBrowser;
}

/** Run tasks with bounded concurrency */
async function parallelLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]!();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export interface ScrapedReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
  profilePhoto: string | null;
}

export interface ScrapedBusiness {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  photoUrl: string | null;
  photos: string[];
  description: string | null;
  priceLevel: number | null;
  openNow: boolean | null;
  workingHours: Record<string, string> | null;
  tags: string[];
  reviews: ScrapedReview[];
}

/** Dismiss cookie/consent dialogs on Google pages */
async function dismissConsent(page: import("puppeteer-core").Page) {
  try {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button, [role=button]"));
      for (const btn of btns) {
        const text = (btn as HTMLElement).innerText?.toLowerCase() || "";
        if (text.includes("accept") || text.includes("kabul") || text.includes("agree") || text.includes("reject") || text.includes("reddet") || text.includes("tümünü reddet")) {
          (btn as HTMLElement).click();
          break;
        }
      }
    });
    await new Promise(r => setTimeout(r, 800));
  } catch {}
}

/** Scrape Google Knowledge Panel from Google Search */
async function scrapeGoogleKnowledgePanel(page: import("puppeteer-core").Page, query: string): Promise<{
  phone: string | null;
  website: string | null;
  address: string | null;
  description: string | null;
  rating: number | null;
  reviewCount: number | null;
  openNow: boolean | null;
  workingHours: Record<string, string> | null;
  photos: string[];
  reviews: ScrapedReview[];
  category: string | null;
}> {
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=tr&gl=tr`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await new Promise(r => setTimeout(r, 1200));
    await dismissConsent(page);
    await new Promise(r => setTimeout(r, 600));

    // Try to expand working hours section (Google collapses it by default)
    try {
      await page.evaluate(() => {
        const expandBtns = Array.from(document.querySelectorAll('button, [role=button], span[jsaction]'));
        for (const btn of expandBtns) {
          const text = (btn as HTMLElement).innerText?.toLowerCase() || btn.getAttribute("aria-label")?.toLowerCase() || "";
          if (text.includes("saate") || text.includes("saat") || text.includes("hour") || text.includes("açılış") || text.includes("çalışma saati")) {
            (btn as HTMLElement).click();
            break;
          }
        }
      });
      await new Promise(r => setTimeout(r, 800));
    } catch {}

    // Also expand with a more targeted approach
    try {
      const hoursBtn = await page.$('[data-attrid*="hours"] [jsaction], [data-attrid*="hours"] button, .eoY5cb, .hqF0Ve');
      if (hoursBtn) { await hoursBtn.click(); await new Promise(r => setTimeout(r, 600)); }
    } catch {}

    const data = await page.evaluate(() => {
      function getText(sels: string[], root: Document | Element = document): string | null {
        for (const sel of sels) {
          const el = root.querySelector(sel);
          const t = (el as HTMLElement)?.innerText?.trim() || el?.textContent?.trim();
          if (t) return t;
        }
        return null;
      }
      function getAttr(sels: string[], attr: string, root: Document | Element = document): string | null {
        for (const sel of sels) {
          const v = root.querySelector(sel)?.getAttribute(attr);
          if (v) return v;
        }
        return null;
      }

      // Phone
      const phone = getText([
        '[data-dtype="d3ph"] [data-local-attribute="d3ph"]',
        '[data-local-attribute="d3ph"]',
        'a[href^="tel:"]',
        '[aria-label*="Telefon"] span',
      ]) || (() => {
        const tel = document.querySelector('a[href^="tel:"]');
        return tel ? (tel as HTMLAnchorElement).href.replace("tel:", "") : null;
      })();

      // Website
      const website = getAttr([
        '[data-local-attribute="d3we"] a',
        '.ab_button[href^="http"]:not([href*="google"])',
      ], "href") || (() => {
        const links = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
        const web = links.find(a => a.textContent?.includes("Web sitesi") || a.getAttribute("data-local-attribute") === "d3we");
        return web?.href || null;
      })();

      // Address
      const address = getText([
        '[data-local-attribute="d3adr"]',
        '[data-dtype="d3adr"]',
        '.LrzXr',
        'span[data-local-attribute="d3adr"]',
      ]);

      // Description
      const description = getText([
        '.kno-rdesc span:not(.Kkhlhc)',
        '.PZPZlf span',
        '[data-attrid="description"] span span',
        '.wx62f span',
      ]);

      // Category
      const category = getText([
        '[data-attrid="subtitle"]',
        '.YhemCb',
        '.qrShPb span:first-child',
        '.wwUB2c span',
      ]);

      // Rating
      const ratingText = getText([
        '[data-attrid*="rating"] .Aq14fc',
        '.Aq14fc',
        '[aria-label*="yıldız"]',
      ]) || getAttr(['[aria-label*="yıldız"], [aria-label*="stars"]'], "aria-label");
      const ratingMatch = ratingText?.match(/(\d[.,]\d|\d)/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(",", ".")) : null;

      // Review count
      const rcText = getText([
        '[data-attrid*="rating"] .w5WZR',
        '.hqzQac .YRBUH',
        '[aria-label*="yorum"]',
      ]);
      const rcMatch = rcText?.match(/[\d.,]+/);
      const reviewCount = rcMatch ? parseInt(rcMatch[0].replace(/[.,]/g, "")) || null : null;

      // Open now
      const openText = getText([
        '.ZT2DZe',
        '.ooCnub',
        '[data-attrid*="hours"] span',
        '.rllt__details .C18VId',
      ])?.toLowerCase();
      const openNow = openText ? (openText.includes("açık") || openText.includes("open") ? true : openText.includes("kapalı") || openText.includes("closed") ? false : null) : null;

      // Working hours — try multiple approaches
      const workingHours: Record<string, string> = {};
      const TR_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

      // Method 1: table rows in knowledge panel
      const hoursRows = document.querySelectorAll(
        '.WgFkxc tr, table.t2OYAc tr, .t39EBf tr, [data-attrid*="hours"] table tr, ' +
        '.wprjSb tr, .lo7U087vRw tr, .eK4R0e tr, .iQXTJe tr'
      );
      hoursRows.forEach(row => {
        const cells = row.querySelectorAll("td, th");
        if (cells.length >= 2) {
          const day = (cells[0] as HTMLElement)?.innerText?.trim();
          const hrs = (cells[1] as HTMLElement)?.innerText?.trim()?.replace(/\s+/g, " ");
          if (day && hrs && TR_DAYS.some(d => day.includes(d))) workingHours[day] = hrs;
        }
      });

      // Method 2: scan all text for day+time patterns (catches collapsed panel text)
      if (Object.keys(workingHours).length === 0) {
        const body = document.body.innerText || "";
        const dayPattern = new RegExp(
          `(${TR_DAYS.join("|")})\\s+([0-9]{1,2}[:.][0-9]{2}\\s*[-–—]\\s*[0-9]{1,2}[:.][0-9]{2}|Açık 24 saat|Kapalı)`,
          "gi"
        );
        let m: RegExpExecArray | null;
        while ((m = dayPattern.exec(body)) !== null) {
          const day = m[1]!;
          const hrs = m[2]!.trim();
          if (!workingHours[day]) workingHours[day] = hrs;
        }
      }

      // Method 3: look for structured opening_hours JSON-LD
      if (Object.keys(workingHours).length === 0) {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const s of scripts) {
          try {
            const json = JSON.parse((s as HTMLElement).innerText || "{}");
            const specs: {dayOfWeek?: string | string[]; opens?: string; closes?: string}[] = json.openingHoursSpecification || json.openingHours || [];
            if (Array.isArray(specs)) {
              const dayMap: Record<string, string> = {
                Monday:"Pazartesi",Tuesday:"Salı",Wednesday:"Çarşamba",Thursday:"Perşembe",
                Friday:"Cuma",Saturday:"Cumartesi",Sunday:"Pazar"
              };
              specs.forEach(spec => {
                const days = Array.isArray(spec.dayOfWeek) ? spec.dayOfWeek : [spec.dayOfWeek];
                days.forEach(d => {
                  const key = String(d).split("/").pop() || "";
                  const trDay: string = dayMap[key] || String(d) || "";
                  if (trDay && spec.opens && spec.closes) workingHours[trDay] = `${spec.opens} – ${spec.closes}`;
                });
              });
            }
          } catch {}
        }
      }

      // Photos — from knowledge panel images
      const photoUrls: string[] = [];
      const seen = new Set<string>();
      const imgEls = document.querySelectorAll(
        'img[src*="googleusercontent"], img[src*="lh3"], img[src*="lh5"], img[src*="lh6"], ' +
        '[data-attrid*="photo"] img, .xblkwb img, .Rv8eQc img, .T75of img, .TuS0Xe img, ' +
        'g-scrolling-carousel img, .img-brk-container img'
      );
      imgEls.forEach(img => {
        let src = img.getAttribute("src") || img.getAttribute("data-src") || "";
        if (!src || src.startsWith("data:") || src.length < 20) return;
        if (src.includes("maps.gstatic.com") || src.includes("google.com/logos")) return;
        // Upgrade to higher resolution
        src = src.replace(/=w\d+/, "=w1200").replace(/=h\d+/, "=h800").replace(/=s\d+/, "=s1200").split("&")[0];
        if (!seen.has(src) && photoUrls.length < 15) { seen.add(src); photoUrls.push(src); }
      });

      // Reviews from Google Search snippets
      type Rev = { authorName: string; rating: number; text: string; relativeTime: string; profilePhoto: string | null };
      const reviews: Rev[] = [];
      const reviewEls = document.querySelectorAll(".gws-localreviews__google-review, [data-review-id], .jftiEf");
      reviewEls.forEach(el => {
        if (reviews.length >= 10) return;
        const authorEl = el.querySelector(".X43Kjb, .d4r55, .TSUbDb");
        const authorName = (authorEl as HTMLElement)?.innerText?.trim();
        if (!authorName) return;
        const rEl = el.querySelector("[role=img][aria-label]");
        const rLabel = rEl?.getAttribute("aria-label") || "";
        const rm = rLabel.match(/(\d[.,]\d|\d)/);
        const r = rm ? parseFloat(rm[1].replace(",", ".")) : 0;
        const textEl = el.querySelector(".Jtu6Td, .wiI7pd, .MyEned, .review-full-text");
        const text = (textEl as HTMLElement)?.innerText?.trim() || "";
        const timeEl = el.querySelector(".dehysf, .rsqaWe");
        const relTime = (timeEl as HTMLElement)?.innerText?.trim() || "";
        const photoEl = el.querySelector("img[src]");
        const photo = photoEl?.getAttribute("src") || null;
        if (authorName) reviews.push({ authorName, rating: r, text, relativeTime: relTime, profilePhoto: photo });
      });

      return {
        phone, website, address, description, category,
        rating, reviewCount, openNow,
        workingHours: Object.keys(workingHours).length > 0 ? workingHours : null,
        photos: photoUrls,
        reviews,
      };
    });

    return data;
  } catch {
    return {
      phone: null, website: null, address: null, description: null,
      category: null, rating: null, reviewCount: null, openNow: null,
      workingHours: null, photos: [], reviews: [],
    };
  }
}

/** Extract all googleusercontent photo URLs from the current page */
async function extractPhotosFromPage(page: import("puppeteer-core").Page): Promise<string[]> {
  return page.evaluate(() => {
    const photoUrls: string[] = [];
    const seen = new Set<string>();
    document.querySelectorAll("img[src]").forEach(img => {
      let src = img.getAttribute("src") || img.getAttribute("data-src") || "";
      if (!src || src.startsWith("data:") || src.length < 30) return;
      if (!src.includes("googleusercontent") && !src.includes("lh3.") && !src.includes("lh5.") && !src.includes("lh6.")) return;
      if (src.includes("maps.gstatic") || src.includes("google.com/logos") || src.includes("avatar")) return;
      src = src.replace(/=w\d+-h\d+-[^=&]*/g, "=w1600-h1200").replace(/=s\d+/, "=s1600").split("&")[0];
      if (!seen.has(src) && photoUrls.length < 20) { seen.add(src); photoUrls.push(src); }
    });
    return photoUrls;
  });
}

/** Scrape Google Maps for a business detail page (photos, hours, phone, website, address, reviews) */
async function scrapeGoogleMapsDetail(page: import("puppeteer-core").Page, url: string): Promise<{
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  photos: string[];
  workingHours: Record<string, string> | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  reviews: ScrapedReview[];
}> {
  type Rev = ScrapedReview;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await new Promise(r => setTimeout(r, 1500));
    await dismissConsent(page);
    await new Promise(r => setTimeout(r, 600));

    // Scroll to trigger lazy-loaded images
    await page.evaluate(() => window.scrollBy(0, 600));
    await new Promise(r => setTimeout(r, 500));

    // Expand hours section
    try {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll(
          '[aria-label*="saat"], [aria-label*="Saat"], [aria-label*="hours"], [aria-label*="Hours"], ' +
          'button[jsaction*="openhours"], [data-item-id*="oh"] button'
        ));
        for (const btn of btns) { (btn as HTMLElement).click(); break; }
      });
      await new Promise(r => setTimeout(r, 600));
    } catch {}

    const finalUrl = page.url();
    /**
     * Mekan koordinatı URL'deki `!3d<lat>!4d<lng>` segmentindedir. `@lat,lng` ise harita
     * KAMERASININ merkezidir; sayfa mekana "uçmadan" okunursa ülke geneli/önceki aramanın
     * merkezi kaydedilir (ör. Fethiye'deki işletmeye Amasya civarı koordinat yazılması bu yüzdendi).
     */
    const placeCoordMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const cameraMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const coordMatch = placeCoordMatch ?? cameraMatch;
    const latitude = coordMatch ? parseFloat(coordMatch[1]) : null;
    const longitude = coordMatch ? parseFloat(coordMatch[2]) : null;

    // Gerçek place_id: !19sChIJ… veya /place/…/ChIJ… — !1s0x… hex CID bölgede paylaşımlıdır.
    let googlePlaceId: string | null = null;
    const place19Match = finalUrl.match(/!19s(ChI[A-Za-z0-9_-]+)/);
    if (place19Match) googlePlaceId = place19Match[1];
    else {
      const placeMatch = finalUrl.match(/place\/[^/]+\/(ChI[A-Za-z0-9_-]+)/);
      if (placeMatch) googlePlaceId = placeMatch[1];
    }

    // Extract basic info + hours + photos
    const extracted = await page.evaluate(() => {
      function getText(sels: string[]): string | null {
        for (const sel of sels) {
          const t = (document.querySelector(sel) as HTMLElement)?.innerText?.trim();
          if (t) return t;
        }
        return null;
      }

      // Phone
      const phone = getText([
        'button[data-item-id^="phone:"] .fontBodyMedium',
        '[data-item-id*="phone"] .Io6YTe',
        'a[href^="tel:"]',
      ]) || (() => {
        const a = document.querySelector('a[href^="tel:"]') as HTMLAnchorElement;
        return a ? a.href.replace("tel:", "") : null;
      })();

      // Website
      const webEl = document.querySelector('a[data-item-id="authority"], a[data-item-id*="url"]') as HTMLAnchorElement;
      const website = webEl?.href || null;

      // Address
      const address = getText([
        'button[data-item-id^="address"] .fontBodyMedium',
        '[data-item-id*="address"] .Io6YTe',
        'button[data-tooltip*="adres"] .fontBodyMedium',
        '[aria-label*="Adres"] .fontBodyMedium',
        '.rogA2c .Io6YTe',
      ]) || (() => {
        const btn = Array.from(document.querySelectorAll('button[data-item-id]')).find(b => {
          const id = b.getAttribute('data-item-id') || '';
          return id.includes('address') || id.includes('laddress');
        }) as HTMLElement | undefined;
        return btn?.querySelector('.fontBodyMedium')?.textContent?.trim() || null;
      })();

      // Working hours from table in expanded section
      const workingHours: Record<string, string> = {};
      const TR_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar",
                       "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      document.querySelectorAll("table tr, .y0skZc, .WgFkxc tr").forEach(row => {
        const cells = row.querySelectorAll("td, th, li");
        if (cells.length >= 2) {
          const day = (cells[0] as HTMLElement)?.innerText?.trim();
          const hrs = (cells[1] as HTMLElement)?.innerText?.trim()?.replace(/\s+/g, " ");
          if (day && hrs && TR_DAYS.some(d => day.startsWith(d))) workingHours[day] = hrs;
        }
      });
      // Also try aria-label patterns like "Pazartesi, 08:00–20:00"
      if (Object.keys(workingHours).length === 0) {
        document.querySelectorAll('[aria-label]').forEach(el => {
          const label = el.getAttribute('aria-label') || '';
          const m = label.match(/^(Pazartesi|Salı|Çarşamba|Perşembe|Cuma|Cumartesi|Pazar),\s*(.+)/);
          if (m) workingHours[m[1]] = m[2].trim();
        });
      }

      return { phone, website, address, workingHours: Object.keys(workingHours).length > 0 ? workingHours : null };
    });

    // Collect initial photos
    const photos = await extractPhotosFromPage(page);

    // Click "Yorumlar" tab and scrape reviews
    let reviews: Rev[] = [];
    try {
      const clickedReviews = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button[role="tab"], .hh2c6, .bsCTCe button'));
        for (const tab of tabs) {
          const text = (tab as HTMLElement).innerText?.toLowerCase() || (tab as HTMLElement).getAttribute("aria-label")?.toLowerCase() || "";
          if (text.includes("yorum") || text.includes("review")) {
            (tab as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      if (clickedReviews) {
        await new Promise(r => setTimeout(r, 1200));

        // Scroll reviews container to load more
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => {
            const main = document.querySelector('[role="main"]') as HTMLElement;
            const feed = document.querySelector('.m6QErb[tabindex="-1"]') as HTMLElement;
            (feed || main)?.scrollBy(0, 1500);
          });
          await new Promise(r => setTimeout(r, 700));
        }

        // Expand "Daha fazla" (show more) buttons for review text
        await page.evaluate(() => {
          document.querySelectorAll('button.w8nwRe, button[aria-label*="daha fazla"], .kyuRq button').forEach(btn => {
            (btn as HTMLElement).click();
          });
        }).catch(() => {});

        reviews = await page.evaluate(() => {
          type Rev = { authorName: string; rating: number; text: string; relativeTime: string; profilePhoto: string | null };
          const revs: Rev[] = [];
          const seen = new Set<string>();
          const reviewEls = document.querySelectorAll('.jftiEf, [data-review-id], .GHT2ce');
          reviewEls.forEach(el => {
            if (revs.length >= 12) return;
            const authorEl = el.querySelector('.d4r55, .X43Kjb, .TSUbDb');
            const authorName = (authorEl as HTMLElement)?.innerText?.trim();
            if (!authorName || seen.has(authorName)) return;
            seen.add(authorName);
            const rEl = el.querySelector('[role=img][aria-label]');
            const rLabel = rEl?.getAttribute("aria-label") || "";
            const rm = rLabel.match(/(\d[.,]\d|\d)/);
            const rating = rm ? parseFloat(rm[1].replace(",", ".")) : 0;
            const textEl = el.querySelector('.wiI7pd, .MyEned, .Jtu6Td, .review-full-text');
            const text = (textEl as HTMLElement)?.innerText?.trim() || "";
            const timeEl = el.querySelector('.rsqaWe, .dehysf');
            const relativeTime = (timeEl as HTMLElement)?.innerText?.trim() || "";
            const photoEl = el.querySelector("img.NBa7we, button[jsaction*='photo'] img");
            const profilePhoto = photoEl?.getAttribute("src") || null;
            if (authorName) revs.push({ authorName, rating, text, relativeTime, profilePhoto });
          });
          return revs;
        });
      }
    } catch {}

    return { latitude, longitude, googlePlaceId, ...extracted, photos, reviews };
  } catch {
    return { latitude: null, longitude: null, googlePlaceId: null, photos: [], workingHours: null, phone: null, website: null, address: null, reviews: [] };
  }
}

/** Extract place_id from a Google Maps URL (ChIJ… only; skip shared 0x hex CID). */
function extractPlaceId(url: string): string | null {
  const m19 = url.match(/!19s(ChI[A-Za-z0-9_-]+)/);
  if (m19) return m19[1];
  const m = url.match(/place\/[^/]+\/(ChI[A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return null;
}

export async function scrapeGoogleMaps(opts: {
  query: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  maxResults?: number;
  enrichAll?: boolean;
  enrichMax?: number;
  /** Önizleme: yalnızca liste kartları; detay sayfası açma (proxy zaman aşımını önler). */
  previewOnly?: boolean;
}): Promise<{ businesses: ScrapedBusiness[]; error?: string }> {
  const {
    query,
    lat,
    lng,
    radiusMeters = 20_000,
    maxResults = 20,
    enrichAll = false,
    enrichMax,
    previewOnly = false,
  } = opts;

  try {
    const browser = await getSharedBrowser();
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({ "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8" });
    await page.setViewport({ width: 1280, height: 900 });

    let searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    if (lat && lng) {
      const zoom = radiusMeters >= 20_000 ? 12 : radiusMeters >= 10_000 ? 13 : 14;
      searchUrl += `/@${lat},${lng},${zoom}z`;
    }

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise(r => setTimeout(r, 1200));
    await dismissConsent(page);
    await new Promise(r => setTimeout(r, 800));

    // Wait for results feed
    await page.waitForSelector('[role="feed"], .Nv2PK, [data-result-index]', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));

    // Scroll to load more results
    const scrollCount = Math.ceil(maxResults / 4);
    for (let i = 0; i < scrollCount; i++) {
      await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]') as HTMLElement;
        if (feed) feed.scrollTop += 1500;
      });
      await new Promise(r => setTimeout(r, 700));
    }

    // Extract listing cards
    const listings = await page.evaluate((max: number) => {
      const results: Array<{
        name: string; address: string | null; rating: number | null;
        reviewCount: number | null; category: string | null;
        latitude: number | null; longitude: number | null;
        googleMapsUrl: string | null; photoUrl: string | null;
      }> = [];

      const cardSelectors = ['.Nv2PK', '[data-result-index]', '[jsaction*="pane.resultSection"]', '.bfdHYd'];
      let cards: Element[] = [];
      for (const sel of cardSelectors) {
        const found = Array.from(document.querySelectorAll(sel));
        if (found.length > 0) { cards = found; break; }
      }

      cards.forEach(card => {
        if (results.length >= max) return;
        const nameEl = card.querySelector('.qBF1Pd, .fontHeadlineSmall, [class*="fontHeadline"], .NrDZNb');
        const name = (nameEl as HTMLElement)?.innerText?.trim();
        if (!name) return;
        const ratingEl = card.querySelector('.MW4etd, [aria-label*="yıldız"], [aria-label*="stars"], .ZkP5Je');
        const ratingText = (ratingEl as HTMLElement)?.innerText?.trim() || ratingEl?.getAttribute("aria-label") || null;
        const ratingMatch = ratingText?.match(/(\d[.,]\d|\d)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(",", ".")) : null;
        const reviewEl = card.querySelector('.UY7F9, [aria-label*="yorum"], [aria-label*="review"], .e4rVHe');
        const reviewText = (reviewEl as HTMLElement)?.innerText?.trim() || null;
        const reviewCount = reviewText ? parseInt(reviewText.replace(/[^0-9]/g, "")) || null : null;
        const spans = card.querySelectorAll('.W4Efsd span, .W4Efsd > div > span');
        let address: string | null = null;
        let category: string | null = null;
        spans.forEach((span, idx) => {
          const t = (span as HTMLElement).innerText?.trim();
          if (!t || t === "·") return;
          if (idx === 0 || t.length < 40) category = t;
          else if (t.length > 5) address = t;
        });
        const linkEl = card.querySelector('a[href*="/maps/place/"]') as HTMLAnchorElement;
        const googleMapsUrl = linkEl ? `https://www.google.com${linkEl.getAttribute("href")}` : null;
        let latitude: number | null = null, longitude: number | null = null;
        if (googleMapsUrl) {
          // `!3d!4d` = mekanın kendi koordinatı; `@lat,lng` yalnız kamera merkezi (tüm kartlarda aynı çıkar)
          const cm = googleMapsUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || googleMapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (cm) { latitude = parseFloat(cm[1]); longitude = parseFloat(cm[2]); }
        }
        const imgEl = card.querySelector('img[src*="googleusercontent"], img[src*="lh3"], img[src*="lh5"], img[src*="lh6"]') as HTMLImageElement;
        // Kart küçük resmi (`=w86-h86`) pikselli olur; yüksek çözünürlük jetonuyla kaydet.
        const photoUrl = imgEl?.src
          ? imgEl.src.replace(/=w\d+-h\d+[^=&]*/g, "=w1600-h1200").replace(/=s\d+/g, "=s1600").split("&")[0]
          : null;
        results.push({ name, address, rating, reviewCount, category, latitude, longitude, googleMapsUrl, photoUrl });
      });
      return results;
    }, maxResults);

    await page.close().catch(() => {});

    if (listings.length === 0) return { businesses: [] };

    if (previewOnly) {
      const previewBusinesses: ScrapedBusiness[] = listings.map((biz) => ({
        name: biz.name.trim(),
        address: biz.address,
        phone: null,
        website: null,
        rating: biz.rating,
        reviewCount: biz.reviewCount,
        category: biz.category,
        latitude: biz.latitude,
        longitude: biz.longitude,
        googleMapsUrl: biz.googleMapsUrl,
        googlePlaceId: extractPlaceId(biz.googleMapsUrl ?? "") ?? null,
        photoUrl: biz.photoUrl,
        photos: biz.photoUrl ? [biz.photoUrl] : [],
        description: null,
        priceLevel: null,
        openNow: null,
        workingHours: null,
        tags: [],
        reviews: [],
      }));
      return { businesses: previewBusinesses };
    }

    const enrichCap = enrichMax != null && Number.isFinite(enrichMax)
      ? Math.max(1, Math.min(maxResults, Math.round(enrichMax)))
      : maxResults;
    const enrichCount = Math.min(listings.length, enrichCap);

    // ── Parallel enrichment (4 concurrent pages) ──────────────────────
    const safeN = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

    const enrichTasks = listings.slice(0, enrichCount).map(biz => async (): Promise<ScrapedBusiness | null> => {
      try {
        if (!biz?.name?.trim()) return null;

        let mapsDetail: Awaited<ReturnType<typeof scrapeGoogleMapsDetail>> = {
          latitude: null, longitude: null, googlePlaceId: null,
          photos: [], workingHours: null, phone: null, website: null, reviews: [], address: null,
        };

        if (biz.googleMapsUrl) {
          const detailPage = await browser.newPage().catch(() => null);
          if (detailPage) {
            mapsDetail = await scrapeGoogleMapsDetail(detailPage, biz.googleMapsUrl);
            await detailPage.close().catch(() => {});
          }
        }

        let kp: Awaited<ReturnType<typeof scrapeGoogleKnowledgePanel>> | null = null;
        if (enrichAll && (mapsDetail.photos.length < 3 || !mapsDetail.workingHours)) {
          const kpPage = await browser.newPage().catch(() => null);
          if (kpPage) {
            const kpQuery = [biz.name, biz.address || ""].join(" ").trim();
            kp = await scrapeGoogleKnowledgePanel(kpPage, kpQuery);
            await kpPage.close().catch(() => {});
          }
        }

        const allPhotos = [...mapsDetail.photos];
        if (kp) kp.photos.forEach(p => { if (!allPhotos.includes(p)) allPhotos.push(p); });
        if (biz.photoUrl && !allPhotos.includes(biz.photoUrl)) allPhotos.push(biz.photoUrl);

        const seenRevAuthors = new Set<string>();
        const allRevs: ScrapedReview[] = [];
        for (const rev of [...(mapsDetail.reviews || []), ...(kp?.reviews || [])]) {
          if (!seenRevAuthors.has(rev.authorName)) {
            seenRevAuthors.add(rev.authorName);
            allRevs.push(rev);
            if (allRevs.length >= 15) break;
          }
        }

        return {
          name: biz.name.trim(),
          address: mapsDetail.address || kp?.address || biz.address || null,
          phone: mapsDetail.phone || kp?.phone || null,
          website: mapsDetail.website || kp?.website || null,
          rating: safeN(biz.rating ?? kp?.rating),
          reviewCount: biz.reviewCount != null ? (Math.round(biz.reviewCount) || null) : safeN(kp?.reviewCount),
          category: biz.category || kp?.category || null,
          latitude: safeN(mapsDetail.latitude ?? biz.latitude),
          longitude: safeN(mapsDetail.longitude ?? biz.longitude),
          googleMapsUrl: biz.googleMapsUrl ?? null,
          googlePlaceId: mapsDetail.googlePlaceId ?? extractPlaceId(biz.googleMapsUrl ?? "") ?? null,
          photoUrl: allPhotos[0] ?? null,
          photos: allPhotos.slice(0, 15).filter(Boolean),
          description: kp?.description || null,
          priceLevel: null,
          openNow: kp?.openNow ?? null,
          workingHours: mapsDetail.workingHours || kp?.workingHours || null,
          tags: [],
          reviews: allRevs,
        };
      } catch { return null; }
    });

    const results = await parallelLimit(enrichTasks, 4);
    const enriched = results.filter((b): b is ScrapedBusiness => b !== null);

    return { businesses: enriched };
  } catch (err) {
    return { businesses: [], error: String(err) };
  }
}

/** Scrape a single business detail using both Google Maps and Google Search */
export async function scrapeBusinessDetail(opts: {
  name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  sourceUrl?: string | null;
}): Promise<Partial<ScrapedBusiness>> {
  const { name, address, lat, lng, sourceUrl } = opts;
  const browser = await getSharedBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({ "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8" });
    await page.setViewport({ width: 1280, height: 900 });

    // Run KP search and Maps search in parallel using separate pages
    const kpPageP = browser.newPage();
    const mapsPageP = browser.newPage();
    const [kpPage, mapsPage] = await Promise.all([kpPageP, mapsPageP]);

    await kpPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await kpPage.setExtraHTTPHeaders({ "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8" });
    await kpPage.setViewport({ width: 1280, height: 900 });

    const searchQuery = [name, address, "Türkiye"].filter(Boolean).join(" ");
    const kpPromise = scrapeGoogleKnowledgePanel(kpPage, searchQuery).finally(() => kpPage.close().catch(() => {}));

    // Maps search
    let mapsDetail: Awaited<ReturnType<typeof scrapeGoogleMapsDetail>> = {
      latitude: lat ?? null, longitude: lng ?? null, googlePlaceId: null,
      photos: [], workingHours: null, phone: null, website: null, reviews: [], address: null,
    };

    const mapsSearchUrl = sourceUrl && /^https?:\/\/(www\.)?google\./i.test(sourceUrl)
      ? sourceUrl
      : `https://www.google.com/maps/search/${encodeURIComponent([name, address].filter(Boolean).join(" "))}${lat && lng ? `/@${lat},${lng},16z` : ""}`;
    await mapsPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await mapsPage.setExtraHTTPHeaders({ "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8" });
    await mapsPage.setViewport({ width: 1280, height: 900 });
    await mapsPage.goto(mapsSearchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await new Promise(r => setTimeout(r, 1200));
    await dismissConsent(mapsPage);
    await new Promise(r => setTimeout(r, 600));

    const directPlaceUrl =
      sourceUrl && /\/maps\/place\//i.test(sourceUrl)
        ? sourceUrl
        : null;
    if (directPlaceUrl) {
      const detailPage = await browser.newPage();
      await detailPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      await detailPage.setExtraHTTPHeaders({ "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8" });
      mapsDetail = await scrapeGoogleMapsDetail(detailPage, directPlaceUrl);
      await detailPage.close().catch(() => {});
    } else {
      const firstCard = await mapsPage.$('.Nv2PK a[href*="/maps/place/"], .bfdHYd a[href*="/maps/place/"]');
      if (firstCard) {
        const href = await firstCard.evaluate(el => el.getAttribute("href"));
        if (href) {
          const fullUrl = href.startsWith("http") ? href : `https://www.google.com${href}`;
          const detailPage = await browser.newPage();
          await detailPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
          await detailPage.setExtraHTTPHeaders({ "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8" });
          mapsDetail = await scrapeGoogleMapsDetail(detailPage, fullUrl);
          await detailPage.close().catch(() => {});
        }
      }
    }
    await mapsPage.close().catch(() => {});
    await page.close().catch(() => {});

    const kp = await kpPromise;

    const allPhotos = [...mapsDetail.photos];
    kp.photos.forEach(p => { if (!allPhotos.includes(p)) allPhotos.push(p); });

    const seenAuthors = new Set<string>();
    const allReviews: ScrapedReview[] = [];
    for (const rev of [...(mapsDetail.reviews || []), ...(kp.reviews || [])]) {
      if (!seenAuthors.has(rev.authorName)) {
        seenAuthors.add(rev.authorName);
        allReviews.push(rev);
        if (allReviews.length >= 15) break;
      }
    }

    return {
      name,
      address: mapsDetail.address || kp.address || address || null,
      phone: mapsDetail.phone || kp.phone || null,
      website: mapsDetail.website || kp.website || null,
      rating: kp.rating,
      reviewCount: kp.reviewCount,
      category: kp.category || null,
      latitude: mapsDetail.latitude || lat || null,
      longitude: mapsDetail.longitude || lng || null,
      googlePlaceId: mapsDetail.googlePlaceId || null,
      photoUrl: allPhotos[0] ?? null,
      photos: allPhotos.slice(0, 15).filter(Boolean),
      description: kp.description || null,
      openNow: kp.openNow,
      workingHours: mapsDetail.workingHours || kp.workingHours || null,
      reviews: allReviews,
      tags: [],
      priceLevel: null,
      googleMapsUrl: null,
    };
  } catch (err) {
    return { name, photos: [], reviews: [], tags: [] };
  }
}
