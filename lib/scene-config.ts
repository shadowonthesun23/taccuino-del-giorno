export const SCENE_SCHEMA_VERSION = 1 as const;

export type SceneAssetType = 'bundled-image' | 'storage-image';
export type SceneRendererType = 'espresso-smoke' | 'ink-bottle-image' | 'seasonal-image';
export type SceneAnchorX = 'left' | 'right';
export type SceneAnchorY = 'top' | 'bottom';
export type SceneLengthUnit = 'px' | 'rem' | 'vw' | 'vh';
export type SceneMode = 'edit' | 'preview' | 'online';

export type SceneLengthTerm = {
  value: number;
  unit: SceneLengthUnit;
};

export type SceneLinearLength = {
  kind: 'linear';
  terms: readonly SceneLengthTerm[];
};

export type SceneClampLength = {
  kind: 'clamp';
  min: SceneLinearLength;
  preferred: SceneLinearLength;
  max: SceneLinearLength;
};

export type SceneLength = SceneLinearLength | SceneClampLength;

export type ScenePlacement = {
  offsetX: SceneLength;
  offsetY: SceneLength;
  width: SceneLength;
  scale: number;
  rotation: number;
  zIndex: number;
  opacity?: number;
  darkModeOpacity?: number;
};

export type SceneResponsiveCondition = {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
};

export type SceneResponsiveRule = {
  when: SceneResponsiveCondition;
  visible?: boolean;
  placement?: Partial<ScenePlacement>;
};

export type SceneSeasonalMetadata = {
  activeFrom: `${number}-${number}`;
  activeUntil: `${number}-${number}`;
  activation: 'metadata-only' | 'calendar';
  legacySeason?: 'spring' | 'summer' | 'autumn' | 'winter';
};

export type SceneAsset = {
  id: string;
  type: SceneAssetType;
  src: string;
  darkSrc?: string;
  intrinsicWidth: number;
  intrinsicHeight: number;
};

export type SceneObjectConfig = {
  id: string;
  name: string;
  asset: SceneAsset;
  renderer: SceneRendererType;
  locked: boolean;
  visible: boolean;
  anchorX: SceneAnchorX;
  anchorY: SceneAnchorY;
  aspectRatio: readonly [number, number];
  placement: ScenePlacement;
  responsive: {
    width: readonly SceneResponsiveRule[];
    height: readonly SceneResponsiveRule[];
  };
  seasonal?: SceneSeasonalMetadata;
};

export type SceneConfig = {
  schemaVersion: typeof SCENE_SCHEMA_VERSION;
  id: string;
  name: string;
  objects: readonly SceneObjectConfig[];
};

export type SceneConfigValidation =
  | { ok: true; value: SceneConfig }
  | { ok: false; issues: readonly string[] };

const SCENE_LENGTH_UNITS = new Set<SceneLengthUnit>(['px', 'rem', 'vw', 'vh']);
const SCENE_RENDERERS = new Set<SceneRendererType>([
  'espresso-smoke',
  'ink-bottle-image',
  'seasonal-image',
]);
const SCENE_ASSET_TYPES = new Set<SceneAssetType>(['bundled-image', 'storage-image']);
const SCENE_ANCHORS_X = new Set<SceneAnchorX>(['left', 'right']);
const SCENE_ANCHORS_Y = new Set<SceneAnchorY>(['top', 'bottom']);
const SCENE_SEASONS = new Set(['spring', 'summer', 'autumn', 'winter']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
}

function isMonthDay(value: unknown): value is `${number}-${number}` {
  if (typeof value !== 'string' || !/^\d{2}-\d{2}$/.test(value)) return false;
  const [month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(2000, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateLinearLength(value: unknown, path: string, issues: string[]): value is SceneLinearLength {
  if (!isRecord(value) || value.kind !== 'linear' || !Array.isArray(value.terms)) {
    issues.push(`${path} must be a linear length.`);
    return false;
  }
  if (value.terms.length < 1 || value.terms.length > 3) {
    issues.push(`${path}.terms must contain between one and three numeric terms.`);
    return false;
  }
  value.terms.forEach((term, index) => {
    if (
      !isRecord(term) ||
      !isFiniteNumber(term.value) ||
      typeof term.unit !== 'string' ||
      !SCENE_LENGTH_UNITS.has(term.unit as SceneLengthUnit)
    ) {
      issues.push(`${path}.terms[${index}] is invalid.`);
    }
  });
  return true;
}

function validateLength(value: unknown, path: string, issues: string[]): value is SceneLength {
  if (!isRecord(value)) {
    issues.push(`${path} must be a scene length.`);
    return false;
  }
  if (value.kind === 'linear') return validateLinearLength(value, path, issues);
  if (value.kind !== 'clamp') {
    issues.push(`${path}.kind is unsupported.`);
    return false;
  }
  return [
    validateLinearLength(value.min, `${path}.min`, issues),
    validateLinearLength(value.preferred, `${path}.preferred`, issues),
    validateLinearLength(value.max, `${path}.max`, issues),
  ].every(Boolean);
}

function validatePlacement(value: unknown, path: string, issues: string[], partial = false) {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`);
    return false;
  }

  const requiredLengths = ['offsetX', 'offsetY', 'width'] as const;
  requiredLengths.forEach((key) => {
    if (!partial || value[key] !== undefined) validateLength(value[key], `${path}.${key}`, issues);
  });

  const numericBounds = {
    scale: [0.01, 20],
    rotation: [-360, 360],
    zIndex: [-100, 1000],
    opacity: [0, 1],
    darkModeOpacity: [0, 1],
  } as const;

  for (const [key, [min, max]] of Object.entries(numericBounds)) {
    const current = value[key];
    const required = !partial && (key === 'scale' || key === 'rotation' || key === 'zIndex');
    if (current === undefined && !required) continue;
    if (!isFiniteNumber(current) || current < min || current > max) {
      issues.push(`${path}.${key} must be between ${min} and ${max}.`);
    }
  }
  return true;
}

function validateCondition(value: unknown, path: string, issues: string[]) {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`);
    return;
  }
  const keys = ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'] as const;
  let populated = false;
  keys.forEach((key) => {
    const current = value[key];
    if (current === undefined) return;
    populated = true;
    if (!isFiniteNumber(current) || current < 0 || current > 10000) {
      issues.push(`${path}.${key} must be a finite viewport size.`);
    }
  });
  if (!populated) issues.push(`${path} must contain a viewport boundary.`);
}

function validateResponsiveRules(value: unknown, path: string, issues: string[]) {
  if (!Array.isArray(value) || value.length > 12) {
    issues.push(`${path} must be an array with at most twelve rules.`);
    return;
  }
  value.forEach((rule, index) => {
    const rulePath = `${path}[${index}]`;
    if (!isRecord(rule)) {
      issues.push(`${rulePath} must be an object.`);
      return;
    }
    validateCondition(rule.when, `${rulePath}.when`, issues);
    if (rule.visible !== undefined && typeof rule.visible !== 'boolean') {
      issues.push(`${rulePath}.visible must be boolean.`);
    }
    if (rule.placement !== undefined) {
      validatePlacement(rule.placement, `${rulePath}.placement`, issues, true);
    }
  });
}

function validateAsset(value: unknown, path: string, issues: string[]) {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`);
    return;
  }
  if (!isIdentifier(value.id)) issues.push(`${path}.id is invalid.`);
  if (typeof value.type !== 'string' || !SCENE_ASSET_TYPES.has(value.type as SceneAssetType)) {
    issues.push(`${path}.type is unsupported.`);
  }
  const sources = [value.src, value.darkSrc].filter((source): source is string => typeof source === 'string');
  if (typeof value.src !== 'string' || (value.darkSrc !== undefined && typeof value.darkSrc !== 'string')) {
    issues.push(`${path} asset sources must be strings.`);
  }
  sources.forEach((source) => {
    if (source.includes('..')) {
      issues.push(`${path} contains an unsafe asset source.`);
      return;
    }
    if (value.type === 'bundled-image' && !source.startsWith('/images/')) {
      issues.push(`${path} bundled sources must live under /images/.`);
    }
    if (value.type === 'storage-image' && !source.startsWith('https://')) {
      issues.push(`${path} storage sources must use HTTPS.`);
    }
  });
  if (!isFiniteNumber(value.intrinsicWidth) || value.intrinsicWidth <= 0) {
    issues.push(`${path}.intrinsicWidth must be positive.`);
  }
  if (!isFiniteNumber(value.intrinsicHeight) || value.intrinsicHeight <= 0) {
    issues.push(`${path}.intrinsicHeight must be positive.`);
  }
}

function validateSeasonalMetadata(value: unknown, path: string, issues: string[]) {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`);
    return;
  }
  if (!isMonthDay(value.activeFrom)) issues.push(`${path}.activeFrom must be MM-DD.`);
  if (!isMonthDay(value.activeUntil)) issues.push(`${path}.activeUntil must be MM-DD.`);
  if (value.activation !== 'metadata-only' && value.activation !== 'calendar') {
    issues.push(`${path}.activation is unsupported.`);
  }
  if (value.legacySeason !== undefined && !SCENE_SEASONS.has(value.legacySeason as string)) {
    issues.push(`${path}.legacySeason is unsupported.`);
  }
}

export function validateSceneConfig(input: unknown): SceneConfigValidation {
  const issues: string[] = [];
  if (!isRecord(input)) return { ok: false, issues: ['Scene config must be an object.'] };

  if (input.schemaVersion !== SCENE_SCHEMA_VERSION) issues.push('schemaVersion must be 1.');
  if (!isIdentifier(input.id)) issues.push('id is invalid.');
  if (typeof input.name !== 'string' || input.name.trim().length < 1 || input.name.length > 100) {
    issues.push('name is invalid.');
  }
  if (!Array.isArray(input.objects) || input.objects.length < 1 || input.objects.length > 32) {
    issues.push('objects must contain between one and thirty-two entries.');
  } else {
    const ids = new Set<string>();
    input.objects.forEach((object, index) => {
      const path = `objects[${index}]`;
      if (!isRecord(object)) {
        issues.push(`${path} must be an object.`);
        return;
      }
      if (!isIdentifier(object.id)) issues.push(`${path}.id is invalid.`);
      else if (ids.has(object.id)) issues.push(`${path}.id must be unique.`);
      else ids.add(object.id);
      if (typeof object.name !== 'string' || object.name.trim().length < 1 || object.name.length > 100) {
        issues.push(`${path}.name is invalid.`);
      }
      validateAsset(object.asset, `${path}.asset`, issues);
      if (typeof object.renderer !== 'string' || !SCENE_RENDERERS.has(object.renderer as SceneRendererType)) {
        issues.push(`${path}.renderer is unsupported.`);
      }
      if (typeof object.locked !== 'boolean') issues.push(`${path}.locked must be boolean.`);
      if (typeof object.visible !== 'boolean') issues.push(`${path}.visible must be boolean.`);
      if (typeof object.anchorX !== 'string' || !SCENE_ANCHORS_X.has(object.anchorX as SceneAnchorX)) {
        issues.push(`${path}.anchorX is unsupported.`);
      }
      if (typeof object.anchorY !== 'string' || !SCENE_ANCHORS_Y.has(object.anchorY as SceneAnchorY)) {
        issues.push(`${path}.anchorY is unsupported.`);
      }
      if (
        !Array.isArray(object.aspectRatio) ||
        object.aspectRatio.length !== 2 ||
        !object.aspectRatio.every((part) => isFiniteNumber(part) && part > 0)
      ) {
        issues.push(`${path}.aspectRatio must contain two positive numbers.`);
      }
      validatePlacement(object.placement, `${path}.placement`, issues);
      if (!isRecord(object.responsive)) {
        issues.push(`${path}.responsive must be an object.`);
      } else {
        validateResponsiveRules(object.responsive.width, `${path}.responsive.width`, issues);
        validateResponsiveRules(object.responsive.height, `${path}.responsive.height`, issues);
      }
      if (object.seasonal !== undefined) {
        validateSeasonalMetadata(object.seasonal, `${path}.seasonal`, issues);
      }
    });
  }

  return issues.length === 0
    ? { ok: true, value: input as SceneConfig }
    : { ok: false, issues };
}

function formatTerm(term: SceneLengthTerm) {
  const value = Object.is(term.value, -0) ? 0 : term.value;
  return `${value}${term.unit}`;
}

function formatLinearLength(length: SceneLinearLength) {
  if (length.terms.length === 1) return formatTerm(length.terms[0]);
  return `calc(${length.terms.map((term, index) => {
    if (index === 0) return formatTerm(term);
    const sign = term.value < 0 ? '-' : '+';
    return `${sign} ${formatTerm({ ...term, value: Math.abs(term.value) })}`;
  }).join(' ')})`;
}

export function sceneLengthToCss(length: SceneLength) {
  if (length.kind === 'linear') return formatLinearLength(length);
  return `clamp(${formatLinearLength(length.min)}, ${formatLinearLength(length.preferred)}, ${formatLinearLength(length.max)})`;
}

export function resolveSceneConfig(candidate: unknown, fallback: SceneConfig) {
  if (candidate === undefined || candidate === null) return fallback;
  const result = validateSceneConfig(candidate);
  return result.ok ? result.value : fallback;
}

function mediaConditionToCss(condition: SceneResponsiveCondition) {
  const entries = [
    condition.minWidth === undefined ? null : `(min-width: ${condition.minWidth}px)`,
    condition.maxWidth === undefined ? null : `(max-width: ${condition.maxWidth}px)`,
    condition.minHeight === undefined ? null : `(min-height: ${condition.minHeight}px)`,
    condition.maxHeight === undefined ? null : `(max-height: ${condition.maxHeight}px)`,
  ].filter((entry): entry is string => Boolean(entry));
  return entries.join(' and ');
}

function placementToDeclarations(
  object: SceneObjectConfig,
  placement: Partial<ScenePlacement>,
  includeStructure = false,
) {
  const declarations: string[] = [];
  if (includeStructure) {
    declarations.push(
      'display: none',
      'pointer-events: none',
      'position: absolute',
      `aspect-ratio: ${object.aspectRatio[0]} / ${object.aspectRatio[1]}`,
    );
  }
  if (placement.offsetX) declarations.push(`${object.anchorX}: ${sceneLengthToCss(placement.offsetX)}`);
  if (placement.offsetY) declarations.push(`${object.anchorY}: ${sceneLengthToCss(placement.offsetY)}`);
  if (placement.width) declarations.push(`width: ${sceneLengthToCss(placement.width)}`);
  if (placement.zIndex !== undefined) declarations.push(`z-index: ${placement.zIndex}`);
  if (placement.rotation !== undefined) declarations.push(`--scene-object-rotation: ${placement.rotation}deg`);
  if (placement.scale !== undefined) declarations.push(`--scene-object-scale: ${placement.scale}`);
  return declarations.join('; ');
}

export function sceneConfigToCss(scene: SceneConfig) {
  const rules: string[] = [];

  scene.objects.forEach((object) => {
    const selector = `[data-scene-object="${object.id}"]`;
    rules.push(`${selector} { ${placementToDeclarations(object, object.placement, true)}; }`);

    if (object.renderer === 'seasonal-image' && object.placement.opacity !== undefined) {
      rules.push(`${selector} .seasonal-desk-object-image { opacity: ${object.placement.opacity}; }`);
      if (object.placement.darkModeOpacity !== undefined) {
        rules.push(`${selector}.is-dark .seasonal-desk-object-image { opacity: ${object.placement.darkModeOpacity}; }`);
      }
    }

    [...object.responsive.width, ...object.responsive.height].forEach((rule) => {
      const declarations = [
        rule.visible === undefined ? null : `display: ${rule.visible ? 'block' : 'none'}`,
        rule.placement ? placementToDeclarations(object, rule.placement) : null,
      ].filter((entry): entry is string => Boolean(entry));
      rules.push(`@media ${mediaConditionToCss(rule.when)} { ${selector} { ${declarations.join('; ')}; } }`);
    });
  });

  return rules.join('\n');
}
