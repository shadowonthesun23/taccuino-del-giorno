'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import type { SceneMode } from '@/lib/scene-config';
import {
  HOME_SCENE_DRAFT_BASELINE_V1,
  SCENE_OBJECT_IDS,
  cloneBaselineSceneDraft,
  resolveSceneDraft,
  updateSceneDraft,
  type SceneDraft,
  type SceneObjectDraftPatch,
  type SceneObjectId,
} from '@/lib/scene-draft';
import {
  STUDIO_DRAFT_CHANGE_MESSAGE,
  STUDIO_PREVIEW_MESSAGE,
  STUDIO_RETURN_TO_EDIT_MESSAGE,
  STUDIO_SELECTION_CHANGE_MESSAGE,
  STUDIO_TOGGLE_UI_MESSAGE,
} from '@/lib/studio-preview-protocol';
import {
  STUDIO_VIEWPORT_PRESETS,
  calculatePreviewScale,
  clampPanelPosition,
  getStudioViewportPreset,
  type Point,
  type StudioViewportPresetId,
} from '@/lib/studio-viewport';
import styles from './studio.module.css';

const PANEL_STORAGE_KEY = 'day-atlas-scene-studio-panels-v1';
const DRAFT_STORAGE_KEY = 'day-atlas-scene-studio-draft-v1';

type PanelId = 'viewport' | 'objects' | 'properties';
type PanelPositions = Record<PanelId, Point>;

const INITIAL_POSITIONS: PanelPositions = {
  viewport: { x: 24, y: 24 },
  objects: { x: 1124, y: 24 },
  properties: { x: 1124, y: 254 },
};

const OBJECT_LABELS: Record<SceneObjectId, string> = {
  'coffee-cup': 'Tazza',
  'ink-bottle': 'Boccetta',
  'seasonal-fig': 'Fico',
};

function isPoint(value: unknown): value is Point {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Number.isFinite((value as Point).x) &&
      Number.isFinite((value as Point).y),
  );
}

function parseStoredPositions(value: string | null): Partial<PanelPositions> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return {
      ...(isPoint(parsed.viewport) ? { viewport: parsed.viewport } : {}),
      ...(isPoint(parsed.objects) ? { objects: parsed.objects } : {}),
      ...(isPoint(parsed.properties) ? { properties: parsed.properties } : {}),
    };
  } catch {
    return {};
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function isSceneObjectId(value: unknown): value is SceneObjectId {
  return typeof value === 'string' && SCENE_OBJECT_IDS.some((id) => id === value);
}

function FloatingPanel({
  id,
  title,
  position,
  onPositionChange,
  onReset,
  children,
}: {
  id: PanelId;
  title: string;
  position: Point;
  onPositionChange: (position: Point) => void;
  onReset: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: Point;
  } | null>(null);
  const [minimized, setMinimized] = useState(false);

  const clampToViewport = useCallback((nextPosition: Point) => {
    const panel = panelRef.current;
    return clampPanelPosition(
      nextPosition,
      { width: panel?.offsetWidth ?? 280, height: panel?.offsetHeight ?? 180 },
      { width: window.innerWidth, height: window.innerHeight },
    );
  }, []);

  useEffect(() => {
    const handleResize = () => onPositionChange(clampToViewport(position));
    const clamped = clampToViewport(position);
    if (clamped.x !== position.x || clamped.y !== position.y) onPositionChange(clamped);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampToViewport, minimized, onPositionChange, position]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button, input, select')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: position,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    onPositionChange(
      clampToViewport({
        x: drag.origin.x + event.clientX - drag.startX,
        y: drag.origin.y + event.clientY - drag.startY,
      }),
    );
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  return (
    <section
      ref={panelRef}
      className={styles.panel}
      data-studio-panel={id}
      style={{ left: position.x, top: position.y }}
    >
      <div
        className={styles.panelHeader}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <strong>{title}</strong>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setMinimized((current) => !current)}
          aria-label={minimized ? `Espandi ${title}` : `Riduci ${title}`}
          aria-expanded={!minimized}
        >
          {minimized ? '+' : '−'}
        </button>
      </div>
      {minimized ? null : (
        <div className={styles.panelBody}>
          {children}
          <button type="button" className={styles.secondaryButton} onClick={onReset}>
            Reset posizione
          </button>
        </div>
      )}
    </section>
  );
}

function NumericField({
  label,
  value,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.numericField}>
      <span>{label}</span>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        step={step}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </label>
  );
}

export default function StudioShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewportId, setViewportId] = useState<StudioViewportPresetId>('1440x900');
  const [mode, setMode] = useState<SceneMode>('edit');
  const [uiHidden, setUiHidden] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<SceneObjectId>('seasonal-fig');
  const [draft, setDraft] = useState<SceneDraft>(HOME_SCENE_DRAFT_BASELINE_V1);
  const [draftRestored, setDraftRestored] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 1440, height: 900 });
  const [positions, setPositions] = useState<PanelPositions>(INITIAL_POSITIONS);
  const [positionsRestored, setPositionsRestored] = useState(false);
  const viewport = getStudioViewportPreset(viewportId);
  const selectedObject = draft.objects[selectedObjectId];

  const sendPreviewEnvironment = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: STUDIO_PREVIEW_MESSAGE,
        mode,
        viewport: viewport.id,
        sceneDraft: draft,
        selectedObjectId,
        showEditor: mode === 'edit' && !uiHidden,
      },
      window.location.origin,
    );
  }, [draft, mode, selectedObjectId, uiHidden, viewport.id]);

  useEffect(() => {
    const updateWindowSize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      const candidate = message as Record<string, unknown>;
      if (candidate.type === STUDIO_TOGGLE_UI_MESSAGE) {
        setUiHidden((current) => !current);
      } else if (candidate.type === STUDIO_RETURN_TO_EDIT_MESSAGE) {
        setMode('edit');
        setUiHidden(false);
      } else if (candidate.type === STUDIO_SELECTION_CHANGE_MESSAGE && isSceneObjectId(candidate.objectId)) {
        setSelectedObjectId(candidate.objectId);
      } else if (candidate.type === STUDIO_DRAFT_CHANGE_MESSAGE && isSceneObjectId(candidate.objectId)) {
        const patch = candidate.patch;
        if (patch && typeof patch === 'object' && !Array.isArray(patch)) {
          setDraft((current) => updateSceneDraft(current, candidate.objectId as SceneObjectId, patch as SceneObjectDraftPatch));
        }
      } else if (candidate.type === 'day-atlas:studio-preview-ready') {
        sendPreviewEnvironment();
      }
    };
    window.addEventListener('message', handlePreviewMessage);
    return () => window.removeEventListener('message', handlePreviewMessage);
  }, [sendPreviewEnvironment]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedPositions = parseStoredPositions(window.localStorage.getItem(PANEL_STORAGE_KEY));
      const rightX = Math.max(24, window.innerWidth - 292);
      setPositions({
        viewport: storedPositions.viewport ?? INITIAL_POSITIONS.viewport,
        objects: storedPositions.objects ?? { x: rightX, y: 24 },
        properties: storedPositions.properties ?? { x: rightX, y: 254 },
      });
      const storedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (storedDraft) {
        try {
          setDraft(resolveSceneDraft(JSON.parse(storedDraft)));
        } catch {
          setDraft(cloneBaselineSceneDraft());
        }
      }
      setPositionsRestored(true);
      setDraftRestored(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!positionsRestored) return;
    window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(positions));
  }, [positions, positionsRestored]);

  useEffect(() => {
    if (!draftRestored) return;
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft, draftRestored]);

  useEffect(() => {
    sendPreviewEnvironment();
  }, [sendPreviewEnvironment]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (event.key === 'Escape' && mode === 'preview') {
        event.preventDefault();
        setMode('edit');
        setUiHidden(false);
        return;
      }
      if (event.key.toLowerCase() !== 'h' || mode !== 'edit') return;
      event.preventDefault();
      setUiHidden((current) => !current);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  const scale = calculatePreviewScale(viewport, windowSize);

  function updatePanelPosition(id: PanelId, position: Point) {
    setPositions((current) => ({ ...current, [id]: position }));
  }

  function resetPanelPosition(id: PanelId) {
    const rightX = Math.max(24, window.innerWidth - 292);
    const next = id === 'viewport'
      ? INITIAL_POSITIONS.viewport
      : { x: rightX, y: id === 'objects' ? 24 : 254 };
    updatePanelPosition(id, next);
  }

  function patchSelectedObject(patch: SceneObjectDraftPatch) {
    setDraft((current) => updateSceneDraft(current, selectedObjectId, patch));
  }

  function resetDraft() {
    setDraft(cloneBaselineSceneDraft());
    setSelectedObjectId('seasonal-fig');
  }

  function enterMode(nextMode: SceneMode) {
    setMode(nextMode);
    setUiHidden(false);
  }

  return (
    <main className={styles.studio} data-studio-ui-hidden={uiHidden ? 'true' : 'false'} data-studio-mode={mode}>
      <div
        className={styles.previewFrame}
        style={{ width: viewport.width * scale, height: viewport.height * scale }}
      >
        <iframe
          ref={iframeRef}
          className={styles.previewIframe}
          src="/studio/preview"
          title={`Home Day Atlas · ${viewport.width} × ${viewport.height}`}
          width={viewport.width}
          height={viewport.height}
          style={{
            width: viewport.width,
            height: viewport.height,
            transform: `scale(${scale})`,
          }}
          onLoad={sendPreviewEnvironment}
        />
      </div>

      {mode === 'edit' && !uiHidden ? (
        <div className={styles.panelLayer} aria-label="Controlli Scene Studio">
          <FloatingPanel
            id="viewport"
            title="Viewport"
            position={positions.viewport}
            onPositionChange={(position) => updatePanelPosition('viewport', position)}
            onReset={() => resetPanelPosition('viewport')}
          >
            <label className={styles.fieldLabel} htmlFor="studio-viewport">
              Preset reale
            </label>
            <select
              id="studio-viewport"
              className={styles.select}
              value={viewportId}
              onChange={(event) => setViewportId(event.target.value as StudioViewportPresetId)}
            >
              {STUDIO_VIEWPORT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.width} × {preset.height}
                </option>
              ))}
            </select>
            <div className={styles.modeGroup} aria-label="Modalità Studio">
              <button type="button" className={styles.modeActive} onClick={() => enterMode('edit')}>
                Modifica
              </button>
              <button
                type="button"
                className={styles.modeButton}
                onClick={() => enterMode('preview')}
                title="Esc per tornare a Modifica"
              >
                Anteprima
              </button>
              <button type="button" className={styles.modeButton} disabled title="Disponibile con la pubblicazione">
                Online
              </button>
            </div>
            <p className={styles.statusText}>
              {viewport.width} × {viewport.height} CSS px · scala {Math.round(scale * 100)}%
            </p>
            <button type="button" className={styles.primaryButton} onClick={() => setUiHidden(true)}>
              Nascondi UI <kbd>H</kbd>
            </button>
          </FloatingPanel>

          <FloatingPanel
            id="objects"
            title="Oggetti"
            position={positions.objects}
            onPositionChange={(position) => updatePanelPosition('objects', position)}
            onReset={() => resetPanelPosition('objects')}
          >
            <ul className={styles.objectList}>
              {SCENE_OBJECT_IDS.map((objectId) => {
                const object = draft.objects[objectId];
                return (
                  <li key={objectId}>
                    <button
                      type="button"
                      className={selectedObjectId === objectId ? styles.objectButtonActive : styles.objectButton}
                      onClick={() => setSelectedObjectId(objectId)}
                      aria-pressed={selectedObjectId === objectId}
                    >
                      <span aria-hidden="true">{object.visible ? '●' : '○'}</span>
                      <span>{OBJECT_LABELS[objectId]}</span>
                      <span className={styles.objectState} aria-label={object.locked ? 'Bloccato' : 'Modificabile'}>
                        {object.locked ? '🔒' : '↗'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </FloatingPanel>

          <FloatingPanel
            id="properties"
            title="Proprietà"
            position={positions.properties}
            onPositionChange={(position) => updatePanelPosition('properties', position)}
            onReset={() => resetPanelPosition('properties')}
          >
            <div className={styles.propertyHeading}>
              <strong>{OBJECT_LABELS[selectedObjectId]}</strong>
              <span>{selectedObject.locked ? 'Bloccato' : 'Modificabile'}</span>
            </div>
            <div className={styles.numericGrid}>
              <NumericField label="X · px" value={selectedObject.x} step={1} disabled={selectedObject.locked} onChange={(x) => patchSelectedObject({ x })} />
              <NumericField label="Y · px" value={selectedObject.y} step={1} disabled={selectedObject.locked} onChange={(y) => patchSelectedObject({ y })} />
              <NumericField label="Scala" value={selectedObject.scale} step={0.05} disabled={selectedObject.locked} onChange={(scaleValue) => patchSelectedObject({ scale: scaleValue })} />
              <NumericField label="Rotazione · °" value={selectedObject.rotation} step={1} disabled={selectedObject.locked} onChange={(rotation) => patchSelectedObject({ rotation })} />
            </div>
            <div className={styles.propertyActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => patchSelectedObject({ locked: !selectedObject.locked })}>
                {selectedObject.locked ? 'Sblocca' : 'Blocca'}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => patchSelectedObject({ visible: !selectedObject.visible })}>
                {selectedObject.visible ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
            <button type="button" className={styles.resetDraftButton} onClick={resetDraft}>
              Reset bozza
            </button>
          </FloatingPanel>
        </div>
      ) : null}
    </main>
  );
}
