import {
  SCENE_SCHEMA_VERSION,
  type SceneConfig,
  type SceneLength,
  type SceneLinearLength,
  validateSceneConfig,
} from './scene-config.ts';

const linear = (value: number, unit: 'px' | 'rem' | 'vw' | 'vh'): SceneLinearLength => ({
  kind: 'linear',
  terms: [{ value, unit }],
});

const calc = (...terms: SceneLinearLength['terms']): SceneLinearLength => ({ kind: 'linear', terms });

const clamp = (
  min: SceneLinearLength,
  preferred: SceneLinearLength,
  max: SceneLinearLength,
): SceneLength => ({ kind: 'clamp', min, preferred, max });

export const HOME_SCENE_BASELINE_V1 = {
  schemaVersion: SCENE_SCHEMA_VERSION,
  id: 'home',
  name: 'Baseline v1 · Production 60ed51c',
  objects: [
    {
      id: 'coffee-cup',
      name: 'Tazza',
      asset: {
        id: 'coffee-production-v1',
        type: 'bundled-image',
        src: '/images/coffee-white2.png',
        darkSrc: '/images/coffee-darkmode.png',
        intrinsicWidth: 1135,
        intrinsicHeight: 1155,
      },
      renderer: 'espresso-smoke',
      locked: true,
      visible: true,
      anchorX: 'left',
      anchorY: 'top',
      aspectRatio: [1, 1],
      placement: {
        offsetX: clamp(linear(-150, 'px'), linear(-6, 'vw'), linear(-96, 'px')),
        offsetY: linear(-104, 'px'),
        width: clamp(linear(380, 'px'), linear(24, 'vw'), linear(500, 'px')),
        scale: 1,
        rotation: -3.5,
        zIndex: 6,
        opacity: 1,
      },
      responsive: {
        width: [
          { when: { maxWidth: 1023 }, visible: false },
          { when: { minWidth: 1024 }, visible: true },
        ],
        height: [],
      },
    },
    {
      id: 'ink-bottle',
      name: 'Boccetta',
      asset: {
        id: 'ink-bottle-and-cap-production-v1',
        type: 'bundled-image',
        src: '/images/ink-bottle-and-cap.png',
        intrinsicWidth: 1254,
        intrinsicHeight: 1254,
      },
      renderer: 'ink-bottle-image',
      locked: true,
      visible: true,
      anchorX: 'left',
      anchorY: 'top',
      aspectRatio: [1, 1],
      placement: {
        offsetX: clamp(
          linear(-60, 'px'),
          calc({ value: 50, unit: 'vw' }, { value: -792, unit: 'px' }),
          linear(8, 'px'),
        ),
        offsetY: clamp(linear(520, 'px'), linear(62.5, 'vh'), linear(600, 'px')),
        width: clamp(linear(340, 'px'), linear(23, 'vw'), linear(390, 'px')),
        scale: 1,
        rotation: -6,
        zIndex: 5,
        opacity: 1,
      },
      responsive: {
        width: [
          { when: { maxWidth: 1439 }, visible: false },
          { when: { minWidth: 1440 }, visible: true },
        ],
        height: [
          {
            when: { minWidth: 1440, maxHeight: 920 },
            placement: {
              offsetY: clamp(
                linear(310, 'px'),
                calc({ value: 100, unit: 'vh' }, { value: -410, unit: 'px' }),
                linear(510, 'px'),
              ),
            },
          },
          { when: { minWidth: 1440, maxHeight: 700 }, visible: false },
        ],
      },
    },
    {
      id: 'seasonal-fig',
      name: 'Fico',
      asset: {
        id: 'seasonal-fig-production-v1',
        type: 'bundled-image',
        src: '/images/seasonal/day-atlas-fico-stagionale.webp',
        intrinsicWidth: 1435,
        intrinsicHeight: 1118,
      },
      renderer: 'seasonal-image',
      locked: false,
      visible: true,
      anchorX: 'right',
      anchorY: 'bottom',
      aspectRatio: [1435, 1118],
      placement: {
        offsetX: clamp(linear(1, 'rem'), linear(2, 'vw'), linear(2.5, 'rem')),
        offsetY: clamp(linear(1.4, 'rem'), linear(4.6, 'vh'), linear(3.6, 'rem')),
        width: clamp(linear(180, 'px'), linear(14, 'vw'), linear(220, 'px')),
        scale: 1,
        rotation: 0,
        zIndex: 4,
        opacity: 0.82,
        darkModeOpacity: 0.62,
      },
      responsive: {
        width: [
          { when: { maxWidth: 1180 }, visible: false },
          { when: { minWidth: 1181 }, visible: true },
          {
            when: { minWidth: 1600 },
            placement: {
              offsetX: clamp(linear(2.75, 'rem'), linear(5, 'vw'), linear(5.25, 'rem')),
              width: clamp(linear(260, 'px'), linear(17, 'vw'), linear(310, 'px')),
            },
          },
        ],
        height: [{ when: { maxHeight: 700 }, visible: false }],
      },
      seasonal: {
        activeFrom: '09-01',
        activeUntil: '09-30',
        // Phase 1 records the intended September window but deliberately keeps
        // the public `season === "summer"` behavior. Change this to `calendar`
        // only when the scheduler is wired to the published scene in a later phase.
        activation: 'metadata-only',
        legacySeason: 'summer',
      },
    },
  ],
} satisfies SceneConfig;

const baselineValidation = validateSceneConfig(HOME_SCENE_BASELINE_V1);
if (!baselineValidation.ok) {
  throw new Error(`Invalid compiled home scene baseline: ${baselineValidation.issues.join(' ')}`);
}
