# 🛒 JP Shopping Intel

> Personal Japanese shopping tracker with OCR screenshot import, barcode scanning, wishlist management, landed cost calculation, spending analytics, release calendar, and social media discovery for hobby collectibles.

**Live app → [jp-shopping-intel.vercel.app](https://jp-shopping-intel.vercel.app)**

---

## ✨ Features

| Feature | Description |
|---|---|
| **Wishlist** | Track items from Mercari, Yahoo! Auctions, Suruga-ya, Melonbooks, Toranoana, Amazon JP, and more |
| **OCR Import** | Drop a screenshot and extract title, price, listing ID, and JAN code automatically (Tesseract.js or Google Vision API) |
| **Barcode / JAN Scanner** | Scan physical product barcodes in-store to instantly generate search links across all major JP storefronts |
| **Cross-Platform Search** | "Find on other platforms" panel on each item — generates search links by JAN code and by title |
| **Landed Cost Calculator** | Compute the true cost including domestic shipping, proxy service fee, international shipping, and payment processing |
| **Currency Converter** | Floating widget with live rates (11 currencies) from Frankfurter — respects your preferred currency |
| **Multi-Currency Dashboard** | Dashboard total shown in both JPY and your preferred currency |
| **Discovery Inbox** | Browse a curated list of JP hobby Twitter/Instagram accounts; import screenshots to your wishlist |
| **Spending Analytics** | Spend by status, platform, tag, and monthly bar charts — pure CSS, no chart library |
| **Release Calendar** | Monthly grid showing item arrival dates (green) and upcoming release dates (purple) |
| **Interest Profile** | Bilingual (EN/JP) keyword pairs and franchise tags that power search URL generation |
| **Data Export / Import** | Full JSON backup and restore — choose Overwrite or Merge mode |
| **PWA / Installable** | `manifest.json` + service worker — installable on mobile and works offline |
| **Dark Mode** | Full dark-mode support throughout |
| **100% local** | All data stored in `localStorage` — nothing leaves your device |

---

## 📸 Screenshots

> _Add screenshots of the Dashboard, Wishlist, Scanner, Analytics, and Calendar pages here._

---

## 🗺️ App Structure

| Route | Description |
|---|---|
| `/` | Dashboard — stats with dual-currency total, recent items, quick actions |
| `/wishlist` | Full wishlist with status badges |
| `/add` | Add item manually or via OCR screenshot / barcode scan |
| `/scan` | Dedicated barcode scanner — live camera or file picker |
| `/calculator` | Landed cost calculator with proxy service presets |
| `/analytics` | Spending analytics — by status, platform, tag, monthly |
| `/calendar` | Release & arrival calendar grid with upcoming sidebar |
| `/discovery` | Social media discovery inbox |
| `/settings` | Currency, keywords, proxy presets, Vision API key, backup/restore |

---

## 🧮 Landed Cost Calculator

Calculates the true all-in cost of a Japanese purchase:

```
Total = Item Price
      + Domestic Japan Shipping
      + Proxy Service Fee  (fixed ¥ + % of item price)
      + International Shipping Estimate
      + Payment Processing Fee (e.g. credit card 3.6%)
```

Built-in presets for **Buyee**, **Zenmarket**, **White Rabbit Express**, and **FROM JAPAN**. All values are editable.

---

## 🔍 OCR Screenshot Import

Two OCR engines are supported:

| Engine | Setup | Best for |
|---|---|---|
| **Tesseract.js** | Zero config, runs in-browser | Screenshots with clear text |
| **Google Vision API** | Requires API key (free tier available) | Handwritten prices, complex layouts, better Japanese |

To use Google Vision: add your API key in **Settings → Google Vision API Key**. The key is stored only in your browser's `localStorage` and is never sent to any server other than Google's Vision API directly.

### OCR improvements

- **`DOCUMENT_TEXT_DETECTION`** is always used (strictly better for dense multi-line text than `TEXT_DETECTION`)
- **Smart landscape crop**: wide screenshots (e.g. Mercari desktop with a product photo on the left) are automatically cropped to the right 55% where the title and price panel lives
- **Position-aware title extraction**: product titles appear *above* the price on JP shopping pages — the heuristic now prefers Japanese lines that appear before the price line in the document and filters out short UI labels

### Extracted fields

- Item title (Japanese preferred, position-aware)
- Price (`¥` / `￥` pattern)
- JAN/EAN barcode (`4xxxxxxxxxxxxxxxxx`)
- Listing ID
- Manufacturer (matched against known JP hobby manufacturers)
- Series name (matched against your interest keywords)

---

## 📷 Barcode / JAN Scanner (`/scan`)

Point your phone camera at any JAN/EAN-13 barcode (starts with `4`, 13 digits) on a physical product. Perfect for in-store scouting in Akihabara or at hobby shops.

- Live camera viewfinder using `getUserMedia` + `@zxing/browser`
- Falls back to a file-picker on desktop
- Displays the decoded JAN code prominently
- Generates search links for Amazon JP, Suruga-ya, Yahoo Shopping, Mercari JP, and Rakuten

---

## 📅 Release / Arrival Calendar (`/calendar`)

Monthly grid calendar showing:

- **Green chips** — items with `status === 'arrived'` appear on their `updatedAt` date
- **Purple chips** — items with a `releaseDate` appear on that date (set on the item detail page)
- Prev/next month navigation
- **Upcoming Releases sidebar** — items with `releaseDate` in the future, sorted ascending

Set a release date on any wishlist item via **Wishlist → Item → Release Date** date input.

---

## 📊 Spending Analytics (`/analytics`)

All data read from `localStorage`, no backend required:

- **Stats row** — total items, total spend (dual-currency), largest single purchase, most active platform
- **Spend by Status** — horizontal CSS bar chart across watching/bid_placed/purchased/arrived/passed
- **Spend by Platform** — top 6 platforms by spend (purchased + arrived only)
- **Spend by Tag** — top 8 tags by spend
- **Monthly Spend** — last 12 months as a CSS bar chart
- **Price Ceiling Hits** — watching items where current price ≤ ceiling (deals board)

---

## 🔗 Cross-Platform Search

On any wishlist item detail page, expand **"🔗 Find on other platforms"** to see:

- **By JAN Code** (shown only if the `listingId` is a 13-digit JAN code starting with `4`): Amazon JP, Suruga-ya, Yahoo Shopping, Mercari JP, Rakuten
- **By Title**: Mercari JP, Yahoo Auctions, Suruga-ya, Amazon JP, Rakuten, Melonbooks, Toranoana

---

## 📱 PWA / Installable App

The app ships a `public/manifest.json` and `public/sw.js` service worker that cache the app shell for offline use. Install it on your phone's home screen for quick in-store access.

The service worker caches: `/`, `/wishlist`, `/calculator`, `/discovery`, `/scan`, `/analytics`, `/calendar`, `/settings`.

Replace `public/icon-192.png` and `public/icon-512.png` with your own artwork.

---

## 🔄 Import Merge Mode

In **Settings → Data Management**, two import buttons are available:

| Button | Behaviour |
|---|---|
| **Import (Overwrite)** | Replaces all data — shown with ⚠️ warning |
| **Import (Merge)** | Deduplicates by `id`; incoming items take precedence for same IDs; new items are appended |

---

## ⚙️ Settings

- **Preferred Currency** — used in the cost calculator and currency widget (USD, HKD, TWD, SGD, EUR, GBP, AUD, CAD, KRW, CNY)
- **Proxy Service** — select a preset to pre-fill calculator defaults
- **International Shipping Estimate** — your typical EMS/SAL/airmail cost in JPY
- **Interest Keywords** — bilingual EN/JP keyword pairs; used for OCR matching and Twitter/X search URL previews
- **Google Vision API Key** — optional, for enhanced OCR
- **Export / Import** — full JSON backup of all app data (Overwrite or Merge)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| UI primitives | Headless UI, Lucide React |
| OCR (client) | [Tesseract.js](https://tesseract.projectnaptha.com/) |
| OCR (server proxy) | Google Cloud Vision API |
| Barcode scan | [@zxing/browser](https://github.com/zxing-js/browser) |
| Exchange rates | [Frankfurter API](https://www.frankfurter.app/) |
| Deployment | Vercel |
| Storage | Browser `localStorage` (no backend) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm / yarn / pnpm / bun

### Install & Run

```bash
git clone https://github.com/himlamlolz/jp-shopping-intel.git
cd jp-shopping-intel
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

---

## 📦 Supported Platforms

| Platform | URL detection | Status |
|---|---|---|
| Mercari Japan | `jp.mercari.com` | ✅ |
| Yahoo! Auctions | `yahoo.co.jp` | ✅ |
| Suruga-ya | `suruga-ya.jp` | ✅ |
| Melonbooks | `melonbooks.co.jp` | ✅ |
| Toranoana | `toranoana.jp` | ✅ |
| Amazon Japan | `amazon.co.jp` | ✅ |
| Twitter / X | `twitter.com` / `x.com` | ✅ |
| Other | — | ✅ (manual) |

---

## 🗂️ Data Model

### WishlistItem

```typescript
{
  id: string
  title: string
  titleJa?: string
  price: number          // JPY
  priceConverted?: number
  currency: string
  sourceUrl?: string
  sourcePlatform: 'mercari' | 'yahoo_auctions' | 'surugaya' | 'melonbooks' | 'toranoana' | 'amazon_jp' | 'twitter' | 'other'
  screenshotUrl?: string
  status: 'watching' | 'bid_placed' | 'purchased' | 'arrived' | 'passed'
  priority: 'low' | 'medium' | 'high'
  priceCeiling?: number
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  tags: string[]
  notes?: string
  seller?: string
  listingId?: string
  createdAt: Date
  updatedAt: Date
  releaseDate?: Date     // for calendar page — set a pre-order or expected ship date
  realWorldCapture?: {
    photoUrl?: string
    janCode?: string
    ocrRawText?: string
    captureLocation?: string
    capturedAt: Date
  }
}
```

### InterestProfile

```typescript
{
  id: string
  keywords: { en?: string; ja?: string }[]
  franchises: string[]
  platforms: string[]
  preferredCurrency: string
  proxyServiceFee: number              // JPY fixed fee
  internationalShippingEstimate: number  // JPY
}
```

---

## 🔒 Privacy

All data is stored exclusively in your browser's `localStorage`. No account, no server, no analytics. Your Google Vision API key (if set) is only sent directly to Google's Cloud Vision API and is never proxied through any third-party server.

---

## 📄 License

[MIT](LICENSE)
