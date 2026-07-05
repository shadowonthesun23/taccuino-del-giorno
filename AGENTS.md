<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project brief for agents

## What this project is

`taccuino-del-giorno` is an editorial, highly visual Next.js app that generates a daily cultural notebook in Italian/English. The home page presents daily content cards: author, quote, word of the day, saints, artwork, historical events, poem, Bible passage, and music recommendation. It also includes a printable/exportable daily passport and an ephemeris-style ticket.

The product direction is not “generic dashboard”. It should feel like a refined paper object: editorial, warm, slightly antique, tactile, with careful typography, restrained motion, and believable paper/print textures.

## Important product principles

- Preserve the handmade/editorial identity: paper, ink, museum labels, tickets, stamps, subtle texture.
- Avoid UI that feels SaaS, neon, overly modern, or generic.
- Dark mode must remain atmospheric but readable. Do not let cards become flat gray; use deep warm dark tones.
- Light mode should feel like cream paper, not pure white.
- Exports matter. Any visual card/ticket/passport change must consider downloaded PNG/JPEG output, not only browser display.
- Mobile matters. The passport is less practical on mobile, so ticket export/download behavior should stay reliable on mobile browsers.
- Do not remove serial numbers, museum links, QR codes, or export affordances unless explicitly requested.

## Key files and areas

- `app/page.tsx`: main home page, daily data loading, cards, ticket/passport UI, image fallbacks, theme handling.
- `app/globals.css`: most visual styling for home cards, backgrounds, ticket, seasonal artwork reveal, dark mode, export visuals.
- `app/components/Card.tsx`: reusable card wrapper and card export behavior.
- `app/components/AuthorExportCard.tsx`: author export card.
- `app/passaporto/page.tsx`: daily passport/zine page and server-side data/image fetching.
- `app/passaporto/passaporto.module.css`: passport/zine print/export layout.
- `app/passaporto/PrintableZineButton.tsx`: printable/export behavior for the zine.
- `app/api/oggi/route.ts`: daily content API.
- `app/api/opera/route.ts`: artwork of the day API.
- `app/api/music-cover/route.ts`: music cover lookup.
- `app/api/image-proxy/route.ts`: image proxy used to stabilize external images and exports.
- `lib/artwork.ts`: artwork lookup/localization logic.
- `lib/seasonal-artwork.ts`: rotating seasonal background artworks.
- `components/ui/ParallaxBackground.tsx`: background drawings and seasonal reveal behavior.

## Visual language

- Main editorial font: IM Fell Double Pica.
- Wordmark font: `public/fonts/MasterSignature.otf`, loaded through `next/font/local`.
- Typewriter/ticket details use Stampwriter sparingly; avoid it for long uppercase text because glyphs can get dirty.
- The visual style should be paper-first: realistic shadow, subtle grain, slightly irregular edges, but never messy.
- In dark mode, keep artwork/media frames neutral when requested; avoid brown frames around artwork or album covers unless deliberately designed.

## Export/download notes

- Browser rendering and exported images can diverge. When changing visuals, check whether the export path clones DOM nodes, embeds fonts, or uses proxied images.
- External images should generally go through `/api/image-proxy` before being used in export-sensitive UI.
- For mobile downloads, be careful with browser differences: Safari and Chromium-based mobile browsers do not always behave the same with blob downloads/new tabs.
- Downloaded tickets should not include UI buttons inside the exported artwork.

## Data/image reliability notes

- If an image appears in the passport but not in home, compare server-side fetching in `app/passaporto/page.tsx` with client-side fetching in `app/page.tsx`.
- Music covers should use `app/api/music-cover/route.ts` and then be displayed through `/api/image-proxy`.
- Artwork images can have long URLs or provider quirks; maintain fallback chains between normal image, HD image, proxied URL, and direct URL where useful.

## Footer Wax Seal (Ceralacca)

The footer features a realistic daily alternating 3D wax seal (13 colors, cycling via `(dayOfYear - 1) % 13` in `app/page.tsx`).
- **Assets**: Transparent PNG images stored in `public/images/sigillo-[colore].png`.
- **Styling**: The text container `.daily-wax-seal-inner` uses `opacity: 1` and has no blend mode (`mix-blend-mode: normal`) to ensure opaque text rendering.
- **Colors**: CSS variables match each seal's flat center color exactly (calculated via average R/G/B) to ensure the face of the letters blends into the wax.
- **3D Engraved (Debossed / Letterpress) Effect**:
  - Simulated using a dark top-left inner shadow (`-0.5px -0.5px` offset) representing the recessed shadow, and a light bottom-right inner highlight (`0.6px 0.6px` offset) representing illuminated inner edges.
  - A highly opaque black shadow (`rgba(0, 0, 0, 0.98)`) is centered (`0 0 [blur]`) behind the text to guarantee contrast and stacco.
  - Typographic scaling: shadows are wider on `.seal-initials` (`1.8px`/`2.2px` blur) and extremely tight/close on `.seal-date` and `.seal-edition` (`1.2px`/`1.4px` blur) to keep the tiny text perfectly legible.
  - Bold weight: `.seal-date` uses `font-weight: 800` and `.seal-edition` uses `font-weight: 700`.

## Working rules

- Before writing Next.js-specific code, consult the relevant local docs in `node_modules/next/dist/docs/`.
- Prefer targeted changes over broad rewrites.
- Preserve unrelated local changes and untracked experiments unless the user explicitly asks to include them.
- Use `rg` for searching.
- Use `apply_patch` for edits.
- Do not run visual browser checks unless the user asks; they often prefer to verify locally to save credits.
- For requested commit+push: inspect `git status`, stage only intended files, commit with a concise message, push to `main`, then report the commit hash.

## Verification

- Run `npm run build` for meaningful changes.
- `npm run lint` may currently report pre-existing issues in backup files or older components; do not treat unrelated lint failures as caused by a small targeted change. Mention them if relevant.
- If changing export/download behavior, prefer a focused local check of the affected code path, but ask before using browser automation if the user wants to conserve credits.
