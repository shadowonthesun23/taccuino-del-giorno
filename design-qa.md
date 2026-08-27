**Findings**

- [P1] Browser-rendered visual comparison not yet available.
  Location: `DailyCorrespondences` on the home page.
  Evidence: the selected source visual is available at `/Users/antonello/.codex/generated_images/01a03ec5-d76b-79d2-8d7c-aaa652e8148f/exec-2a415c12-65ef-4163-bf53-6f2d39ed3660.png`, but the in-app browser could not reach the local development server and Chrome was unavailable in this session.
  Impact: typography, grid rhythm, responsive layout, image cropping, and export composition cannot be visually compared with sufficient confidence.
  Fix: with the user's approval, open the local app in their chosen browser, capture desktop and mobile states, compare them with the source, and iterate on any P0/P1/P2 differences.

**Open Questions**

- The project instructions ask not to run visual browser checks unless the user requests them, in order to conserve credits. This QA pass therefore does not override that constraint.

**Implementation Checklist**

- [x] Add the source-grounded `Le Corrispondenze del Giorno` section.
- [x] Connect each atlas point to its corresponding reading section.
- [x] Add a 9:16 PNG export and unify the existing card-export colophon.
- [x] Pass build, test, and whitespace checks.
- [ ] Capture and compare browser-rendered desktop and mobile states with the selected source visual.

**Follow-up Polish**

- Verify the exact perceived weight of the display headline and the central artwork crop against real daily data after browser capture.

## Comparison evidence

- Source visual truth: `/Users/antonello/.codex/generated_images/01a03ec5-d76b-79d2-8d7c-aaa652e8148f/exec-2a415c12-65ef-4163-bf53-6f2d39ed3660.png`
- Source dimensions: 1487 x 1058 px.
- Implementation screenshot: not captured.
- Viewport / CSS size / density normalization: not available because the in-app browser could not reach the local development server; Chrome was unavailable as a fallback.
- State: intended default light-theme home state; desktop atlas section and its mobile/export layouts are implemented, but not visually captured.
- Full-view comparison: blocked until a same-state browser screenshot exists.
- Focused-region comparison: blocked for the same reason.
- Primary interactions implemented: four scroll targets, follow-reading action, and PNG export; not browser-tested in this QA pass.
- Console errors checked: not available; the local page could not be opened in the available browser.

## Comparison history

- The local server was started on port 3001. The in-app browser returned a connection-refused error for that server and Chrome was not available, so no visual comparison iteration could occur. The implementation remains covered by production-build type checking.

final result: blocked
