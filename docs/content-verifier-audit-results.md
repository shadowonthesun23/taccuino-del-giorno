# Content verifier audit results — 2026-09-12

Read-only sample: the latest 15 rows in `contenuti_giornalieri`, with any published `editorial_content_overrides` applied in memory. No record was inserted, updated, or deleted. No generation route or Gemini API was called.

## Summary

| Source | Controllable | Verified | Unverified | Error | Verified coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| Wikiquote IT | 15 | 1 | 14 | 0 | 6.7% |
| Wikisource IT | 15 | 0 | 15 | 0 | 0.0% |
| BibbiaEdu CEI 2008 | 15 | 0 | 15 | 0 | 0.0% |
| **Total** | **45** | **1** | **44** | **0** | **2.2%** |

`unverified` means only that the strict audit source did not confirm the stored wording. It does not mean that the content was automatically classified as fabricated.

## Per-day outcome

Legend: V = verified, U = unverified, E = error.

| Date | Quote | Poem | Bible |
| --- | :---: | :---: | :---: |
| 2026-09-12 | U | U | U |
| 2026-09-11 | U | U | U |
| 2026-09-10 | U | U | U |
| 2026-09-09 | V | U | U |
| 2026-09-08 | U | U | U |
| 2026-09-07 | U | U | U |
| 2026-09-06 | U | U | U |
| 2026-09-05 | U | U | U |
| 2026-09-04 | U | U | U |
| 2026-09-03 | U | U | U |
| 2026-09-02 | U | U | U |
| 2026-09-01 | U | U | U |
| 2026-08-31 | U | U | U |
| 2026-08-30 | U | U | U |
| 2026-08-29 | U | U | U |

The confirmed item is the Cesare Pavese quote dated 2026-09-09, matched on the requested author page.

## Failure analysis

- Wikiquote: all 14 failures resolved to the requested author page, but the exact normalized wording was absent. This may indicate a different Italian edition/translation or missing Wikiquote coverage; the result is not a falsity judgment.
- Wikisource: 8 of 15 searches returned no usable work for the supplied title/author; 7 found author-linked candidate pages but not the exact excerpt. Coverage is constrained by title metadata, editions, transclusion, and copyright availability. In manually reviewed examples, stored text also contained real lexical differences from the source, not merely line-break or quotation-mark differences.
- BibbiaEdu: all 15 versioned CEI 2008 chapter pages and requested verse ranges were extracted successfully after accounting for the first verse being nested with the chapter numeral. All 15 stored passages differed lexically from the selected CEI 2008 verses. A representative stored Proverbi 4,23 uses `Con ogni diligenza custodisci...`, which is not the exact wording returned by BibbiaEdu CEI 2008.
- Technical source failures in the final rate-limited run: 0. An initial unthrottled run triggered Wikimedia HTTP 429 responses; the audit runner now serializes Wikimedia requests, caches duplicate URLs, and retries one 429 response with a bounded wait.

## Gate assessment

- Wikiquote's official MediaWiki API is technically suitable for positive evidence, but 6.7% sample coverage is far too low for a production gate.
- Wikisource's official MediaWiki API is technically usable, but 0% sample verification and work-discovery/edition gaps make it unsuitable as a gate.
- BibbiaEdu is the correct requested translation and its current DOM separates verses from headings and notes deterministically. However, it has no documented public verse API in the inspected page, its HTML contract may change, and the sample produced 0% exact matches. It is not yet reliable enough as a production gate.

The current verifier should remain audit-only. None of the three sources should block publication on the evidence from this sample.
