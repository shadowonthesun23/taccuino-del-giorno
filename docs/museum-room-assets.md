# Museum room assets

Generated with the built-in Imagegen tool on 2026-09-09; no runtime image-generation service or new dependency. These are imagined gallery materials, not photographs of the source museum. The original artwork, metadata and museum link remain independent DOM content. WebP encoding uses the existing Sharp dependency, without changing the generated composition.

## Files

- `public/images/museum-room-sage.webp` — 1536 × 1024, 91,590 bytes.
- `public/images/museum-frame-walnut.webp` — 1254 × 1254, 223,278 bytes. Only its border is rendered, with a nine-slice border image; the blank center is discarded. Slice positions were adjusted to the actual generated opening.

## Final generation prompts

### Room

Use case: photorealistic-natural. Production asset for an elegant interactive museum room on a website, NOT a UI mockup. Create a very high resolution wide landscape architectural photograph of an EMPTY intimate historic European art gallery wall, perfectly frontal camera, symmetrical quiet composition. Entire upper 84 percent is a continuous flat matte muted dark sage olive-grey mineral plaster wall, refined very fine tactile plaster with subtle broad pigment variations, no stains or cracks. Bottom 16 percent is realistic warm smoked oak herringbone parquet in correct eye-level perspective receding to a fine understated dark wood skirting board at 84 percent height. Tiny returns of perpendicular walls only at far left and far right edges for architectural depth. Soft warm gallery lighting descends from ABOVE just left of center, broad gentle wash across central wall, gradual falloff to edges but all material remains visible, no black voids, no dramatic circular halo. Understated photographic realism, premium conservation gallery, quiet and restrained. CRITICAL: wall entirely empty, NO paintings NO frames NO plaques NO people NO text NO lamps visible NO benches NO ropes NO windows NO doors. We will place the real interactive artwork separately in code. Do not add any objects. Landscape 3:2 or wider.

### Frame

Use case: product-mockup. Production texture asset for a responsive museum picture frame (CSS nine-slice border image). Square canvas. Precisely frontal orthographic photograph of an EMPTY antique walnut museum picture frame with a very fine aged gold inner slip. Frame outer edges EXACTLY meet all four canvas edges with NO exterior margin. All four frame rails occupy exactly 12 percent of image width, leaving a square EMPTY solid neutral gray opening from x12% to88%, y12% to88%. Beautiful restrained rounded wood moulding, rich dark walnut grain along each rail (horizontal top/bottom, vertical left/right), four accurate 45-degree miter joints, subdued patina not distressed, thin warm gilded liner around inner opening. Light from upper left, delicate physical highlights on moulding and shadows within its recesses. True photographic material quality, no drawing no bevel-filter plastic. NO picture NO painting NO glass NO text NO furniture NO extra objects. Entire gray center is blank and will be discarded by code. Symmetrical consistent rail thickness. Square format.

## Layout and accessibility

The source skirting is at approximately 74% height, so the architectural image is displayed at 112% height to place it around 83% of the viewport. Portrait mobile crops the room horizontally without squeezing its architecture. Landscape mobile places the label next to the painting. The original artwork is never generated, repainted, tinted, or embedded into the shell. The room is a layered photographic scene, not a navigable 3D model.

Frame shadows derive from a shared depth variable and an upper-left lighting direction. Reduced-motion disables room transitions. Opening focuses the exit; closing restores the trigger; the hidden home is inert. Esc first exits zoom, then the room. Museum links remain accessible.

The adjacent paintings have been removed. A single `museum-camera` contains wall, floor, frame and small flush-mounted label; only this shared parent is transformed during approach and drag. The room does not fade to black, the label does not disappear, and moving the mouse without dragging does nothing. Camera offsets are bounded to prevent empty space outside the room. The fixed exit remains outside the camera. The `museum-camera.test.mts` tests cover framing, mobile approach, bounds and invalid geometry.
