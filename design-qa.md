# Design QA — Tavola completa delle corrispondenze

## Findings

- [P3] L’ornamento centrale sotto il titolo è realizzato con l’icona `Flower2` già presente nel sistema, mentre il riferimento usa un piccolo fregio orizzontale più decorativo. Non compromette la gerarchia o la leggibilità; può essere sostituito in una rifinitura dedicata agli asset ornamentali.
- [P3] Il contenuto APOD dell’export contiene il dato reale della giornata corrente (`Eclipse Pair`), diverso dal testo presente nell’immagine di riferimento. È intenzionale: la tavola deve cambiare ogni giorno senza hardcode del contenuto editoriale.

## Comparison evidence

- Source visual truth: `/Users/antonello/Downloads/ChatGPT Image 29 ago 2026, 16_17_35.png`
- Source dimensions: `941 x 1672 px`; normalized comparison: `/private/tmp/coordinate-reference-1080-final.png` at `1080 x 1920 px`
- Implementation export: `/Users/antonello/Downloads/coordinate-del-giorno-2026-08-29 (2).png` at `1080 x 1920 px`
- Same viewport and state: `1080 x 1920`, light theme, 29 August 2026 data, complete-plate export
- Full-view comparison: `/private/tmp/coordinate-compare-final-20.png`
- Pixel comparison reference: ImageMagick absolute error `188307` (`0.0908117`), with differences primarily from live daily media/text, paper texture, the italic word treatment, the repaired export label, and the larger seal treatment.
- Focused regions reviewed: header/word, author block, four-row two-column coordinate grid, and wax-seal footer.

## Fidelity surfaces

- Header: JaneAust wordmark, date/edition metadata, rule, and central ornament.
- Hierarchy: word of the day first, author second, then the eight smaller coordinates.
- Typography: IM Fell Double Pica for display/editorial copy, typewriter labels, and JaneAust for the title.
- Media: author portrait and daily images retain the source-led crop and rounded editorial frames.
- Paper language: warm cream background, restrained terracotta accent, thin rules, and wax seal.

## Responsive/export checks

- The export remains a fixed `1080 x 1920` 9:16 canvas with a protected top safe area and side margins.
- The clone is measured after fonts and images are ready; if daily text or media makes the composition exceed the available height, it scales down only as much as needed.
- Word-length classes, concise export copy, flexible grid columns, and wrapping author/coordinate text keep variable daily material from relying on the 29 August content.
- `includeQueryParams: true` is enabled in `html-to-image` so distinct proxied daily media URLs do not collapse into one cached image during export.

## Verification

| Check | Result |
|---|---|
| `npm run build` | Passed — Next.js 16.2.4, 30 static pages generated |
| `npx eslint app/components/DailyCorrespondences.tsx` | Passed |
| `npm test` | Passed — 2 tests |
| `git diff --check` | Passed |
| Export button and generated PNG | Passed in the local browser at 1080 × 1920 |
| Console errors during final export | None introduced by the final export pass |

## Comparison history

- Replaced the rejected thread/coordinate-folio experiment with the supplied reference composition.
- Rebuilt the complete plate as a two-column editorial grid with the word and author as the primary hierarchy.
- Added export-only concise copy so the browser card can retain its reading detail while the PNG remains readable.
- Added measured overflow scaling after validating that the reference day should remain at full scale; the complete layout now scales into the canvas with no lower bleed.
- Switched the export word to the loaded IM Fell italic face at a slightly smaller scale, changed the export label to `Parola del giorno`, tightened the word block, and reserved footer space so the larger seal remains fully visible without covering the final coordinate row.

final result: passed

## Social Stories QA — 29 agosto 2026

### Source e implementazione

- Story 1 source: `/Users/antonello/Downloads/coordinate-del-giorno-2026-08-29 (2).png` (`1080 x 1920 px`); export verificato: `/Users/antonello/Downloads/coordinate-del-giorno-2026-08-29 (7).png`.
- Story 2 source: `/Users/antonello/Downloads/ChatGPT Image 29 ago 2026, 21_57_21.png` (`941 x 1672 px`); export verificato: `/Users/antonello/Downloads/le-cose-del-giorno-2026-08-29 (5).png`.
- Story 3 source: `/Users/antonello/Downloads/ChatGPT Image 29 ago 2026, 21_57_30.png` (`941 x 1672 px`); export verificato: `/Users/antonello/Downloads/da-portare-con-se-2026-08-29 (4).png`.
- Il confronto side-by-side è stato normalizzato a `540 x 960 px` per lato: `/private/tmp/taccuino-compare-story1-final.png`, `/private/tmp/taccuino-compare-story2-final.png`, `/private/tmp/taccuino-compare-story3-final.png`.

### Superfici controllate

- `/social-preview?data=2026-08-29&theme=light`, tre preview contemporanee a desktop (`1600 x 1200`, DPR `1`) e mobile (`390 x 844`, DPR `1`).
- Modal di download a desktop: `/private/tmp/taccuino-social-stories-modal-light-final.png`.
- Modal di download a mobile: `/private/tmp/taccuino-social-stories-modal-mobile-final.png`.
- Screenshot route desktop: `/private/tmp/taccuino-social-preview-desktop-light-final.png`.
- Screenshot route mobile: `/private/tmp/taccuino-social-preview-mobile-light-final.png`.
- Screenshot della rifinitura Story 2 desktop: `/private/tmp/taccuino-social-story2-after-title-removal.png`.
- Screenshot del modal dopo le nuove label: `/private/tmp/taccuino-social-stories-modal-desktop-after-labels.png` e `/private/tmp/taccuino-social-stories-modal-mobile-after-labels.png`.
- Sono stati confrontati header, gerarchia tipografica, pannello 2 x 2 della Story 2, ritmo verticale della Story 3, immagini, separatori, safe area e sigillo.

### Findings e decisioni

- [P2] Le immagini e i testi dell’implementazione sono quelli reali del 29 agosto (`San Giovanni Battista`, `The Adoration of the Magi`, `Gotham Lullaby`, `Eclipse Pair`, `Clemente Rebora`, `Isaia 40, 6-8`, `I papaveri di Vetheuil`), quindi differiscono necessariamente dagli esempi nelle reference.
- [P3] La Luna della Story 2 è una rappresentazione SVG dinamica della fase e dell’illuminazione, non la fotografia campione della reference; in export il riempimento SVG viene inlined per mantenere la resa della preview.
- [P3] Il fregio centrale usa l’ornamento `Flower2` già presente nel progetto; la chiusura della Story 3 include ora un ramo botanico SVG leggero, coerente con la reference.
- [P3] Il testo biblico è un estratto derivato solo per la composizione social; il dato originale resta intatto. Il fallback APOD mantiene titolo/credito e una superficie vuota coerente quando il provider non risponde.
- [P3] Il titolo visivo della Story 2 è stato rimosso su richiesta; la griglia è stata ricentrata e portata più in alto nello spazio liberato. Il nome della Story resta nel modal per identificarla.

### Verifica funzionale e tecnica

| Check | Result |
|---|---|
| Preview desktop/mobile | Passed — 3 root 9:16; mobile `362 x 644` per preview, `scrollWidth = 390` |
| Story 2 title/labels | Passed — nessun title block; label `CONSIGLIO MUSICALE` e `CIELO DEL GIORNO` presenti |
| Modal | Passed — 3 preview, 3 `Scarica PNG`, `Scarica tutte`; nessun overflow orizzontale |
| Export PNG | Passed — tutti e tre `1080 x 1920`, `srgba`, `opaque = True` |
| Export collettivo | Passed — generati `/Users/antonello/Downloads/coordinate-del-giorno-2026-08-29 (7).png`, `/Users/antonello/Downloads/le-cose-del-giorno-2026-08-29 (4).png`, `/Users/antonello/Downloads/da-portare-con-se-2026-08-29 (4).png` |
| Console browser | Passed — nessun errore o warning nella verifica finale |
| `npm run lint` | Passed — 0 errori, 18 warning preesistenti |
| `npm test` | Passed — 2 test |
| `npm run build` | Passed — Next.js 16.2.4, route `/social-preview` presente |
| `npx tsc --noEmit` | Existing failure — 2 `TS5097` preesistenti nei test `.mts`; il typecheck applicativo del build passa |
| `git diff --check` | Passed |

### Comparison history

- Reused the existing Story 1 component, export frame, data pipeline, seal, colors and typography.
- Added Story 2 as an editorial 2 x 2 composition and Story 3 as a more vertical, contemplative composition.
- Added one modal entry point beside the existing download action and kept the home controls to `[ Scarica la tavola ] [ Scarica Stories ]`.
- Added export-only SVG paint inlining for the new story canvases after detecting the stylesheet serialization issue in the moon glyph.
- Added measured export scaling and image fallbacks so variable daily content does not escape the 1080 x 1920 canvas.
- Removed the disliked Story 2 display title, moved the editorial grid upward, and renamed its music and sky labels to `Consiglio musicale` and `Cielo del giorno`.

final result: passed

## Daily Postcard QA — 1 settembre 2026

### Source and comparison

- Source visual truth: `/var/folders/__/s6qdj5m151dfvb21lyctlkzh0000gn/T/codex-clipboard-e5431507-a3b4-4d93-96ea-1db039d8b297.png`
- During QA, the source front and back were compared side by side with implementation crops in `/private/tmp/daily-postcard-front-comparison.png` and `/private/tmp/daily-postcard-back-comparison.png`; those temporary files were removed after review.
- The source is dated 31 August 2026; the live page was verified on 1 September 2026, so the artwork and day-specific astronomy values intentionally differ.

### Browser states verified

- Desktop viewport: 1280 × 720, DPR 2.
- Closed state: the postcard is visible as a narrow front-facing teaser below the existing SeasonalBookmark, with a measured 27px vertical gap and no overlap.
- Open front: local seasonal artwork, date, season/day count, artwork title/artist/year, DAY ATLAS wordmark, and turn hint are visible.
- Flipped back: moon phase and illumination, next full moon, sunrise, sunset, daylight duration, visible planets, N/C/S sky-region switcher, stamp, postmark, QR code, address lines, artwork record link, and footer are present.
- Dynamic behavior: clicking the card changes `aria-pressed` to `true`, toggles the front/back `aria-hidden` states, and the N region updates to Milano with its planet readings.
- QR behavior: the QR points to `http://127.0.0.1:3000/?data=2026-09-01` in the local prototype and is labeled “Apri il giorno”.
- Close behavior: close button removes the dialog; no horizontal overflow was introduced.
- Theme states: front and back verified in both dark and light themes.
- Mobile viewport: 390 × 844 hides the desktop-only teaser and dialog, with `aria-hidden="true"` and `inert` enabled.
- Browser console: no error-level logs during the final interaction pass.

### Fidelity surfaces

1. Structure: landscape image and four-corner front metadata mirror the supplied postcard; the back uses a two-column ephemeris/postal composition with a central divider.
2. Hierarchy: the artwork leads the front; the back leads with “Effemeridi”, then groups sky readings, postal marks, and the day footer.
3. Typography: existing IM Fell Double Pica/local editorial font is reused, with restrained mono/typewriter details for small postal labels.
4. Color and contrast: cream paper and rust stamp treatments are retained in light mode; dark mode uses deep warm charcoal paper with warm ink and readable rules.
5. Depth and motion: paper grain, frame/shadows, blurred backdrop, entrance settle, and an 860ms 3D rotateY flip provide the requested physical-card feel.

### Intentional differences

- The reference presents front and back together as a static board; the prototype presents one card and reveals the back through the requested click-to-flip interaction.
- The card remains a desktop side-rail experiment at the same 1180px boundary as the existing ticket; it does not replace or alter the current SeasonalBookmark.

## Daily Postcard Ratio QA — 1 settembre 2026

### Format correction

- Requested physical format: 15 × 10 cm, represented as `aspect-ratio: 15 / 10` (3:2).
- Closed side-rail teaser: computed at 420 × 280 px, with the same 27px gap below the existing ticket.
- Open modal stage: computed at 720 × 480 px in a 1280 × 720 desktop viewport.
- Front and back screenshots were reviewed after the ratio change; the front preserves the seasonal image-led hierarchy and the back gains the vertical room needed for the postal composition.
- On 390 × 844, the desktop-only postcard remains `display: none`, `aria-hidden="true"`, and inert.

final result: passed
