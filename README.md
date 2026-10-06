<p align="center">
  <img src="tools/assets/brand-logo-main.png" alt="Ride Bangla Limited" width="420">
</p>

<h1 align="center">Ride Bangla Tools</h1>

<p align="center">
  <b>31 free online tools. No signup. No hidden fees. Your files never leave your browser.</b><br>
  PDF · Image · Calculator · Converter · Text · SEO · Developer · QR · Date & Time · Finance · Career
</p>

<p align="center">
  <a href="https://tools.ridebangla.bd"><img alt="Live site" src="https://img.shields.io/badge/live%20site-tools.ridebangla.bd-0E7A3B?style=for-the-badge"></a>
  <img alt="Tools" src="https://img.shields.io/badge/31-free%20tools-0E7A3B?style=for-the-badge">
  <img alt="Backend" src="https://img.shields.io/badge/backend-none%20needed-0B3D24?style=for-the-badge">
  <img alt="Signup" src="https://img.shields.io/badge/sign%20up-not%20required-F5B301?style=for-the-badge">
</p>

<p align="center">
  <a href="https://tools.ridebangla.bd"><b>tools.ridebangla.bd</b></a> ·
  <a href="https://ridebangla.bd">ridebangla.bd</a> ·
  <a href="https://it.ridebangla.bd">it.ridebangla.bd</a>
</p>

---

## 📖 About

**Ride Bangla Tools** is a companion product of [Ride Bangla Limited](https://ridebangla.bd) — Bangladesh's super-app for ride-sharing, food delivery, courier and digital services.

This is a standalone toolbox of **31 single-purpose utilities**: merge a PDF, convert iPhone HEIC photos, remove image backgrounds, build an ATS-friendly CV, calculate mortgage payments, generate QR codes, wipe hidden metadata — and much more.

There is **no account system, no database and no backend server**. It is a 100% static site — every calculation, conversion and file edit happens with plain JavaScript inside the visitor's own browser. Files are never uploaded anywhere.

---

## 🎨 Brand Identity

| Color | Hex | Usage |
|---|---|---|
| 🟩 Deep Emerald | `#0B3D24` | Primary background, brand base |
| 🟢 Ride Green | `#0E7A3B` | Primary actions, accents |
| 🟥 Ride Red | `#E63B2E` | Logo, alerts, energy |
| 🟧 Tagline Orange | `#F97316` | "Ride. Food. Delivery. Courier." bar |
| 🟨 Gold | `#F5B301` | Highlights, badges, premium accents |

**Typography:** system font stack (fast, no webfont download) · **Logo:** `tools/assets/brand-logo-main.png` (transparent)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Markup | Semantic HTML5 |
| Styling | Hand-written CSS3 (no framework — `tools/assets/style.css`) |
| Logic | Vanilla JavaScript (no build step, no bundler) |
| i18n | JSON dictionaries (`tools/assets/i18n/{en,bn,zh}.json`) — English, বাংলা, 中文 |
| PDF engine | [pdf-lib](https://pdf-lib.js.org) via CDN |
| Video engine | [ffmpeg.wasm](https://ffmpegwasm.netlify.app) single-threaded (`core-st`) |
| EXIF reader | [exifr](https://github.com/MikeKovarik/exifr) via CDN |
| QR codes | [qrcode](https://github.com/soldair/node-qrcode) via CDN |
| HEIC convert | [heic2any](https://github.com/alexcorvi/heic2any) via CDN |
| Background removal | [@imgly/background-removal](https://github.com/imgly/background-removal-js) |
| Deploy | GitHub Actions → static hosting (see `.github/workflows/eas-build.yml`) |
| Ads | Adsterra (site-wide, `tools/assets/ads-sitewide.js`) — **do not remove** |

---

## 🧰 All 31 Tools

### 📄 PDF Tools (`tools/pdf/`)
| Tool | What it does |
|---|---|
| [Merge PDF](https://tools.ridebangla.bd/pdf/merge-pdf.html) | Combine multiple PDFs, reorder & remove pages |
| [Image to PDF](https://tools.ridebangla.bd/pdf/image-to-pdf.html) | Convert JPG/PNG/WebP images into a PDF |
| [Text to PDF](https://tools.ridebangla.bd/pdf/text-to-pdf.html) | Turn plain text into a downloadable PDF |

### 🖼️ Image Tools (`tools/image/`)
| Tool | What it does |
|---|---|
| [Background Remover](https://tools.ridebangla.bd/image/background-remover.html) | AI background removal, 100% in-browser |
| [HEIC to JPG](https://tools.ridebangla.bd/image/heic-to-jpg.html) | Convert iPhone HEIC/HEIF photos to JPG |
| [Image Compressor](https://tools.ridebangla.bd/image/image-compressor.html) | Shrink photo file size with quality control |
| [Image Resizer](https://tools.ridebangla.bd/image/image-resizer.html) | Resize by pixels or percentage |
| [Image to Base64](https://tools.ridebangla.bd/image/image-to-base64.html) | Encode any image as a Base64 data URI |
| [Metadata Remover](https://tools.ridebangla.bd/image/metadata-remover.html) | Strip EXIF/GPS from photos, metadata from video & PDF |
| [Photo Editor](https://tools.ridebangla.bd/image/photo-editor.html) | Brightness, contrast, filters & rotate |

### 🧮 Calculators (`tools/calculator/`)
| Tool | What it does |
|---|---|
| [BMI Calculator](https://tools.ridebangla.bd/calculator/bmi-calculator.html) | Body Mass Index with WHO categories |
| [Percentage Calculator](https://tools.ridebangla.bd/calculator/percentage-calculator.html) | Percentages, increases & decreases |

### 🔄 Converters (`tools/converter/`)
| Tool | What it does |
|---|---|
| [Unit Converter](https://tools.ridebangla.bd/converter/unit-converter.html) | Length, weight, temperature, speed, volume |
| [Number Base Converter](https://tools.ridebangla.bd/converter/base-converter.html) | Binary ⇄ octal ⇄ decimal ⇄ hexadecimal |

### ✍️ Text Tools (`tools/text/`)
| Tool | What it does |
|---|---|
| [Word Counter](https://tools.ridebangla.bd/text/word-counter.html) | Words, characters, sentences & reading time |
| [Case Converter](https://tools.ridebangla.bd/text/case-converter.html) | UPPER, lower, Title, Sentence & more |
| [Lorem Ipsum Generator](https://tools.ridebangla.bd/text/lorem-ipsum-generator.html) | Placeholder text for designs |

### 🔍 SEO Tools (`tools/seo/`)
| Tool | What it does |
|---|---|
| [Meta Tag Generator](https://tools.ridebangla.bd/seo/meta-tag-generator.html) | SEO + Open Graph + Twitter Card tags |
| [Slug Generator](https://tools.ridebangla.bd/seo/slug-generator.html) | URL-friendly slugs from any title |

### 💻 Developer Tools (`tools/developer/`)
| Tool | What it does |
|---|---|
| [Password Generator](https://tools.ridebangla.bd/developer/password-generator.html) | Strong random passwords, custom rules |
| [JSON Formatter](https://tools.ridebangla.bd/developer/json-formatter.html) | Validate, pretty-print & minify JSON |
| [Color Converter](https://tools.ridebangla.bd/developer/color-converter.html) | HEX ⇄ RGB ⇄ HSL with live preview |

### 📱 QR Tools (`tools/qr/`)
| Tool | What it does |
|---|---|
| [QR Code Generator](https://tools.ridebangla.bd/qr/qr-code-generator.html) | QR codes for links, text & contacts |
| [Wi-Fi QR Generator](https://tools.ridebangla.bd/qr/wifi-qr-generator.html) | Join Wi-Fi by scanning — no typing passwords |

### 📅 Date & Time (`tools/date-time/`)
| Tool | What it does |
|---|---|
| [Age Calculator](https://tools.ridebangla.bd/date-time/age-calculator.html) | Exact age in years, months & days |
| [Date Difference](https://tools.ridebangla.bd/date-time/date-difference-calculator.html) | Days/weeks/months between two dates |

### 💰 Finance Tools (`tools/finance/`)
| Tool | What it does |
|---|---|
| [Mortgage Calculator](https://tools.ridebangla.bd/finance/mortgage-calculator.html) | Monthly payment with tax & insurance (US) |
| [Compound Interest](https://tools.ridebangla.bd/finance/compound-interest-calculator.html) | Growth with monthly contributions |
| [Loan EMI Calculator](https://tools.ridebangla.bd/finance/loan-emi-calculator.html) | Monthly instalment + full breakdown |
| [Simple Interest](https://tools.ridebangla.bd/finance/simple-interest-calculator.html) | Interest & total payable |

### 💼 Career (`tools/career/`)
| Tool | What it does |
|---|---|
| [CV & Cover Letter Builder](https://tools.ridebangla.bd/career/cv-cover-letter-builder.html) | ATS-friendly CV + cover letter, A4/US Letter, PDF export |

---

## 📁 Project Structure

```
Ride-Bangla-Tools-main/
├── README.md                      ← you are here
└── tools/                         ← deploy this folder as the web root
    ├── index.html                 ← homepage (hero video + tool grid + slider)
    ├── about.html / privacy.html
    ├── sitemap.xml / robots.txt / vercel.json
    ├── assets/
    │   ├── style.css / main.js / i18n.js
    │   ├── i18n/{en,bn,zh}.json   ← translations
    │   ├── brand-logo-main.png    ← official transparent logo
    │   ├── hero-video.mp4         ← homepage hero video
    │   ├── slides/                ← homepage service slider images
    │   └── ads-sitewide.js        ← ⚠️ do not remove
    ├── pdf/ image/ calculator/ converter/
    ├── text/ seo/ developer/ qr/
    └── date-time/ finance/ career/
```

---

## 🚀 Deployment

1. Upload the **`tools/`** folder contents to your static host as the web root
   (or push this repo — the GitHub Actions workflow in
   `.github/workflows/eas-build.yml` extracts the ZIP and deploys `tools/` automatically).
2. No build step. No environment variables. No server.

---

## 🌍 SEO & Languages

- Every page: `<title>`, meta description, canonical URL, Open Graph, Twitter Card
- Structured data: `BreadcrumbList` + `SoftwareApplication` + `FAQPage` JSON-LD
- `sitemap.xml` + `robots.txt` included
- UI translated (English / বাংলা / 中文, auto-detected from browser language)

---

## 📜 License

© Ride Bangla Limited — [ridebangla.bd](https://ridebangla.bd) · [it.ridebangla.bd](https://it.ridebangla.bd)
