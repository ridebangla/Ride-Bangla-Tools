# Ride Bangla Tools

A free, no-login toolbox of small web utilities — PDF, image, calculator,
converter, text, SEO, developer, QR, date/time and finance tools. Built as a
static site, intended to be deployed at **tools.ridebangla.bd**.

Every tool runs **entirely in the visitor's browser** — no file is ever
uploaded to a server, and the site needs no backend or database.

## Branding

This site is deliberately styled differently from the main
`ridebangla.bd` website (which uses the red/green Bangladesh-flag theme).
Ride Bangla Tools uses an ink-navy + brass "digital workshop" palette so
international visitors read it as a distinct Ride Bangla *product*, not a
duplicate of the main brand. The footer and header both credit
"A Ride Bangla Product" and link back to the main site.

## Structure

```
/                       homepage — searchable index of every tool
/pdf/                   category index + tools
/image/
/calculator/
/converter/
/text/
/seo/
/developer/
/qr/
/date-time/
/finance/
/assets/                shared CSS, JS, logo and favicons
/sitemap.xml
/robots.txt
/vercel.json
```

Each category folder has an `index.html` (category page) plus one `.html`
file per tool, e.g. `calculator/bmi-calculator.html`.

## Current tools (21)

| Category | Tools |
|---|---|
| PDF | Image to PDF, Text to PDF |
| Image | Image to Base64, Image Compressor |
| Calculator | BMI Calculator, Percentage Calculator |
| Converter | Unit Converter, Number Base Converter |
| Text | Word Counter, Lorem Ipsum Generator |
| SEO | Meta Tag Generator, URL Slug Generator |
| Developer | JSON Formatter, Color Converter, Password Generator |
| QR Code | QR Code Generator, Wi-Fi QR Generator |
| Date & Time | Age Calculator, Date Difference Calculator |
| Finance | Loan EMI Calculator, Simple Interest Calculator |

## Deploying

1. Push this folder to a GitHub repository (e.g. `Ride-Bangla-Tools`).
2. Import it as a new Vercel project.
3. In Vercel → Domains, add `tools.ridebangla.bd` and point the DNS
   `CNAME` record at Vercel as instructed there.
4. No build command or environment variables are needed — it's a static
   site; set the Vercel "Output Directory" to the project root.
5. Once live, submit `https://tools.ridebangla.bd/sitemap.xml` in Google
   Search Console (as a **new property**, separate from the main
   `ridebangla.bd` one) so Google starts indexing the tools.

## Adding a new tool later

1. Pick a category folder (or add a new one).
2. Copy the closest existing tool's `.html` file as a starting point —
   it already has the header, footer and shared styling wired up.
3. Add the new tool to the category's `index.html` list and to the
   homepage list (both are plain HTML — no rebuild step needed).
4. Add the URL to `sitemap.xml`.

## External libraries used (loaded from CDN, no install needed)

- [pdf-lib](https://pdf-lib.js.org/) — PDF creation (Image to PDF, Text to PDF)
- [qrcode](https://github.com/soldair/node-qrcode) — QR code rendering
- Google Fonts: Space Grotesk (headings) + IBM Plex Mono (labels/data)

## Roadmap (from the original plan)

Launch with ~20–30 tools → watch Search Console for indexing and country
of traffic → expand toward 100+ tools based on what people actually
search for and use. When budget allows, this can later migrate to a
dedicated `.com` domain on the same codebase.
