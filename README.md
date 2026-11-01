<div align="center">

<img src="tools/assets/tools-logo-text.png" alt="Ride Bangla Tools logo" width="320">

# Ride Bangla Tools

**67 free online tools that run in your browser — PDF, image, QR, finance, developer, text and career utilities, with no sign-up and no file uploads.**

[![Live Website](https://img.shields.io/badge/Live_Website-tools.ridebangla.bd-0B3D2E?style=for-the-badge&logo=googlechrome&logoColor=white)](https://tools.ridebangla.bd)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://tools.ridebangla.bd)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://tools.ridebangla.bd)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://tools.ridebangla.bd)
[![PDF.js 3.11.174](https://img.shields.io/badge/PDF.js-3.11.174-FF6F00?style=for-the-badge)](https://tools.ridebangla.bd)
[![pdf-lib 1.17.1](https://img.shields.io/badge/pdf--lib-1.17.1-0B3D2E?style=for-the-badge)](https://tools.ridebangla.bd)
[![JsBarcode 3.11.6](https://img.shields.io/badge/JsBarcode-3.11.6-7C3AED?style=for-the-badge)](https://tools.ridebangla.bd)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://tools.ridebangla.bd)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge)](https://tools.ridebangla.bd)

<!-- MEDIA: hero-video-laptop — GENUINE LAPTOP-SCREEN VIDEO STILL OWED. No laptop video and no laptop GIF exists in this repository (the only demo GIF is a phone-screen capture and is never used here). Replace this placeholder with a real laptop-screen recording of a tool in use — see media-needs.md — and delete this comment when it lands. Nothing here is a substitute video. -->

*Hero video (laptop screen) — owed. Until a genuine laptop-screen recording is captured, this space stays empty rather than showing a phone video or a showcase scene as if it were a screen recording.*

</div>

> **Honest status — read before trusting any tool claim here.** All 67 tools are **UNVERIFIED by a live phone drive**: no claim in this README means "verified working live". A full code audit landed as **61 FIXED / 4 OK / 2 NEEDS-OWNER-INPUT** (see [Audit outcome](#-audit-outcome--live-verification-status)). The PDF Editor's v3 build **failed on the owner's own phone** (see [PDF Tools](#-pdf-tools--6-tools)); a deep v4 rework is owed in its proper slot and is **not** shipped here. Nothing below is called Sejda-like or fully working.

---

## About

**Ride Bangla Tools** is a product of **Ride Bangla Limited**. It is one toolbox of **67 single-purpose utilities** in 12 categories: edit, merge, split or rotate a PDF; remove an image background or strip its hidden metadata; convert an iPhone HEIC photo; build a CV and cover letter; calculate a loan EMI or zakat; generate a designer QR code; format JSON — and much more.

There is **no account system and no database**. Every tool runs with JavaScript inside the visitor's own browser, so files are never uploaded to a server. The only server-side pieces are two small Vercel functions: an AI proxy (provider keys stay server-side) and a URL-shortener proxy.

The site is styled in Tools' own design language — a deep-green (`#0B3D2E`) and vibrant-green palette with white surfaces, Space Grotesk headings and IBM Plex Mono labels — deliberately distinct from the main Ride Bangla website, while its header credits it as *“A Ride Bangla Product”*.

<img src="docs/screenshots/home-top-band-2026-11-01.png" alt="Ride Bangla Tools homepage top — fresh capture, 2026-11-01 (landscape band of the print render: header and hero video frame)" width="820">

---

## Features

### 📄 PDF Tools — 6 tools

Edit, merge, split and rotate PDFs, or create one from images or text — all locally in the browser, using PDF.js and pdf-lib.

<img src="docs/screenshots/tool-pdf-editor-band-2026-11-01.png" alt="PDF Editor — fresh capture, 2026-11-01 (landscape band of the print render): choose a PDF, edit it in the browser, then download the edited file" width="820">

- **PDF Editor** — tap text to change it, replace, move or delete images, add text and a signature, fill forms, reorder, rotate or delete pages, then download the edited PDF.
- **Merge PDF**, **Split PDF**, **Rotate PDF** (90° / 180° / 270°), **Image to PDF** and **Text to PDF**.

> **Honest status — PDF Editor v3 FAILED on the owner's phone.** His verdict: the page does not fit/centre on the phone screen (content overflows right), the text-edit box is NOT on the tapped text (it floats top-left, oversized, covering other text), and zoom behaves wrong (the tapped text must be edited exactly in its own place). A deep v4 rework — tap-to-edit accuracy at every zoom and pan state, and exact phone fit — is owed in its proper slot, verified against real zoom/pan states, not only static geometry. The screenshot above is the current (v3) live editor; v4's real-phone verification is still owed, so the editor is not presented here as perfect, working, or Sejda-like.

### 🖼️ Image Tools — 13 tools

Photo Editor, Background Remover, Image to Base64, Image Compressor, Image Resizer, Metadata Remover (strips EXIF/GPS from photos), HEIC to JPG, Image Format Converter (PNG / JPG / WebP), Image Cropper, Color Palette Generator, YouTube Thumbnail Downloader, Favicon Generator and Image Watermark.

### 📱 QR & Barcode Tools — 6 tools

<img src="docs/screenshots/tool-qr-generator-band-2026-11-01.png" alt="QR Code Generator with Logo — fresh capture, 2026-11-01 (landscape band of the print render): text or URL input, designer styles, and logo upload" width="820">

- **QR Code Generator** — links and text in **3 designer styles (Classic, Rounded, Sunset Fade)**, with your own logo placed on the code and an optional name label.
- **Payment QR Generator** — scannable QR for bKash, Nagad, Rocket, bank or custom payment details.
- **QR Code Reader** (camera or uploaded photo), **Wi-Fi QR Generator**, **vCard QR Generator** and **Barcode Generator** (Code 128, SVG or PNG).

The 15 motif designs (Tiger, Lion, Cat, Panda, Owl, Fox, Bird, Kite, Ocean, Robot, Triangle, Heart, Star, Leaf, Flower) were **removed** under the owner's decode-or-remove rule: they rendered as square QR codes with a coloured mosaic inside, not as realistic organic shapes, and a true organic silhouette cannot scan reliably with standard decoders. Unconvertible motifs are removed, not kept as decoration.

### 🎓 Career — CV & Cover Letter Builder

<img src="docs/screenshots/tool-cv-builder-band-2026-11-01.png" alt="CV & Cover Letter Builder — fresh capture, 2026-11-01 (landscape band of the print render) in DEFAULT/DEMO state: the form carries the tool's own pre-filled demo values" width="820">

Fill in your details once — with Bangladesh location data built in — then download a clean, professional CV and a matching cover letter as PDF. Nothing is uploaded anywhere.

### 💰 Finance & Business — 11 tools

- **Finance (7):** Loan EMI Calculator, Mortgage Calculator, Compound Interest Calculator, Simple Interest Calculator, Discount Calculator, Tip Calculator, Zakat Calculator.
- **Business (4):** Invoice Generator, Quotation Generator, Business Name Generator, Freelance Rate Calculator.

#### Invoice Generator — rounds shipped (live drive still owed)

- **Payment select** — pay-later due date, paid cash-on-delivery, paid cash-in-hand and further payment options in one select.
- **Logo as a real PNG** — an uploaded logo is converted on a canvas to a valid PNG (downscaled to at most 1000px on the long side), so the preview and the PDF always get a decodable image.
- **Amount-header fix** — the invoice table's Amount column header is present and right-aligned.
- **Watermark opt-in** — the logo watermark is off unless the visitor opts in; it renders centred and faint behind the invoice content.
- **Fresh blank form + New invoice button** — one tap clears the invoice (client, items, notes, totals, fresh number + dates) back to a single blank row, exactly as a fresh form.

### 🧮 Calculators, Converters & Date/Time — 10 tools

- **Calculator (2):** BMI Calculator, Percentage Calculator.
- **Converter (2):** Unit Converter, Number Base Converter.
- **Date & Time (6):** Age Calculator, Date Difference Calculator, Countdown Timer, Military Time Converter, Time Zone Converter, Timestamp Converter.

### ⌨️ Developer, Text & SEO — 20 tools

- **Developer (11):** JSON Formatter, Color Converter, CSS Minifier, CSV ↔ JSON Converter, JWT Decoder, Markdown to HTML, Password Generator, Regex Tester, Text Diff Checker, URL Encoder / Decoder, UUID Generator.
- **Text (6):** Word Counter, Case Converter, Lorem Ipsum Generator, Remove Duplicate Lines, Text to Speech, Base64 Encoder / Decoder.
- **SEO (3):** Meta Tag Generator, Slug Generator, URL Shortener.

<img src="docs/screenshots/tools-grid-desktop.png" alt="The All Tools grid on the homepage on a laptop screen (1280×800)" width="820">

### 🤖 AI assistance inside every tool

Every one of the 67 tool pages is built to load the shared in-tool AI helper (`tools/assets/ai.js` — repository-level presence re-verified in all 67 of 67 tool pages at the audited HEAD; this is a code-presence fact, not a live-working claim). It opens a styled in-panel assistant (the **AI Tips** button on each tool page) — and never a native alert or raw markdown. Requests go through this site's own serverless proxy (`tools/api/ai.js`), which runs a Groq → Gemini chain; provider keys stay server-side and never reach the browser. The site-wide help is the Ride Bangla AI Agent widget. (Live behaviour on a real phone is still owed — see below.)

### 🔒 Private by design, multilingual, installable

- **Files stay on the device** — tools process everything client-side; there is no upload endpoint for your documents or photos.
- **16 languages** — language packs ship in `tools/assets/i18n/` (English default, plus Bengali and 14 more) for the site chrome.
- **PWA** — a web app manifest and service worker (`tools/assets/manifest.webmanifest`, `tools/sw.js`) make the toolbox installable and offline-capable.

### ⭐ Reviews — your own review, deletable

The site's reviews section loader in `tools/assets/reviews.js` renders an honest unavailable state instead of a fake score when it cannot load (for example when the shared backend quota is exhausted). When reviews load, the homepage also shows per-site rating summaries across the five Ride Bangla websites. No live reviews feed is claimed here until the post-push live drive confirms it.

A signed-in reviewer can **delete their own review** (published reviews included) through a two-step confirmation — Delete, then confirm Delete / Cancel — and nothing else is ever touched. The delete control is styled in the site's error red (`--red-err: #DC2626` in `tools/assets/style.css`).

### 📋 Audit outcome — live-verification status

- **Full audit outcome: 61 FIXED / 4 OK / 2 NEEDS-OWNER-INPUT.** That is a code-audit result, not a live-working claim: all 67 tools remain **UNVERIFIED by a live phone drive**, and this README does not claim otherwise.
- **Needs owner input (1 of 2, confirmed in code):** the Zakat Calculator's wording — page copy says zakat applies "above nisab" while the calculator's own result status says "at or above nisab". The owner must settle which wording is correct.
- **Needs owner input (2 of 2):** the Background Remover's AI-presentation wording — awaiting the owner's decision on how the AI aspect is presented.
- **Full functional pass still owed:** every one of the 67 tools must be driven end-to-end on a real phone before any of them is called working.

---

## All 67 tools

| Category | Tools |
|---|---|
| **PDF (6)** | [PDF Editor](https://tools.ridebangla.bd/pdf/pdf-editor.html) · [Merge PDF](https://tools.ridebangla.bd/pdf/merge-pdf.html) · [Split PDF](https://tools.ridebangla.bd/pdf/split-pdf.html) · [Rotate PDF](https://tools.ridebangla.bd/pdf/rotate-pdf.html) · [Image to PDF](https://tools.ridebangla.bd/pdf/image-to-pdf.html) · [Text to PDF](https://tools.ridebangla.bd/pdf/text-to-pdf.html) |
| **Image (13)** | [Background Remover](https://tools.ridebangla.bd/image/background-remover.html) · [Photo Editor](https://tools.ridebangla.bd/image/photo-editor.html) · [Image Compressor](https://tools.ridebangla.bd/image/image-compressor.html) · [Image Resizer](https://tools.ridebangla.bd/image/image-resizer.html) · [Image Cropper](https://tools.ridebangla.bd/image/image-cropper.html) · [Format Converter](https://tools.ridebangla.bd/image/image-format-converter.html) · [Image to Base64](https://tools.ridebangla.bd/image/image-to-base64.html) · [Watermark](https://tools.ridebangla.bd/image/image-watermark.html) · [Metadata Remover](https://tools.ridebangla.bd/image/metadata-remover.html) · [HEIC to JPG](https://tools.ridebangla.bd/image/heic-to-jpg.html) · [Favicon Generator](https://tools.ridebangla.bd/image/favicon-generator.html) · [Color Palette](https://tools.ridebangla.bd/image/color-palette-generator.html) · [YouTube Thumbnail](https://tools.ridebangla.bd/image/youtube-thumbnail-downloader.html) |
| **QR (6)** | [QR Generator](https://tools.ridebangla.bd/qr/qr-code-generator.html) · [Payment QR](https://tools.ridebangla.bd/qr/payment-qr-generator.html) · [QR Reader](https://tools.ridebangla.bd/qr/qr-code-reader.html) · [Wi-Fi QR](https://tools.ridebangla.bd/qr/wifi-qr-generator.html) · [vCard QR](https://tools.ridebangla.bd/qr/vcard-qr-generator.html) · [Barcode](https://tools.ridebangla.bd/qr/barcode-generator.html) |
| **Finance (7)** | [Loan EMI](https://tools.ridebangla.bd/finance/loan-emi-calculator.html) · [Mortgage](https://tools.ridebangla.bd/finance/mortgage-calculator.html) · [Compound Interest](https://tools.ridebangla.bd/finance/compound-interest-calculator.html) · [Simple Interest](https://tools.ridebangla.bd/finance/simple-interest-calculator.html) · [Discount](https://tools.ridebangla.bd/finance/discount-calculator.html) · [Tip](https://tools.ridebangla.bd/finance/tip-calculator.html) · [Zakat](https://tools.ridebangla.bd/finance/zakat-calculator.html) |
| **Business (4)** | [Invoice](https://tools.ridebangla.bd/business/invoice-generator.html) · [Quotation](https://tools.ridebangla.bd/business/quotation-generator.html) · [Business Name](https://tools.ridebangla.bd/business/business-name-generator.html) · [Freelance Rate](https://tools.ridebangla.bd/business/freelance-rate-calculator.html) |
| **Career (1)** | [CV & Cover Letter Builder](https://tools.ridebangla.bd/career/cv-cover-letter-builder.html) |
| **Calculator (2)** | [BMI](https://tools.ridebangla.bd/calculator/bmi-calculator.html) · [Percentage](https://tools.ridebangla.bd/calculator/percentage-calculator.html) |
| **Converter (2)** | [Unit Converter](https://tools.ridebangla.bd/converter/unit-converter.html) · [Base Converter](https://tools.ridebangla.bd/converter/base-converter.html) |
| **Date & Time (6)** | [Age](https://tools.ridebangla.bd/date-time/age-calculator.html) · [Date Difference](https://tools.ridebangla.bd/date-time/date-difference-calculator.html) · [Countdown](https://tools.ridebangla.bd/date-time/countdown-timer.html) · [Military Time](https://tools.ridebangla.bd/date-time/military-time-converter.html) · [Time Zone](https://tools.ridebangla.bd/date-time/time-zone-converter.html) · [Timestamp](https://tools.ridebangla.bd/date-time/timestamp-converter.html) |
| **Developer (11)** | [JSON Formatter](https://tools.ridebangla.bd/developer/json-formatter.html) · [Color Converter](https://tools.ridebangla.bd/developer/color-converter.html) · [CSS Minifier](https://tools.ridebangla.bd/developer/css-minifier.html) · [CSV ↔ JSON](https://tools.ridebangla.bd/developer/csv-json-converter.html) · [JWT Decoder](https://tools.ridebangla.bd/developer/jwt-decoder.html) · [Markdown to HTML](https://tools.ridebangla.bd/developer/markdown-to-html.html) · [Password Generator](https://tools.ridebangla.bd/developer/password-generator.html) · [Regex Tester](https://tools.ridebangla.bd/developer/regex-tester.html) · [Text Diff](https://tools.ridebangla.bd/developer/text-diff-checker.html) · [URL Encoder](https://tools.ridebangla.bd/developer/url-encoder-decoder.html) · [UUID Generator](https://tools.ridebangla.bd/developer/uuid-generator.html) |
| **Text (6)** | [Word Counter](https://tools.ridebangla.bd/text/word-counter.html) · [Case Converter](https://tools.ridebangla.bd/text/case-converter.html) · [Lorem Ipsum](https://tools.ridebangla.bd/text/lorem-ipsum-generator.html) · [Remove Duplicate Lines](https://tools.ridebangla.bd/text/remove-duplicate-lines.html) · [Text to Speech](https://tools.ridebangla.bd/text/text-to-speech.html) · [Base64](https://tools.ridebangla.bd/text/base64-encoder-decoder.html) |
| **SEO (3)** | [Meta Tags](https://tools.ridebangla.bd/seo/meta-tag-generator.html) · [Slug Generator](https://tools.ridebangla.bd/seo/slug-generator.html) · [URL Shortener](https://tools.ridebangla.bd/seo/url-shortener.html) |

---

## How it works

1. **Open a tool** from [tools.ridebangla.bd](https://tools.ridebangla.bd) — no sign-up, no install.
2. **Work in your browser** — your file or text is processed by JavaScript on your own device (PDF.js / pdf-lib for documents, Canvas for images, in-page generators for QR codes); it is never uploaded.
3. **Download the result** — a PDF, an image, a QR PNG, or copyable text, depending on the tool.
4. **Ask the in-tool AI** when you need help — the AI Tips panel answers through the site's own proxy, with provider keys kept server-side.

```text
tools/
├── index.html            Homepage — searchable index of all 67 tools
├── pdf/  image/  qr/     Category folders: an index page + one HTML file per tool
├── calculator/  converter/  text/  seo/  developer/
├── date-time/  finance/  business/  career/
├── api/
│   ├── ai.js             Vercel function — AI proxy (Groq → Gemini)
│   └── shorten.js        Vercel function — URL-shortener proxy
└── assets/               Shared CSS/JS, the Tools logo set, i18n packs, PWA icons
```

---

## Built with — কি কি দিয়ে তৈরি হয়েছে

Only what is actually in this repository — nothing invented:

- **Static site, no framework** — plain HTML, CSS and JavaScript under `tools/`; **no package.json, no build step**. The whole toolbox is hand-written web pages plus shared assets.
- **Styling** — one shared stylesheet (`tools/assets/style.css`) in Tools' own design language: deep-green (`#0B3D2E`) and vibrant-green palette with white surfaces, Space Grotesk headings, IBM Plex Mono labels, and Noto Sans Bengali support.
- **PDF engine** — PDF.js **3.11.174** and pdf-lib **1.17.1** (CDN copies recorded in `tools/pdf/pdf-editor.html`; local vendored copies under `tools/assets/`), so PDFs are edited entirely in the visitor's browser.
- **QR & barcodes** — the site's own QR studio and design scripts (`tools/assets/qr-studio.js`, `tools/assets/qr-designs.js` v5: 3 plain designs — Classic, Rounded, Sunset Fade), jsQR for reading codes, and JsBarcode **3.11.6** for barcodes.
- **Image & media helpers (lazy-loaded per tool, via CDN)** — @imgly/background-removal, heic2any, exifr, ffmpeg.wasm and html2canvas, each loaded only by the tool that needs it.
- **In-tool AI** — the shared helper `tools/assets/ai.js` (present in all 67 tool pages) talking to the site's own serverless proxy `tools/api/ai.js`, which runs a Groq → Gemini chain with provider keys kept server-side.
- **Serverless, only two functions** — `tools/api/ai.js` (AI proxy) and `tools/api/shorten.js` (URL-shortener proxy), both Vercel functions. There is no database and no account system.
- **Installable (PWA)** — web app manifest (`tools/assets/manifest.webmanifest`) + service worker (`tools/sw.js`), so the toolbox can be installed and works offline where cached.
- **Multilingual** — 16 language packs in `tools/assets/i18n/` (English default, plus Bengali and 14 more) for the site chrome.
- **Secure by default** — security headers set in `tools/vercel.json` (Content-Security-Policy, HSTS, `nosniff`, frame and referrer policies; camera allowed only on the QR reader page).
- **Hosting** — Vercel, serving [tools.ridebangla.bd](https://tools.ridebangla.bd).

---

## Roadmap — OWED, NOT SHIPPED

Nothing in this section is live. It is listed here only so the gap is visible, never as a shipped feature.

- **Laptop-screen video (OWED)** — a genuine laptop/computer-screen video of a tool in use (for example the QR Code Generator or PDF Editor, recorded on a laptop screen). The site hero video is a showcase scene, not a screen recording, and the only demo GIF in the repository (`docs/demo/qr-code-generator-demo.gif`) is a portrait phone-screen capture — phone-screen video is never acceptable as a substitute, and no laptop GIF exists either.
- **PDF Editor v4 (OWED, in its proper slot)** — the deep rework for tap-to-edit accuracy at every zoom and pan state and exact phone fit, verified on a real phone. v3's owner-phone failure stands until then.
- **Live phone drive for all 67 tools (OWED)** — every tool driven end-to-end on a real phone before any of them is called working.
- **Owner input (OWED)** — Zakat Calculator wording ("above nisab" vs "at or above nisab") and Background Remover AI-presentation wording.

---

## Security

Please report vulnerabilities privately — see **[SECURITY.md](SECURITY.md)** (report to support@ridebangla.bd; do not open a public issue for a security problem).

---

## The Ride Bangla ecosystem

Ride Bangla Tools is one part of Ride Bangla Limited:

| Service | Link |
|---|---|
| Ride Bangla — main website | [ridebangla.bd](https://ridebangla.bd) |
| AI Agent platform | [ai.ridebangla.bd](https://ai.ridebangla.bd) |
| Studio | [studio.ridebangla.bd](https://studio.ridebangla.bd) |
| **Tools (this project)** | **[tools.ridebangla.bd](https://tools.ridebangla.bd)** |
| IT Team | [it.ridebangla.bd](https://it.ridebangla.bd) |
| Customer app | [customer.ridebangla.bd](https://customer.ridebangla.bd) |
| Partner app | [partner.ridebangla.bd](https://partner.ridebangla.bd) |
| Rider app | [rider.ridebangla.bd](https://rider.ridebangla.bd) |
| Agent app | [agent.ridebangla.bd](https://agent.ridebangla.bd) |

Ride Bangla Limited is led by Enamul Seddik (Co-Founder & CEO), Emon Seddik (Co-Founder & Director) and Obayedur Rahman Shaikh (Co-Founder & Marketing Director); the IT Team is directed by Tabassum Nisha.

---

## Contact & community

- **General:** info@ridebangla.bd
- **Support / security reports:** support@ridebangla.bd
- **Help Center:** [tools.ridebangla.bd/help-center.html](https://tools.ridebangla.bd/help-center.html)

<p>
  <a href="https://www.facebook.com/ridebangla"><img src="https://cdn.simpleicons.org/facebook/1877F2" width="22" alt="Facebook"></a>&nbsp; <a href="https://www.facebook.com/ridebangla">Facebook</a> &nbsp;·&nbsp;
  <a href="https://x.com/ridebangla"><img src="https://cdn.simpleicons.org/x/000000" width="22" alt="X"></a>&nbsp; <a href="https://x.com/ridebangla">X</a> &nbsp;·&nbsp;
  <a href="https://www.instagram.com/ride.bangla_"><img src="https://cdn.simpleicons.org/instagram/E4405F" width="22" alt="Instagram"></a>&nbsp; <a href="https://www.instagram.com/ride.bangla_">Instagram</a> &nbsp;·&nbsp;
  <a href="https://www.threads.net/@ride.bangla_"><img src="https://cdn.simpleicons.org/threads/000000" width="22" alt="Threads"></a> &nbsp;·&nbsp;
  <a href="https://www.tiktok.com/@ridebangla0"><img src="https://cdn.simpleicons.org/tiktok/000000" width="22" alt="TikTok"></a>&nbsp; <a href="https://www.tiktok.com/@ridebangla0">TikTok</a> &nbsp;·&nbsp;
  <a href="https://www.youtube.com/@ridebangla-0"><img src="https://cdn.simpleicons.org/youtube/FF0000" width="22" alt="YouTube"></a>&nbsp; <a href="https://www.youtube.com/@ridebangla-0">YouTube</a>
</p>

- **Community group:** [Ride Bangla Community on Facebook](https://www.facebook.com/share/g/1CfmiTzv1D/)

---

## License

Proprietary — © 2026 Ride Bangla Limited. All rights reserved. See **[LICENSE](LICENSE)**. No part of this software may be copied, reproduced, modified or distributed without the prior written permission of Ride Bangla Limited, except where a separate written agreement expressly permits it. Third-party components remain under their own licenses.
