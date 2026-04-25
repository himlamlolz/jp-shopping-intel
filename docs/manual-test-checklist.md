# Manual Test Checklist — JP Shopping Intel

> **How to use:** Work through each feature section in the running app. Tick each checkbox as you verify the step. All tests assume a modern browser (Chrome recommended for DevTools and barcode scanning).

---

## Feature: Wishlist — Add, Edit, Delete, Status Change

**Setup:** App is running. Wishlist may be empty to start.

**Steps:**
- [ ] 1. Navigate to `/add`. Fill in a title, price, platform, and at least one tag. Click **Save**.
- [ ] 2. Navigate to `/wishlist`. Verify the new item appears at the top of the list with the correct title and price.
- [ ] 3. Click the item's **Edit** button. Change the title and price. Click **Save**.
- [ ] 4. Verify the updated title and price are shown in the wishlist.
- [ ] 5. Use the status dropdown (or badge) on the item to change status from *watching* → *purchased* → *arrived*.
- [ ] 6. Verify the status badge updates after each change.
- [ ] 7. Click the item's **Delete** button. Confirm the deletion prompt.
- [ ] 8. Verify the item no longer appears in the wishlist.

**Expected result:** Items can be created, read, updated (fields and status), and deleted without page refreshes causing data loss.

---

## Feature: OCR Import

**Setup:** Have a screenshot of a Japanese product listing saved locally (JPEG or PNG). Optionally have a Google Vision API key ready in Settings.

### Tesseract path (no API key)

**Steps:**
- [ ] 1. Navigate to `/add` and select the **OCR / Screenshot** tab.
- [ ] 2. Ensure no Vision API key is set (Settings → Vision API Key field is empty).
- [ ] 3. Drop (or select via file picker) a product screenshot onto the import area.
- [ ] 4. Wait for Tesseract.js to process the image (progress indicator should appear).
- [ ] 5. Verify that extracted fields (title, price, listing ID) are pre-filled in the form.
- [ ] 6. Click **Save** and confirm the item appears in the wishlist.

### Google Vision path (with API key)

**Steps:**
- [ ] 7. Navigate to `/settings` and enter a valid Google Vision API key. Save it.
- [ ] 8. Return to `/add` → **OCR / Screenshot** tab and import the same screenshot.
- [ ] 9. Verify the extraction uses the Vision API (network request to `/api/ocr` visible in DevTools).
- [ ] 10. Verify extracted fields are at least as accurate as the Tesseract result.

**Expected result:** Both OCR paths populate the add-item form with extracted data from the screenshot.

---

## Feature: Barcode / JAN Scanner

**Setup:** Physical product with a JAN barcode available, or a barcode image on screen. Browser must support `getUserMedia` for camera access.

### Camera scan

**Steps:**
- [ ] 1. Navigate to `/scan`.
- [ ] 2. Grant camera permission when the browser prompts.
- [ ] 3. Point the camera at a JAN barcode until it is detected.
- [ ] 4. Verify the detected JAN code is displayed on screen.
- [ ] 5. Verify search links for Amazon JP, Mercari, Yahoo Shopping, etc. appear below the JAN code.

### File-picker fallback

**Steps:**
- [ ] 6. On the `/scan` page, click **Upload image** (or equivalent fallback button).
- [ ] 7. Select a file containing a visible barcode.
- [ ] 8. Verify the JAN code is extracted and search links are generated.

**Expected result:** Both the live camera and file-picker paths detect the barcode and produce working search links.

---

## Feature: Cross-Platform Search

**Setup:** At least one wishlist item exists with a known JAN code or a title.

**Steps:**
- [ ] 1. Open a wishlist item's detail or edit view.
- [ ] 2. Locate the **Find on other platforms** panel.
- [ ] 3. Verify the **JAN-based links** section shows clickable links for Amazon JP, Mercari, Yahoo Shopping, Suruga-ya, and Rakuten (only shown when a JAN code is present).
- [ ] 4. Verify the **title-based links** section shows links using the item's title as a search keyword.
- [ ] 5. Click one JAN-based link and confirm it opens the correct storefront with the JAN code in the URL.
- [ ] 6. Click one title-based link and confirm it opens the correct storefront with the title in the URL.

**Expected result:** Both JAN-based and title-based search link panels display correct, working URLs for each supported platform.

---

## Feature: Landed Cost Calculator

**Setup:** Navigate to `/calculator`.

**Steps:**
- [ ] 1. Enter an item price (e.g. ¥10,000).
- [ ] 2. Select the **Buyee** proxy preset. Verify the fixed fee (¥300) and percentage (5 %) fields auto-fill.
- [ ] 3. Enter a domestic shipping amount (e.g. ¥500) and an international shipping estimate (e.g. ¥2,000).
- [ ] 4. Verify the **Total landed cost** updates to reflect: item + domestic + Buyee fixed + Buyee 5 % + intl + credit-card fee.
- [ ] 5. Switch to the **Zenmarket** preset. Verify the percentage fee changes to 0 % and the total updates.
- [ ] 6. Switch to the **White Rabbit Express** preset. Verify fixed fee is ¥0 and percentage is 10 %.
- [ ] 7. Switch to **Custom**. Manually enter a fixed fee and percentage. Verify the total recalculates.
- [ ] 8. Set all extra costs to zero. Verify the total equals the item price alone.

**Expected result:** The calculator displays accurate totals for all built-in presets and for custom values.

---

## Feature: Currency Converter

**Setup:** App is running with an internet connection.

**Steps:**
- [ ] 1. Navigate to any page that shows the floating currency widget (e.g. Dashboard `/`).
- [ ] 2. Verify the currency widget is visible on the page.
- [ ] 3. Verify a JPY→preferred-currency rate is loaded (not "N/A" or an error).
- [ ] 4. Enter a JPY amount in the converter. Verify the output changes to reflect the conversion.
- [ ] 5. Go to `/settings` and change the preferred currency to a different value (e.g. EUR).
- [ ] 6. Return to the Dashboard and verify the widget shows EUR values.

**Expected result:** The currency widget loads live rates, converts amounts correctly, and respects the preferred-currency setting.

---

## Feature: Multi-Currency Dashboard

**Setup:** At least two wishlist items exist, one in JPY and one in another currency (e.g. USD). Preferred currency is set in Settings.

**Steps:**
- [ ] 1. Navigate to the Dashboard (`/`).
- [ ] 2. Locate the **Total spend** (or portfolio value) summary card.
- [ ] 3. Verify the total is displayed in both JPY and your preferred currency side by side (or below).
- [ ] 4. Change the preferred currency in Settings and return to the Dashboard.
- [ ] 5. Verify the secondary currency total updates to reflect the new preferred currency.

**Expected result:** The dashboard shows spend totals in both JPY and the user's preferred currency.

---

## Feature: Discovery Inbox

**Setup:** Navigate to `/discovery`.

**Steps:**
- [ ] 1. Verify a list of curated JP hobby accounts (Twitter/Instagram) is displayed.
- [ ] 2. Click **Follow** on one account. Verify the button changes state (e.g. "Following").
- [ ] 3. Click the **Import screenshot** button on a discovery item (or the inbox area).
- [ ] 4. Drop or select a product screenshot. Verify the OCR result is pre-filled.
- [ ] 5. Click **Add to wishlist** and confirm the item appears in `/wishlist`.
- [ ] 6. Return to `/discovery`. Find the discovery item and click **Dismiss**.
- [ ] 7. Verify the dismissed item moves out of the *Inbox* view.
- [ ] 8. Click **Snooze** on another item. Verify it shows a snoozed state (greyed out or moved to Snoozed tab).

**Expected result:** Discovery inbox shows curated accounts, supports screenshot import, and correctly handles dismiss and snooze actions.

---

## Feature: Spending Analytics

**Setup:** At least 3–5 wishlist items exist with varied statuses, platforms, and tags. Navigate to `/analytics`.

**Steps:**
- [ ] 1. Verify the **By Status** chart/section shows spend breakdown (Watching, Purchased, Arrived, etc.).
- [ ] 2. Verify the **By Platform** chart/section shows spend per storefront.
- [ ] 3. Verify the **By Tag** chart/section shows spend grouped by tags.
- [ ] 4. Verify the **Monthly spend** bar chart shows bars for months that have purchased items.
- [ ] 5. Add a new item with a different platform. Refresh `/analytics` and verify the platform breakdown updates.

**Expected result:** All four chart types (status, platform, tag, monthly) display accurate data derived from the current wishlist.

---

## Feature: Release Calendar

**Setup:** At least one wishlist item has a `releaseDate` set in the future, and at least one item has `status: 'arrived'` with a `releaseDate` in the past. Navigate to `/calendar`.

**Steps:**
- [ ] 1. Verify the current month grid is displayed.
- [ ] 2. Locate the day cell that matches the upcoming release date. Verify a purple indicator or label appears on that day.
- [ ] 3. Locate the day cell for the arrived item's release date. Verify a green indicator appears on that day.
- [ ] 4. Navigate to the next or previous month using the calendar controls. Verify the grid updates correctly.
- [ ] 5. Verify the **Upcoming releases** sidebar (if present) lists items in chronological order.

**Expected result:** The calendar displays upcoming release dates in purple and arrived items in green on the correct days.

---

## Feature: Interest Profile

**Setup:** Navigate to `/settings` (or the profile section).

**Steps:**
- [ ] 1. Add a new keyword pair (English + Japanese). Save.
- [ ] 2. Verify the keyword appears in the saved keywords list after saving.
- [ ] 3. Navigate to `/add` or `/scan`. Verify the OCR/search form shows suggestions or hints based on your saved keywords.
- [ ] 4. Check that a **Search URL preview** (or generated search link) includes one of your saved keywords or franchise tags.
- [ ] 5. Return to `/settings`. Remove the keyword added in step 1. Save.
- [ ] 6. Verify the keyword no longer appears in the list.

**Expected result:** Keywords and franchise tags saved in the Interest Profile influence search URL generation throughout the app.

---

## Feature: Data Export / Import

**Setup:** At least 2 wishlist items exist. Navigate to `/settings`.

### JSON round-trip (Overwrite)

**Steps:**
- [ ] 1. Click **Export JSON**. Verify a `.json` file downloads.
- [ ] 2. Open the file and confirm it contains an array of wishlist items with the expected fields.
- [ ] 3. Delete all wishlist items from `/wishlist` (or clear localStorage manually).
- [ ] 4. Return to `/settings`. Click **Import JSON**, select the exported file, and choose **Overwrite** mode.
- [ ] 5. Navigate to `/wishlist` and verify all original items are restored.

### JSON round-trip (Merge)

**Steps:**
- [ ] 6. Add one new item to the wishlist.
- [ ] 7. In `/settings`, import the previously exported JSON in **Merge** mode.
- [ ] 8. Verify the wishlist now contains both the new item and the re-imported items (no duplicates for items with the same ID).

### CSV download

**Steps:**
- [ ] 9. Click **Export CSV**. Verify a `.csv` file downloads.
- [ ] 10. Open the CSV and confirm the header row is `id,title,price,currency,status,priority,tags,sourcePlatform,createdAt`.
- [ ] 11. Confirm there is one data row per wishlist item.

**Expected result:** JSON export/import (both overwrite and merge) correctly preserves all wishlist data; CSV export produces a well-formed file.

---

## Feature: PWA / Installable

**Setup:** Open the app in Chrome (desktop or Android). The app must be served over HTTPS or localhost.

**Steps:**
- [ ] 1. Open Chrome DevTools → **Application** tab → **Manifest** section.
- [ ] 2. Verify the manifest loads without errors and shows the app name, icons, and `start_url`.
- [ ] 3. Check the **Service Workers** section. Verify a service worker is registered and active.
- [ ] 4. Look for the browser's **Install** icon in the address bar (or "Add to Home Screen" prompt on mobile).
- [ ] 5. Click **Install**. Verify the app opens as a standalone window (no browser chrome).
- [ ] 6. Disconnect from the internet. Reload the installed app. Verify it loads from cache (offline support).

**Expected result:** The manifest is valid, the service worker is active, the app is installable, and basic functionality is available offline.

---

## Feature: Dark Mode

**Setup:** App is running in a browser that supports `prefers-color-scheme`.

**Steps:**
- [ ] 1. Navigate to `/settings`.
- [ ] 2. Find the **Color Scheme** selector. Change it to **Dark**.
- [ ] 3. Verify every page (Dashboard, Wishlist, Calculator, Analytics, Calendar, Discovery, Settings) switches to a dark color palette immediately.
- [ ] 4. Change the color scheme to **Light**. Verify all pages switch to the light palette.
- [ ] 5. Change the color scheme to **System**. Verify the app follows the OS-level dark/light preference.
- [ ] 6. Reload the app and verify the chosen color scheme is persisted from localStorage.

**Expected result:** All pages correctly reflect the selected color scheme (dark/light/system), and the preference survives a page reload.

---

## Feature: 100% Local — No Unexpected Network Requests

**Setup:** App is running. Open Chrome DevTools → **Network** tab. Clear existing requests.

**Steps:**
- [ ] 1. Perform a typical user flow: add an item, view wishlist, open analytics, open calendar.
- [ ] 2. In the Network tab, filter by **XHR / Fetch**. Review all outbound requests.
- [ ] 3. Verify the **only** external network requests are:
    - `https://api.frankfurter.app/` — currency rate fetch (expected)
    - `https://vision.googleapis.com/` — only when Vision API key is set and OCR is triggered (expected)
- [ ] 4. Confirm there are **no** requests to analytics services, ad networks, telemetry endpoints, or any backend database.
- [ ] 5. Open DevTools → **Application** → **Local Storage**. Confirm all app data is stored under the `jp-shopping-intel:*` keys.

**Expected result:** All application data stays in `localStorage`. The only allowed external requests are the Frankfurter currency API and the optional Google Vision OCR API.
