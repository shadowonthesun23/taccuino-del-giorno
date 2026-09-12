# Retrieval-first content sourcing audit

This branch evaluates authentic-source retrieval in isolation. Nothing here is imported by `/api/generate`; the audit performs no Gemini call and no Supabase read or write.

## Reusable adapters

- `fetchCei2008Passage(reference)` parses and normalizes the reference, requests the explicitly versioned BibbiaEdu CEI 2008 page, verifies the page identity, and returns only the requested ordered verse nodes as `{ number, text }` plus source metadata or a structured error.
- `fetchWikiquoteCandidates(author)` resolves only the requested author's page (including official redirects) through the MediaWiki API and returns structured candidate text, author, page URL, and an explicit inline or section-level work/source when present.
- `fetchWikisourcePoem(pageTitle)` uses the MediaWiki parse API and accepts a poem only when the rendered page has both an `Autore:` link and a recognized structured poem container. It returns author, title, source text, and canonical page URL.
- `createPoliteCachedFetch()` caches identical URLs for the process, serializes Italian Wikiquote/Wikisource requests with a minimum interval, and performs at most one bounded retry after a `429`.

The future boundary is deliberately textual: Gemini may eventually choose an identifier or rank candidates, but the authenticated quote, poem, or Bible text must be copied from the adapter result without model rewriting.

## Live audit results

Run on 2026-09-12 with `npm run audit:content-retrieval`. No technical source errors or rate limits occurred.

### BibbiaEdu CEI 2008

All 15 requested audit references returned the complete requested verse-number sequence in order: **15/15 (100%)**. The test is structural, not a comparison with previously generated content. Duplicate requests are served from the in-process cache.

Extraction requires all of the following before text is returned:

- `body.content-CEI2008`;
- the expected `book-*` and `chapter-*` classes;
- every requested `.verses-container span.verse`;
- text exclusively from each verse's direct `.text-to-speech` child.

Titles, notes, navigation, verse-number controls, and content outside the requested range are not selected. The main fragility is that BibbiaEdu does not document this DOM as a public API contract: a markup change becomes a structured `source_structure_error`, not partial or guessed scripture.

### Italian Wikiquote

| Author | Page | Candidates | With declared source/work |
|---|---:|---:|---:|
| Stanisław Lem | yes | 3 | 1 |
| D. H. Lawrence (redirected to David Herbert Lawrence) | yes | 49 | 36 |
| Mary Oliver | yes | 2 | 0 |
| Cesare Pavese | yes | 260 | 253 |
| Ludovico Ariosto | yes | 85 | 82 |
| Jennifer Egan | yes | 5 | 5 |
| Andrea Camilleri | yes | 227 | 195 |
| Auguste Comte | yes | 14 | 0 |
| Antonin Artaud | yes | 56 | 44 |
| Eduardo Galeano | yes | 22 | 15 |
| Joseph Roth | yes | 80 | 74 |
| Blaise Cendrars | yes | 7 | 1 |
| Charles Baudelaire | yes | 99 | 88 |
| Mary Shelley | yes | 25 | 25 |
| Blaise Pascal | yes | 5 | 0 |
| **Total** | **15/15** | **939** | **819** |

All 15 authors have at least one candidate, so the observed author-level retrieval coverage is **15/15 (100%)**. “With declared source/work” means the source appears explicitly inline or under a non-generic work heading on Wikiquote; the adapter does not manufacture missing bibliography. The 120 candidates without one remain usable only with that limitation exposed.

The MediaWiki plaintext extract is stable enough for this small audit but its editorial structure is heterogeneous: some short pages put quotes before any heading, while larger pages nest generic headings such as “Incipit” below a work title. The parser handles both layouts and excludes “Citazioni su”, notes, bibliography, and attribution-error sections. Before production, candidate-level quality filters and more fixtures for uncommon page layouts are still warranted.

### Italian Wikisource poetry corpus

| Page | Author | Title | Structured text |
|---|---|---|---:|
| `Canti di Castelvecchio/.../L'ora di Barga` | Giovanni Pascoli | L'ora di Barga | yes, 18 lines |
| `Rime nuove/Libro III/Pianto antico` | Giosuè Carducci | Pianto antico | yes, 12 lines |
| `Alcyone/La sera fiesolana` | Gabriele D'Annunzio | La sera fiesolana | yes, 23 lines |

The representative corpus produced deterministic author/title/text/URL extraction for **3/3 pages (100%)**. This proves retrieval from known compatible pages, not general Wikisource catalog coverage. Page discovery, edition policy, multi-poem pages, and alternate templates still need a curated catalog and broader fixture set; unknown markup fails closed with a structured error.

## Readiness assessment

- **Bible:** technically ready for a retrieval-first prototype and controlled integration, because exact CEI 2008 verse ranges are deterministic. Before unattended production, add DOM-change monitoring and confirm the permitted publication/reuse boundary; do not fall back to another translation.
- **Quotes:** author coverage is promising and retrieval-first is viable, but the parser/candidate quality layer is not yet production-ready. Missing bibliographies and heterogeneous page structures must remain explicit.
- **Poetry:** known-page retrieval is deterministic, but the corpus/catalog layer is not ready for production coverage. Build a curated set of compatible works before allowing model selection by identifier.

## Validation command

```sh
npm run audit:content-retrieval
```

The script contains fixed audit inputs, emits JSON, and has no Supabase or Gemini dependency.
