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
