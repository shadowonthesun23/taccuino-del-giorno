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

- `app/page.tsx`: Main home entry page. Handles hydration, mount synchronization, active section states, and scroll navigation hooks. Keep it lightweight (~800 lines).
- `lib/`: Contains utility modules extracted during refactoring:
  - [types.ts](file:///Users/antonello/taccuino-del-giorno/lib/types.ts): Shared TypeScript interfaces.
  - [constants.ts](file:///Users/antonello/taccuino-del-giorno/lib/constants.ts): Theme constants, navigation lists, and configuration arrays.
  - [translation.ts](file:///Users/antonello/taccuino-del-giorno/lib/translation.ts): Comprehensive dictionaries and localized label lookup (`t()`).
  - [browser-utils.ts](file:///Users/antonello/taccuino-del-giorno/lib/browser-utils.ts): Browser-specific settings, theme applier, and scroll metric helpers.
  - [date-utils.ts](file:///Users/antonello/taccuino-del-giorno/lib/date-utils.ts), [astronomy.ts](file:///Users/antonello/taccuino-del-giorno/lib/astronomy.ts), [archive-utils.ts](file:///Users/antonello/taccuino-del-giorno/lib/archive-utils.ts): Specialized logic folders.
- `app/components/`: Modularized home-page components:
  - [SeasonalBookmark.tsx](file:///Users/antonello/taccuino-del-giorno/app/components/SeasonalBookmark.tsx): Ephemeris/almanac bookmark ticket.
  - [DailyPassport.tsx](file:///Users/antonello/taccuino-del-giorno/app/components/DailyPassport.tsx): Interactive daily passport drawer.
  - [LoadingNotebook.tsx](file:///Users/antonello/taccuino-del-giorno/app/components/LoadingNotebook.tsx): Initial loading screen paper animation.
  - [NotebookQuickNav.tsx](file:///Users/antonello/taccuino-del-giorno/app/components/NotebookQuickNav.tsx) & [MobileReadingThread.tsx](file:///Users/antonello/taccuino-del-giorno/app/components/MobileReadingThread.tsx): Progress trackers.
- `components/ui/`: Extracted layout elements:
  - [Typography.tsx](file:///Users/antonello/taccuino-del-giorno/components/ui/Typography.tsx), [Doodles.tsx](file:///Users/antonello/taccuino-del-giorno/components/ui/Doodles.tsx), [Icons.tsx](file:///Users/antonello/taccuino-del-giorno/components/ui/Icons.tsx).
- `app/globals.css`: Visual styling, theme setups, seasonal backgrounds, dark mode overrides.
- `app/components/Card.tsx`: Reusable content card wrapper and social/standard image export routine.
- `app/passaporto/`: Zine display and print layouts.

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

## Scroll Performance Guidelines

- **Avoid layout-thrashing on scroll**: Do NOT write CSS variables to the `:root` or `document.documentElement` style object inside scroll listeners (such as the daily reading progress). Instead, fetch the specific target progress elements and modify their inline `style.transform` directly.
- **Hardware acceleration on Parallax**: Parallax translation containers and background assets must use hardware acceleration by specifying `willChange: 'transform'` inline. Keep interpolation easing values soft (e.g. `0.085`) to preserve fluid inertia and avoid scrolling stutter ("jank").

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
