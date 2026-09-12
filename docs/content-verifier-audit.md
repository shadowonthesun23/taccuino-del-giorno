# Content authenticity verifier audit

This branch contains an audit-only verifier. It is not imported by `/api/generate`, does not alter prompts or retries, does not persist verification metadata, and does not gate publication.

## Architecture

- `lib/content-verifier/matcher.ts`: conservative, lexical excerpt matcher.
- `lib/content-verifier/wikiquote.ts`: exact author-page resolution through the official Italian Wikiquote MediaWiki API, followed by a match against the API plaintext extract.
- `lib/content-verifier/wikisource.ts`: title/author search through the official Italian Wikisource MediaWiki API, rendered-page retrieval through the same API, explicit author check, then exact excerpt matching.
- `lib/content-verifier/bibbiaedu.ts`: CEI 2008 reference parser and structural DOM extraction of only the requested verse nodes.
- `scripts/audit-content-verifier.mts`: read-only sampling of the latest 15 published days. Its only Supabase operations are `select`, `order`, `limit`, and `in`.

Every adapter returns `verified`, `unverified`, or `error`, plus `sourceName`, `sourceUrl`, `matchedText`, `verificationMethod`, and `reason`.

## Conservative matching boundary

Normalization is limited to canonical Unicode equivalence, straight/typographic quotes and apostrophes, typographic spacing, tabs, repeated whitespace, and line breaks. It does not lowercase content, replace punctuation, accept synonyms, compute semantic similarity, use embeddings, or translate text.

`[...]` and `…` split an excerpt into literal chunks. Every non-empty chunk must occur verbatim after normalization and in the same order in the source.

## BibbiaEdu technical finding

A single technical request to `https://www.bibbiaedu.it/CEI2008/at/Pr/2/` returned HTTP 200 and an explicitly versioned CEI 2008 document. The DOM distinguishes content deterministically:

- the page identity is declared by body classes such as `content-CEI2008`, `book-Pr`, and `chapter-2`;
- scripture is under `.verses-container span.verse` (including the first verse nested with the chapter numeral);
- each verse text is in the direct child `.text-to-speech`;
- verse numbers are in `.verse_number` or the first-verse note button;
- headings and commentary are in sibling `.inline-note` / notes sections and are not selected.

The adapter therefore does not scan the whole HTML and does not use regex to guess scripture boundaries. It validates translation, book, chapter, and the complete requested verse range before matching.

This remains suitable only as an audit source for now: BibbiaEdu exposes no documented public verse API in the inspected page, and its DOM contract is not guaranteed stable. Any missing selector, missing verse, version mismatch, or unexpected page identity is reported as `error`, never silently interpreted as an inauthentic passage.

## Running

```sh
node --test tests/content-verifier.test.mts
npm run audit:content-verifier
```

The audit prints JSON to standard output. It performs no writes to Supabase and makes no Gemini request.
