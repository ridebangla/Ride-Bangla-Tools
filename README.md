<p align="center">
  <img src="tools/assets/logo-256.png" alt="Ride Bangla Tools logo" width="110">
</p>

<h1 align="center">Ride Bangla Tools</h1>

<p align="center">
  A free, no-login toolbox of everyday web utilities — PDF, image, calculator,<br>
  converter, text, SEO, developer, QR, date/time, finance and career tools.<br>
  <b>Every tool runs entirely inside your browser.</b> No file is ever uploaded to a server.
</p>

<p align="center">
  <a href="https://tools.ridebangla.bd"><img alt="Live site" src="https://img.shields.io/badge/live%20site-tools.ridebangla.bd-0E7A3B?style=flat-square"></a>
  <img alt="Tools" src="https://img.shields.io/badge/tools-26-0E7A3B?style=flat-square">
  <img alt="Backend" src="https://img.shields.io/badge/backend-none-0E7A3B?style=flat-square">
  <img alt="Sign up" src="https://img.shields.io/badge/sign--up-not%20required-0E7A3B?style=flat-square">
  <img alt="Made with" src="https://img.shields.io/badge/made%20with-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-1F2937?style=flat-square">
</p>

<p align="center">
  <a href="https://tools.ridebangla.bd"><b>tools.ridebangla.bd</b></a> ·
  <a href="https://www.ridebangla.bd">ridebangla.bd</a>
</p>

---

## About

**Ride Bangla Tools** is a companion product to [Ride Bangla](https://www.ridebangla.bd) —
Bangladesh's super-app for food delivery, courier, ride-sharing, homemade
goods, medicine and grocery. This project is a separate, standalone site: a
fast little toolbox of 26 single-purpose utilities (compress an image, build
a CV, generate a QR code, wipe hidden metadata from a photo, and so on),
built to be genuinely useful on its own and to put the Ride Bangla name in
front of people who've never used the main app.

There's no account system, no database and no backend server. It's a static
site — every calculation, conversion, PDF and image edit happens with plain
JavaScript in the visitor's own browser.

## Tech stack

| Layer | What's used |
|---|---|
| Markup / styling | Hand-written **HTML5** + **CSS3** — no framework, no build step, no bundler |
| Behaviour | Vanilla **JavaScript** (ES modules where a tool needs one) |
| Fonts | Google Fonts — **Space Grotesk** (headings) + **IBM Plex Mono** (labels/data) |
| PDF tools | [pdf-lib](https://pdf-lib.js.org/) (CDN) |
| QR tools | [qrcode](https://github.com/soldair/node-qrcode) (CDN) |
| Background Remover | [@imgly/background-removal](https://github.com/imgly/background-removal-js) — on-device AI, CDN |
| Metadata Remover | [exifr](https://github.com/MikeKovarik/exifr) for the metadata preview + [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) for video, both CDN, both on-device |
| Hosting | [Vercel](https://vercel.com) (static hosting, zero config) |
| Ads | Adsterra / HighRevenueFormat ad units (site-wide + per-page slots) |

No `package.json`, no `node_modules`, nothing to `npm install`. Every
third-party library is pulled from a CDN with a pinned version, and only on
the page (sometimes only after a click) that actually needs it — the
homepage itself loads none of them.

## Design

The site is deliberately styled **differently** from the main
`ridebangla.bd` website, which uses a red/green Bangladesh-flag theme.
Ride Bangla Tools uses a single-green **"digital workshop"** palette instead
— white surfaces, a pale mint tint for section backgrounds, dark navy
headings, and one confident green (`#0E7A3B`) for every button, link and
accent — so international visitors read it as a distinct Ride Bangla
*product*, not a duplicate of the main brand. Both the header and footer
carry an explicit "A Ride Bangla Product" credit and link back to the main
site. Red is kept out of the palette entirely and reserved only for genuine
error states inside a tool (an invalid JSON paste, an "Obese" BMI result).

A few deliberate choices carried through every page:

- **One shared stylesheet** (`assets/style.css`) drives the homepage, every
  category page and every tool page — a card grid for tool listings, a
  common panel/field/button system for tool UIs, and a matching header and
  footer — so adding a new tool never means writing new layout CSS.
- **Space Grotesk** for headings gives the brand a slightly technical,
  confident voice; **IBM Plex Mono** is used for small labels, breadcrumbs,
  category tags and stats, which is what gives the UI its "workshop /
  toolkit" feel rather than a generic marketing-page look.
- **A hand-built hero mockup** (no screenshot) shows a laptop and a phone
  rendered in pure CSS, each carrying the real Ride Bangla Tools logo as a
  floating badge on the device plus inside the mock browser chrome — so the
  brand is recognisable even before the page finishes loading any imagery.
- **One accent color per category** (blue for PDF, purple for Image, teal
  for Calculator, etc.) makes the tool catalog scannable at a glance once
  the list grows past a handful of entries.
- **Mobile-first, no dead ends**: every tool page includes an SEO-friendly
  "How to use" + FAQ section and a "More in this category" related-tools
  strip, so visitors who land on one tool from search discover the rest of
  the toolbox.

## Structure

```
Ride-Bangla-Tools-main/          ← repo root
├── .github/workflows/           ← the zip-upload deploy workflow (see below)
└── tools/                       ← the actual site (Vercel root = this folder)
    ├── index.html               homepage — searchable index of every tool
    ├── pdf/                     category index + tool pages
    ├── image/
    ├── calculator/
    ├── converter/
    ├── text/
    ├── seo/
    ├── developer/
    ├── qr/
    ├── date-time/
    ├── finance/
    ├── career/
    ├── assets/                  shared CSS, JS, logo and favicons
    ├── sitemap.xml
    ├── robots.txt
    ├── vercel.json
    └── README.md                notes specific to the tools/ folder
```

Each category folder has an `index.html` (category page) plus one `.html`
file per tool, e.g. `tools/calculator/bmi-calculator.html`.

## All 26 tools

| Category | Tools |
|---|---|
| PDF | Image to PDF, Text to PDF |
| Image | Photo Editor, Background Remover, Image to Base64, Image Compressor, Image Resizer, **Metadata Remover** |
| Calculator | BMI Calculator, Percentage Calculator |
| Converter | Unit Converter, Number Base Converter |
| Text | Word Counter, Lorem Ipsum Generator |
| SEO | Meta Tag Generator, URL Slug Generator |
| Developer | JSON Formatter, Color Converter, Password Generator |
| QR Code | QR Code Generator, Wi-Fi QR Generator |
| Date & Time | Age Calculator, Date Difference Calculator |
| Finance | Loan EMI Calculator, Simple Interest Calculator |
| Career | CV & Cover Letter Builder |

**Metadata Remover** (`tools/image/metadata-remover.html`) is the newest
addition: it shows you what hidden data (camera model, exact date/time, GPS
location) a photo or video is carrying, then strips it — photos via a
canvas redraw, videos via ffmpeg.wasm's `-map_metadata -1` — before you
share the file.

## How this repo deploys (no local terminal needed)

This project is built and shipped entirely from a phone/browser, with no
local dev environment:

1. Changes are made to the `tools/` folder and re-packaged as a `tools/`
   zip.
2. That zip is uploaded to the **root** of this GitHub repository (GitHub
   web UI → *Add file → Upload files*).
3. `.github/workflows/eas-build.yml` picks up any `*.zip` pushed to the
   repo root, extracts it, replaces the `tools/` folder with its contents,
   commits, and pushes to `main` — then deletes the zip so the workflow is
   idempotent.
4. Vercel is connected to this repo with **Root Directory** set to `tools/`
   and redeploys automatically on every push to `main`.
5. No build command and no environment variables are needed anywhere in
   this pipeline — it's a static site end to end.

## Adding a new tool later

1. Pick a category folder under `tools/` (or add a new one).
2. Copy the closest existing tool's `.html` file as a starting point — it
   already has the header, footer and shared styling wired up.
3. Add the new tool to that category's `index.html` list **and** to the
   homepage (`tools/index.html`) list — both are plain HTML, no rebuild
   step needed.
4. Add its URL to `tools/sitemap.xml`.
5. Zip the `tools/` folder and upload it to the repo root as described
   above.

## License & credit

Built and maintained by **Ride Bangla** (Faridpur, Bangladesh) —
co-founded by MD Enamul Seddik and MD Emon Seddik.
[Main site](https://www.ridebangla.bd) · [Tools](https://tools.ridebangla.bd)
