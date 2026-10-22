<p align="center">
  <img src="tools/assets/brand-logo-main.png" alt="Ride Bangla Limited" width="420">
</p>

<h1 align="center">Ride Bangla Tools</h1>

<h3 align="center">
  67 free online tools that run entirely in your browser
</h3>

<p align="center">
  <strong>No signup • No hidden fees • Your files never leave your device</strong>
</p>

<p align="center">
  PDF · Image · QR · Finance · Developer · Text · Calculator · Converter · Date &amp; Time · SEO · Business · Career
</p>

<p align="center">
  <a href="https://tools.ridebangla.bd"><img alt="Live site" src="https://img.shields.io/badge/live%20site-tools.ridebangla.bd-0E7A3B?style=for-the-badge"></a>
  <img alt="Tools" src="https://img.shields.io/badge/67-free%20tools-0E7A3B?style=for-the-badge">
  <img alt="Backend" src="https://img.shields.io/badge/files%20processed-in%20browser-0B3D24?style=for-the-badge">
  <img alt="Signup" src="https://img.shields.io/badge/sign%20up-not%20required-F5B301?style=for-the-badge">
  <img alt="License" src="https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge">
</p>

<p align="center">
  <a href="https://tools.ridebangla.bd"><b>tools.ridebangla.bd</b></a> ·
  <a href="https://ridebangla.bd">ridebangla.bd</a> ·
  <a href="https://it.ridebangla.bd">it.ridebangla.bd</a>
</p>

<p align="center">
  <img src="tools/assets/readme-hero.jpg" alt="Ride Bangla Tools — Free • Unlimited • Always for You" width="880">
</p>

---

## 📖 About

**Ride Bangla Tools** is a product of [Ride Bangla Limited](https://ridebangla.bd). It is a standalone toolbox of **67 single-purpose utilities** — edit a PDF in place, merge or split PDFs, convert iPhone HEIC photos, remove image backgrounds, strip hidden metadata, build a CV, calculate a loan EMI, generate designer QR codes, and much more.

There is **no account system and no database**. Every tool runs with JavaScript inside the visitor's own browser — files are never uploaded to a server. The only server-side pieces are two small Vercel functions: an AI proxy (provider keys stay server-side) and a hardened URL-shortener proxy.

Every tool also carries a built-in **AI assistant** (styled in-panel helper), and the site-wide help is the Ride Bangla AI Agent widget — there is no separate help system.

---

## ✅ Status at a glance

_Last full audit: **Re-Audit #2, 22 October 2026** — every tool exercised end-to-end in a real browser with real inputs and outputs._

### Done and verified

- **All 67 tools pass a full functional test** — real inputs, exact outputs (calculators checked to the cent/decimal, converters exact, PDF tools produce real documents, QR generator→reader round-trip decodes).
- **PDF Editor rebuilt (v4)** — tap-to-edit lands exactly on the tapped text at any zoom/pan, the page fits and centres on a phone screen, view restores exactly after editing, ink-true colour sampling. Verified on two phone profiles in a real browser engine.
- **QR designer rebuilt (v4)** — 18 designs; the 15 picture designs are formed by the QR's own modules (the code itself becomes the tiger, kite, bird, …). Every design machine-decode-verified across payload types and degraded renders (downscale/blur/dim). Designs that could not truly convert were removed.
- **In-tool AI on all 67 tools** — opens a styled panel everywhere; never an alert, never raw markdown.
- **Security pass** — both API functions' guards exercised (rate limits, origin allowlist, SSRF/shortener blocklists, input caps): 13/13 pass. XSS live-fire probes on all user-input rendering sinks: clean (escape-first rendering everywhere, including the AI panel).
- **SEO pass** — sitemap matches the real page set 84/84; title/description/canonical/Open Graph/Twitter Card/JSON-LD on every page; the one stale tool count on the site corrected to 67.
- **Languages** — English is the default and renders pure on every page; a 16-language switcher covers the site chrome on all pages.

### Open / remaining

- **Deployment queue:** the three Re-Audit #2 commits (PDF Editor v4, QR v4, SEO/factual) are on `main` and read-back verified; Vercel deployment was cap-queued at audit time — live re-verification follows deployment.
- **Physical phone QR scanning:** machine-decode matrix is complete, but scanning the picture QRs with a real phone camera is **UNVERIFIED** — the owner scans with his own phone.
- **Bengali coverage:** 30 of 67 tool pages translate their headline/UI to বাংলা; the remaining 37 are English-only for now (chrome/navigation translates on all pages).
- **Genuine HEIC conversion:** verified for file handling and error paths; a conversion of a real .heic file is to be confirmed on the live site.
- **Cleanup candidates:** five unreferenced logo/icon variants (~1.07 MB) identified with zero-reference evidence and kept pending the owner's decision (see the audit log).

---

## 🧰 All 67 Tools

### 📄 PDF Tools (6)

| Tool | What it does |
|---|---|
| [PDF Editor](https://tools.ridebangla.bd/pdf/pdf-editor.html) | Tap any text to edit it in place; replace, move or delete images; add text and a signature; fill forms; reorder, rotate or delete pages |
| [Merge PDF](https://tools.ridebangla.bd/pdf/merge-pdf.html) | Combine two or more PDFs into one document, in any order |
| [Split PDF](https://tools.ridebangla.bd/pdf/split-pdf.html) | Extract a range of pages from a PDF into a new file |
| [Rotate PDF](https://tools.ridebangla.bd/pdf/rotate-pdf.html) | Rotate every page of a PDF by 90, 180 or 270 degrees |
| [Image to PDF](https://tools.ridebangla.bd/pdf/image-to-pdf.html) | Combine JPG/PNG images into a single clean PDF |
| [Text to PDF](https://tools.ridebangla.bd/pdf/text-to-pdf.html) | Paste text and download a clean, ready-to-share PDF |

### 🖼️ Image Tools (13)

| Tool | What it does |
|---|---|
| [Background Remover](https://tools.ridebangla.bd/image/background-remover.html) | Remove a photo's background automatically, in the browser |
| [Photo Editor](https://tools.ridebangla.bd/image/photo-editor.html) | Brightness, contrast, saturation, filters, rotate and flip — live |
| [Image Compressor](https://tools.ridebangla.bd/image/image-compressor.html) | Shrink JPG/PNG file size with quality and dimension controls |
| [Image Resizer](https://tools.ridebangla.bd/image/image-resizer.html) | Resize a photo to an exact width and height in pixels |
| [Image Cropper](https://tools.ridebangla.bd/image/image-cropper.html) | Drag a crop box, lock an aspect ratio, download the crop |
| [Image Format Converter](https://tools.ridebangla.bd/image/image-format-converter.html) | Convert between PNG, JPG and WebP with quality control |
| [Image to Base64](https://tools.ridebangla.bd/image/image-to-base64.html) | Turn an image into a ready-to-paste Base64 data URI |
| [Image Watermark](https://tools.ridebangla.bd/image/image-watermark.html) | Add a text watermark and download the result |
| [Metadata Remover](https://tools.ridebangla.bd/image/metadata-remover.html) | Strip EXIF/GPS from photos and metadata from video & PDF |
| [HEIC to JPG](https://tools.ridebangla.bd/image/heic-to-jpg.html) | Convert iPhone HEIC/HEIF photos to universal JPG |
| [Favicon Generator](https://tools.ridebangla.bd/image/favicon-generator.html) | Turn an image into favicon.ico and PNG app icons |
| [Color Palette Generator](https://tools.ridebangla.bd/image/color-palette-generator.html) | Build colour schemes from a base colour; copy hex or download |
| [YouTube Thumbnail Downloader](https://tools.ridebangla.bd/image/youtube-thumbnail-downloader.html) | Grab a video's thumbnail in Full HD, SD or HQ |

### 📱 QR Tools (6)

| Tool | What it does |
|---|---|
| [QR Code Generator](https://tools.ridebangla.bd/qr/qr-code-generator.html) | Links, text and more in 18 designer styles — including picture QRs formed by the code itself — plus your own logo |
| [Payment QR Generator](https://tools.ridebangla.bd/qr/payment-qr-generator.html) | Scannable QR for bKash, Nagad, Rocket, bank or custom payment details, with brand badges |
| [QR Code Reader](https://tools.ridebangla.bd/qr/qr-code-reader.html) | Decode a QR from camera or an uploaded photo |
| [Wi-Fi QR Generator](https://tools.ridebangla.bd/qr/wifi-qr-generator.html) | Guests join your Wi-Fi with a single scan |
| [vCard QR Generator](https://tools.ridebangla.bd/qr/vcard-qr-generator.html) | A QR that saves your contact details when scanned |
| [Barcode Generator](https://tools.ridebangla.bd/qr/barcode-generator.html) | Code 128 barcodes from any text; download as SVG or PNG |

### 💰 Finance Tools (7)

| Tool | What it does |
|---|---|
| [Loan EMI Calculator](https://tools.ridebangla.bd/finance/loan-emi-calculator.html) | Monthly EMI, total payable and total interest |
| [Mortgage Calculator](https://tools.ridebangla.bd/finance/mortgage-calculator.html) | Monthly payment incl. principal, interest, tax and insurance |
| [Compound Interest Calculator](https://tools.ridebangla.bd/finance/compound-interest-calculator.html) | Savings growth with monthly contributions over time |
| [Simple Interest Calculator](https://tools.ridebangla.bd/finance/simple-interest-calculator.html) | Interest and total payable in one go |
| [Discount Calculator](https://tools.ridebangla.bd/finance/discount-calculator.html) | Sale price and savings from a price and discount % |
| [Tip Calculator](https://tools.ridebangla.bd/finance/tip-calculator.html) | Tip and split the bill between friends, any currency |
| [Zakat Calculator](https://tools.ridebangla.bd/finance/zakat-calculator.html) | Zakat at 2.5% of net zakatable assets above nisab |

### 💻 Developer Tools (11)

| Tool | What it does |
|---|---|
| [JSON Formatter](https://tools.ridebangla.bd/developer/json-formatter.html) | Validate, pretty-print and minify JSON |
| [Password Generator](https://tools.ridebangla.bd/developer/password-generator.html) | Strong random passwords with length and character rules |
| [UUID Generator](https://tools.ridebangla.bd/developer/uuid-generator.html) | Cryptographically random UUID v4 — one or a hundred at a time |
| [JWT Decoder](https://tools.ridebangla.bd/developer/jwt-decoder.html) | Read a token's header and payload (no signature verification) |
| [Markdown to HTML](https://tools.ridebangla.bd/developer/markdown-to-html.html) | Live markdown preview and clean HTML output |
| [CSS Minifier](https://tools.ridebangla.bd/developer/css-minifier.html) | Minify CSS with exact byte savings |
| [CSV ⇄ JSON Converter](https://tools.ridebangla.bd/developer/csv-json-converter.html) | Convert both ways, with proper quote/comma handling |
| [URL Encoder / Decoder](https://tools.ridebangla.bd/developer/url-encoder-decoder.html) | Percent-encode or decode URL strings |
| [Regex Tester](https://tools.ridebangla.bd/developer/regex-tester.html) | Test a regular expression and see every match |
| [Text Diff Checker](https://tools.ridebangla.bd/developer/text-diff-checker.html) | Line-by-line differences between two texts |
| [Color Converter](https://tools.ridebangla.bd/developer/color-converter.html) | HEX ⇄ RGB ⇄ HSL with a live swatch preview |

### ✍️ Text Tools (6)

| Tool | What it does |
|---|---|
| [Word Counter](https://tools.ridebangla.bd/text/word-counter.html) | Words, characters, sentences, paragraphs and reading time |
| [Case Converter](https://tools.ridebangla.bd/text/case-converter.html) | UPPER, lower, Title, Sentence, aLtErNaTiNg and iNVERSE case |
| [Base64 Encoder / Decoder](https://tools.ridebangla.bd/text/base64-encoder-decoder.html) | Text ⇄ Base64 with full Unicode support |
| [Remove Duplicate Lines](https://tools.ridebangla.bd/text/remove-duplicate-lines.html) | Remove repeated lines, keeping the first copy |
| [Lorem Ipsum Generator](https://tools.ridebangla.bd/text/lorem-ipsum-generator.html) | Paragraphs, sentences or word lists in one click |
| [Text to Speech](https://tools.ridebangla.bd/text/text-to-speech.html) | Spoken audio with voice, speed and pitch controls |

### 🧮 Calculators (2)

| Tool | What it does |
|---|---|
| [BMI Calculator](https://tools.ridebangla.bd/calculator/bmi-calculator.html) | BMI instantly, mapped to the standard WHO categories |
| [Percentage Calculator](https://tools.ridebangla.bd/calculator/percentage-calculator.html) | X% of a number, or one number as a % of another |

### 🔄 Converters (2)

| Tool | What it does |
|---|---|
| [Unit Converter](https://tools.ridebangla.bd/converter/unit-converter.html) | Length, weight, temperature, speed, volume and more |
| [Number Base Converter](https://tools.ridebangla.bd/converter/base-converter.html) | Binary ⇄ octal ⇄ decimal ⇄ hexadecimal in one click |

### 📅 Date & Time (6)

| Tool | What it does |
|---|---|
| [Age Calculator](https://tools.ridebangla.bd/date-time/age-calculator.html) | Precise age in years, months and days |
| [Date Difference Calculator](https://tools.ridebangla.bd/date-time/date-difference-calculator.html) | Exact days, weeks and months between two dates |
| [Countdown Timer](https://tools.ridebangla.bd/date-time/countdown-timer.html) | A countdown in minutes and seconds |
| [Military Time Converter](https://tools.ridebangla.bd/date-time/military-time-converter.html) | 24-hour ⇄ 12-hour AM/PM, both directions |
| [Time Zone Converter](https://tools.ridebangla.bd/date-time/time-zone-converter.html) | Convert a date/time between any two world zones |
| [Timestamp Converter](https://tools.ridebangla.bd/date-time/timestamp-converter.html) | Unix timestamps ⇄ readable dates |

### 🔍 SEO Tools (3)

| Tool | What it does |
|---|---|
| [Meta Tag Generator](https://tools.ridebangla.bd/seo/meta-tag-generator.html) | Title, meta description and Open Graph block for your page head |
| [Slug Generator](https://tools.ridebangla.bd/seo/slug-generator.html) | Clean, lowercase, hyphen-separated URL slugs from any title |
| [URL Shortener](https://tools.ridebangla.bd/seo/url-shortener.html) | Short, clean links via a hardened same-origin proxy |

### 💼 Business Tools (4)

| Tool | What it does |
|---|---|
| [Invoice Generator](https://tools.ridebangla.bd/business/invoice-generator.html) | Professional invoices with line items, tax and discount — PDF download |
| [Quotation Generator](https://tools.ridebangla.bd/business/quotation-generator.html) | Polished price quotes with a validity period — PDF download |
| [Business Name Generator](https://tools.ridebangla.bd/business/business-name-generator.html) | Brandable name ideas with domain-style spellings |
| [Freelance Rate Calculator](https://tools.ridebangla.bd/business/freelance-rate-calculator.html) | Hourly, daily and project rates from your income goal, tax and expenses |

### 🎓 Career (1)

| Tool | What it does |
|---|---|
| [CV & Cover Letter Builder](https://tools.ridebangla.bd/career/cv-cover-letter-builder.html) | Fill in your details once; download a clean CV and matching cover letter as PDF |

---

## 🎨 Brand Identity

| Color | Hex | Usage |
|---|---|---|
| 🟩 Deep Emerald | `#0B3D24` | Primary background, brand base |
| 🟢 Ride Green | `#0E7A3B` | Primary actions, accents |
| 🟥 Ride Red | `#E63B2E` | Logo, alerts, energy |
| 🟨 Gold | `#F5B301` | Highlights, badges, premium accents |

**Typography:** Space Grotesk (headings) + IBM Plex Mono accents, system-stack fallback · **Logo:** `tools/assets/brand-logo-main.png` (transparent) · **Tools mark:** `tools/assets/tools-logo-mark.png`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Markup / styling | Semantic HTML5, hand-written CSS3 (`tools/assets/style.css`) — no framework, no build step |
| Logic | Vanilla JavaScript |
| PDF | pdf-lib + pdf.js (bundled in `tools/assets/`), rendered and edited fully client-side |
| Image | Canvas APIs; @imgly/background-removal (background remover); heic2any via CDN with fallback (HEIC); exifr via CDN (metadata view); ffmpeg.wasm (video metadata) |
| QR / barcode | Local engines (`tools/assets/qr-designs.js`, `qr-studio.js`, jsQR for reading, JsBarcode) |
| In-tool AI | `tools/assets/ai.js` → same-origin `/api/ai` proxy (Groq → Gemini chain; keys only in Vercel env) |
| Help | The Ride Bangla AI Agent widget on every page (the only help system) |
| Serverless | Vercel functions: `tools/api/ai.js`, `tools/api/shorten.js` (rate-limited, origin-allowlisted) |
| i18n | JSON dictionaries, 16 languages (`tools/assets/i18n/`) — English default |
| Deploy | Vercel, web root = `tools/` (see `tools/vercel.json`) |
| Ads | Adsterra (site-wide, `tools/assets/ads-sitewide.js`) — **do not remove** |

---

## 📁 Project Structure

```
Ride-Bangla-Tools/
├── README.md                      ← you are here
├── LICENSE / SECURITY.md / CODE_OF_CONDUCT.md / CONTRIBUTING.md
└── tools/                         ← web root (deploy this folder)
    ├── index.html                 ← homepage (hero video + tool grid + reviews)
    ├── about.html / privacy.html / terms.html / help-center.html
    ├── sitemap.xml / robots.txt / vercel.json / sw.js
    ├── api/                       ← ai.js (AI proxy) · shorten.js (shortener proxy)
    ├── assets/
    │   ├── style.css / main.js / ai.js / i18n.js
    │   ├── i18n/*.json            ← 16 language dictionaries
    │   ├── qr-designs.js / qr-studio.js
    │   ├── pdf-lib.min.js / pdf.min.js / pdf.worker.min.js
    │   ├── jsqr.min.js / jsbarcode.min.js / bizpdf.js / reviews.js
    │   ├── brand-logo-main.png / tools-logo-mark.png / tools-logo-text.png
    │   ├── hero-video.mp4 / hero-poster.jpg
    │   └── ads-sitewide.js        ← ⚠️ do not remove
    └── pdf/ image/ qr/ finance/ developer/ text/
        calculator/ converter/ date-time/ seo/ business/ career/
```

---

## 🌍 SEO & Languages

- Every page: `<title>`, meta description, canonical URL, Open Graph, Twitter Card
- Structured data: `BreadcrumbList` + `FAQPage` JSON-LD
- `sitemap.xml` lists all 84 pages; `robots.txt` open to all crawlers
- 16 UI languages via the header switcher; English is the default; choice persists per visitor

---

## 📜 License

Proprietary — © Ride Bangla Limited. See [LICENSE](LICENSE).

[ridebangla.bd](https://ridebangla.bd) · [it.ridebangla.bd](https://it.ridebangla.bd) · [tools.ridebangla.bd](https://tools.ridebangla.bd)
