'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import NotebookHome from '@/app/components/NotebookHome';
import type { SceneMode } from '@/lib/scene-config';
import {
  HOME_SCENE_DRAFT_BASELINE_V1,
  createSceneEditorPreviewDraft,
  resolveSceneDraft,
  updateSceneDraft,
  updateSceneDraftWithPresetSeed,
  type SceneObjectAnchorInitialization,
  type SceneEditingTarget,
} from '@/lib/scene-draft-editor';
import {
  getSceneObject,
  getScenePresetOverrideId,
  isSceneObjectId,
  SCENE_RESPONSIVE_BREAKPOINT_IDS,
  SCENE_PRESET_OVERRIDE_IDS,
  resolveSceneObjectForViewport,
  type SceneDraft,
  type SceneObjectDraftPatch,
  type SceneObjectId,
} from '@/lib/scene-draft';
import {
  findSceneCollisions,
  rectFromDomRect,
  shouldShowSceneGuide,
  type SceneCollision,
  type SceneGuideMode,
  type SceneRect,
  type SceneSafeArea,
} from '@/lib/scene-safe-areas';
import {
  STUDIO_DRAFT_CHANGE_MESSAGE,
  STUDIO_PREVIEW_MESSAGE,
  STUDIO_RETURN_TO_EDIT_MESSAGE,
  STUDIO_SELECTION_CHANGE_MESSAGE,
  STUDIO_SCENE_SAFETY_MESSAGE,
  STUDIO_UNDO_MESSAGE,
  STUDIO_REDO_MESSAGE,
  STUDIO_TOGGLE_UI_MESSAGE,
  isSceneMode,
  type StudioPreviewMessage,
} from '@/lib/studio-preview-protocol';
import { getStudioViewportPreset, type StudioViewportPresetId } from '@/lib/studio-viewport';
import styles from './studio-preview.module.css';

type ObjectRect = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visualRect: SceneRect;
};

type ObjectRects = Record<SceneObjectId, ObjectRect | undefined>;

function isSceneEditingTarget(value: unknown): value is SceneEditingTarget {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.mode === 'base' || (
    candidate.mode === 'preset'
    && typeof candidate.presetId === 'string'
    && SCENE_PRESET_OVERRIDE_IDS.includes(candidate.presetId as (typeof SCENE_PRESET_OVERRIDE_IDS)[number])
  ) || (
    candidate.mode === 'override'
    && typeof candidate.breakpointId === 'string'
    && SCENE_RESPONSIVE_BREAKPOINT_IDS.includes(candidate.breakpointId as (typeof SCENE_RESPONSIVE_BREAKPOINT_IDS)[number])
  );
}


function isSceneSafeAreaCategory(value: string | null): value is SceneSafeArea['category'] {
  return value === 'content' || value === 'interactive' || value === 'postcard';
}

function sameSafety(current: readonly SceneSafeArea[], next: readonly SceneSafeArea[]) {
  return JSON.stringify(current) === JSON.stringify(next);
}

function useSceneSafeAreas(viewport: { width: number; height: number }) {
  const [safeAreas, setSafeAreas] = useState<SceneSafeArea[]>([]);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = Array.from(document.querySelectorAll<HTMLElement>('[data-scene-safe]')).flatMap((element, index) => {
        const category = element.getAttribute('data-scene-safe');
        const rect = element.getBoundingClientRect();
        if (!isSceneSafeAreaCategory(category) || rect.width <= 0 || rect.height <= 0 || getComputedStyle(element).display === 'none') return [];
        return [{ id: `${category}-${index}`, category, rect: rectFromDomRect(rect) }];
      });
      setSafeAreas((current) => sameSafety(current, next) ? current : next);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(document.body);
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule, { once: true });
    void document.fonts?.ready.then(schedule);
    schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('load', schedule);
    };
  }, [viewport.height, viewport.width]);

  return safeAreas;
}

function SceneSafeAreaOverlay({ safeAreas, guideMode, collisions }: { safeAreas: readonly SceneSafeArea[]; guideMode: SceneGuideMode; collisions: readonly SceneCollision[] }) {
  if (guideMode === 'off') return null;
  const collisionIds = new Set(collisions.map((collision) => collision.id));
  return (
    <div className={styles.safeAreaLayer} aria-hidden="true">
      {safeAreas.filter((safeArea) => shouldShowSceneGuide(guideMode, safeArea.category)).map((safeArea) => (
        <div
          key={safeArea.id}
          className={`${styles.safeArea} ${collisionIds.has(safeArea.id) ? styles.safeAreaCollision : ''}`}
          data-studio-safe-area={safeArea.category}
          style={safeArea.rect}
        >
          <span>{safeArea.category}</span>
        </div>
      ))}
    </div>
  );
}

function sameRects(current: ObjectRects, next: ObjectRects) {
  return JSON.stringify(current) === JSON.stringify(next);
}

function SceneObjectEditor({
  draft,
  selectedObjectId,
  onSelect,
  onPatch,
  onSelectedRectChange,
  viewport,
}: {
  draft: SceneDraft;
  selectedObjectId: SceneObjectId;
  onSelect: (objectId: SceneObjectId) => void;
  onPatch: (objectId: SceneObjectId, patch: SceneObjectDraftPatch, phase?: 'start' | 'move' | 'end' | 'commit', anchorInitialization?: SceneObjectAnchorInitialization) => void;
  onSelectedRectChange: (rect: SceneRect | null) => void;
  viewport: { width: number; height: number };
}) {
  const [rects, setRects] = useState<ObjectRects>({});
  const maximumEditorZIndex = Math.max(0, ...Object.values(rects).flatMap((rect) => rect ? [rect.zIndex] : []));
  const interactionRef = useRef<
    | {
        kind: 'drag';
        pointerId: number;
        objectId: SceneObjectId;
        startX: number;
        startY: number;
        originX: number;
        originY: number;
        originCenterX: number;
        originCenterY: number;
        renderedWidth: number;
        renderedHeight: number;
        scale: number;
      }
    | {
        kind: 'resize';
        pointerId: number;
        objectId: SceneObjectId;
        centerX: number;
        centerY: number;
        startDistance: number;
        originScale: number;
      }
    | {
        kind: 'rotate';
        pointerId: number;
        objectId: SceneObjectId;
        centerX: number;
        centerY: number;
        startAngle: number;
        originRotation: number;
      }
    | null
  >(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const next: ObjectRects = {};
      for (const objectId of draft.objects.map((object) => object.id)) {
        const element = document.querySelector<HTMLElement>(`[data-scene-object="${objectId}"]`);
        if (!element || getComputedStyle(element).display === 'none') continue;
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        const scale = Number.parseFloat(computed.getPropertyValue('--scene-object-scale')) || 1;
        const rotation = Number.parseFloat(computed.getPropertyValue('--scene-object-rotation')) || 0;
        next[objectId] = {
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          width: element.offsetWidth * scale,
          height: element.offsetHeight * scale,
          rotation,
          zIndex: Number.parseInt(computed.zIndex, 10) || 1,
          visualRect: rectFromDomRect(rect),
        };
      }
      setRects((current) => sameRects(current, next) ? current : next);
      onSelectedRectChange(next[selectedObjectId]?.visualRect ?? null);
      frame = 0;
    };
    frame = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, [draft, onSelectedRectChange, selectedObjectId, viewport]);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, objectId: SceneObjectId) {
    if (event.button !== 0) return;
    onSelect(objectId);
    const rect = rects[objectId];
    const baseObject = getSceneObject(draft, objectId);
    if (!baseObject || !rect) return;
    const object = resolveSceneObjectForViewport(baseObject, viewport, getScenePresetOverrideId(viewport)).object;
    if (object.locked) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind: 'drag',
      pointerId: event.pointerId,
      objectId,
      startX: event.clientX,
      startY: event.clientY,
      originX: object.offsetX,
      originY: object.offsetY,
      originCenterX: rect.centerX,
      originCenterY: rect.centerY,
      renderedWidth: rect.width,
      renderedHeight: rect.height,
      scale: object.scale,
    };
    onPatch(objectId, {}, 'start');
  }

  function startResize(event: ReactPointerEvent<HTMLSpanElement>, objectId: SceneObjectId) {
    const rect = rects[objectId];
    const baseObject = getSceneObject(draft, objectId);
    if (!rect || !baseObject || baseObject.locked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind: 'resize',
      pointerId: event.pointerId,
      objectId,
      centerX: rect.centerX,
      centerY: rect.centerY,
      startDistance: Math.max(1, Math.hypot(event.clientX - rect.centerX, event.clientY - rect.centerY)),
      originScale: resolveSceneObjectForViewport(baseObject, viewport, getScenePresetOverrideId(viewport)).object.scale,
    };
    onPatch(objectId, {}, 'start');
  }

  function startRotate(event: ReactPointerEvent<HTMLSpanElement>, objectId: SceneObjectId) {
    const rect = rects[objectId];
    const baseObject = getSceneObject(draft, objectId);
    if (!rect || !baseObject || baseObject.locked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind: 'rotate',
      pointerId: event.pointerId,
      objectId,
      centerX: rect.centerX,
      centerY: rect.centerY,
      startAngle: Math.atan2(event.clientY - rect.centerY, event.clientX - rect.centerX),
      originRotation: resolveSceneObjectForViewport(baseObject, viewport, getScenePresetOverrideId(viewport)).object.rotation,
    };
    onPatch(objectId, {}, 'start');
  }

  function applyInteraction(event: ReactPointerEvent<HTMLElement>, phase: 'move' | 'end') {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    if (interaction.kind === 'drag') {
      const deltaX = event.clientX - interaction.startX;
      const deltaY = event.clientY - interaction.startY;
      onPatch(interaction.objectId, {
        offsetX: interaction.originX + deltaX,
        offsetY: interaction.originY + deltaY,
      }, phase, phase === 'end' ? {
        viewport,
        centerX: interaction.originCenterX + deltaX,
        centerY: interaction.originCenterY + deltaY,
        renderedWidth: interaction.renderedWidth,
        renderedHeight: interaction.renderedHeight,
        scale: interaction.scale,
      } : undefined);
      return;
    }
    if (interaction.kind === 'resize') {
      const distance = Math.hypot(
        event.clientX - interaction.centerX,
        event.clientY - interaction.centerY,
      );
      onPatch(interaction.objectId, {
        scale: interaction.originScale * distance / interaction.startDistance,
      }, phase);
      return;
    }
    const angle = Math.atan2(event.clientY - interaction.centerY, event.clientX - interaction.centerX);
    const degrees = (angle - interaction.startAngle) * 180 / Math.PI;
    let rotation = interaction.originRotation + degrees;
    while (rotation > 180) rotation -= 360;
    while (rotation < -180) rotation += 360;
    onPatch(interaction.objectId, { rotation }, phase);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    applyInteraction(event, 'move');
  }

  function endInteraction(event: ReactPointerEvent<HTMLElement>) {
    applyInteraction(event, 'end');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    interactionRef.current = null;
  }

  return (
    <div className={styles.editorLayer} data-studio-editor-layer="true">
      {draft.objects.map((baseObject) => {
        const objectId = baseObject.id;
        const rect = rects[objectId];
        const object = resolveSceneObjectForViewport(baseObject, viewport, getScenePresetOverrideId(viewport)).object;
        if (!rect || !object.visible) return null;
        const selected = selectedObjectId === objectId;
        return (
          <div
            key={objectId}
            className={`${styles.objectHitbox} ${selected ? styles.selected : ''} ${object.locked ? styles.locked : ''}`}
            data-studio-object-hitbox={objectId}
            data-studio-selected={selected ? 'true' : 'false'}
            data-studio-locked={object.locked ? 'true' : 'false'}
            aria-label={`Seleziona ${object.name}`}
            role="button"
            tabIndex={0}
            style={{
              left: rect.centerX,
              top: rect.centerY,
              width: rect.width,
              height: rect.height,
              transform: `translate(-50%, -50%) rotate(${rect.rotation}deg)`,
              zIndex: selected ? maximumEditorZIndex + 1 : rect.zIndex,
            }}
            onPointerDown={(event) => startDrag(event, objectId)}
            onPointerMove={handlePointerMove}
            onPointerUp={endInteraction}
            onPointerCancel={endInteraction}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(objectId);
              }
            }}
          >
            {selected ? (
              <>
                <span className={styles.objectLabel}>{object.name}{object.locked ? ' · bloccato' : ''}</span>
                {object.locked ? null : (
                  <>
                    <span
                      className={styles.rotateHandle}
                      data-studio-handle="rotate"
                      aria-hidden="true"
                      onPointerDown={(event) => startRotate(event, objectId)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={endInteraction}
                      onPointerCancel={endInteraction}
                    />
                    <span
                      className={styles.resizeHandle}
                      data-studio-handle="resize"
                      aria-hidden="true"
                      onPointerDown={(event) => startResize(event, objectId)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={endInteraction}
                      onPointerCancel={endInteraction}
                    />
                  </>
                )}
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function StudioPreviewBridge({
  initialMode,
  initialViewport,
}: {
  initialMode: SceneMode;
  initialViewport: StudioViewportPresetId;
}) {
  const [mode, setMode] = useState(initialMode);
  const modeRef = useRef(mode);
  const [draft, setDraft] = useState<SceneDraft>(HOME_SCENE_DRAFT_BASELINE_V1);
  const [selectedObjectId, setSelectedObjectId] = useState<SceneObjectId>('seasonal-fig');
  const [showEditor, setShowEditor] = useState(initialMode === 'edit');
  const [viewportId, setViewportId] = useState<StudioViewportPresetId>(initialViewport);
  const [editingTarget, setEditingTarget] = useState<SceneEditingTarget>({ mode: 'base' });
  const [guideMode, setGuideMode] = useState<SceneGuideMode>('off');
  const [previewLabel, setPreviewLabel] = useState<string | null>(null);
  const [selectedRect, setSelectedRect] = useState<SceneRect | null>(null);
  const viewport = getStudioViewportPreset(viewportId);
  const presetId = getScenePresetOverrideId(viewport);
  const editorDraft = mode === 'edit'
    ? createSceneEditorPreviewDraft(draft, { width: viewport.width, height: viewport.height })
    : draft;
  const safeAreas = useSceneSafeAreas(viewport);
  const selectedObject = resolveSceneObjectForViewport(getSceneObject(editorDraft, selectedObjectId) ?? editorDraft.objects[0], viewport, presetId).object;
  const collisions = useMemo(
    () => selectedObject.visible ? findSceneCollisions(selectedRect, safeAreas) : [],
    [safeAreas, selectedObject.visible, selectedRect],
  );

  const sendSelection = useCallback((objectId: SceneObjectId) => {
    setSelectedObjectId(objectId);
    window.parent.postMessage(
      { type: STUDIO_SELECTION_CHANGE_MESSAGE, objectId },
      window.location.origin,
    );
  }, []);

  const applyPatch = useCallback((objectId: SceneObjectId, patch: SceneObjectDraftPatch, phase: 'start' | 'move' | 'end' | 'commit' = 'commit', anchorInitialization?: SceneObjectAnchorInitialization) => {
    setDraft((current) => editingTarget.mode === 'preset'
      ? updateSceneDraftWithPresetSeed(current, objectId, patch, editingTarget.presetId)
      : updateSceneDraft(current, objectId, patch, editingTarget));
    window.parent.postMessage(
      { type: STUDIO_DRAFT_CHANGE_MESSAGE, objectId, patch, editingTarget, phase, anchorInitialization },
      window.location.origin,
    );
  }, [editingTarget]);

  const handleSelectedRectChange = useCallback((rect: SceneRect | null) => {
    setSelectedRect((current) => JSON.stringify(current) === JSON.stringify(rect) ? current : rect);
  }, []);

  useEffect(() => {
    window.parent.postMessage(
      { type: STUDIO_SCENE_SAFETY_MESSAGE, safeAreas, collisions },
      window.location.origin,
    );
  }, [collisions, safeAreas]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;

    const applyEnvironment = (nextMode: SceneMode, viewport: StudioViewportPresetId) => {
      root.dataset.studioPreview = 'true';
      root.dataset.studioMode = nextMode;
      root.dataset.studioViewport = viewport;
    };

    applyEnvironment(initialMode, initialViewport);

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      const candidate = message as Partial<StudioPreviewMessage>;
      if (candidate.type !== STUDIO_PREVIEW_MESSAGE || !isSceneMode(candidate.mode)) return;
      const viewport = getStudioViewportPreset(candidate.viewport);
      applyEnvironment(candidate.mode, viewport.id);
      setViewportId(viewport.id);
      modeRef.current = candidate.mode;
      setMode(candidate.mode);
      setShowEditor(candidate.showEditor === true && candidate.mode === 'edit');
      setPreviewLabel(typeof candidate.previewLabel === 'string' ? candidate.previewLabel : null);
      setGuideMode(candidate.guideMode === 'content' || candidate.guideMode === 'interactive' || candidate.guideMode === 'all' ? candidate.guideMode : 'off');
      if (candidate.selectedObjectId && isSceneObjectId(candidate.selectedObjectId) && getSceneObject(draft, candidate.selectedObjectId)) {
        setSelectedObjectId(candidate.selectedObjectId);
      }
      if (isSceneEditingTarget(candidate.editingTarget)) setEditingTarget(candidate.editingTarget);
      if (candidate.sceneDraft !== undefined) setDraft(resolveSceneDraft(candidate.sceneDraft));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        window.parent.postMessage({ type: event.shiftKey ? STUDIO_REDO_MESSAGE : STUDIO_UNDO_MESSAGE }, window.location.origin);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape' && modeRef.current !== 'edit') {
        event.preventDefault();
        window.parent.postMessage({ type: STUDIO_RETURN_TO_EDIT_MESSAGE }, window.location.origin);
        return;
      }
      if (event.key.toLowerCase() === 'h') {
        event.preventDefault();
        window.parent.postMessage({ type: STUDIO_TOGGLE_UI_MESSAGE }, window.location.origin);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('keydown', handleKeyDown);
    window.parent.postMessage({ type: 'day-atlas:studio-preview-ready' }, window.location.origin);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
      delete root.dataset.studioPreview;
      delete root.dataset.studioMode;
      delete root.dataset.studioViewport;
    };
  }, [draft, initialMode, initialViewport]);

  return (
    <>
      <NotebookHome sceneDraft={editorDraft} sceneViewport={viewport} />
      {mode === 'preview' ? (
        <button
          type="button"
          className={styles.returnToEdit}
          onClick={() => window.parent.postMessage({ type: STUDIO_RETURN_TO_EDIT_MESSAGE }, window.location.origin)}
        >
          ← {previewLabel ? 'Torna alla scena corrente' : 'Torna a Modifica'}
        </button>
      ) : null}
      {showEditor && mode === 'edit' ? <SceneSafeAreaOverlay safeAreas={safeAreas} guideMode={guideMode} collisions={collisions} /> : null}
      {showEditor && mode === 'edit' ? <SceneObjectEditor draft={editorDraft} selectedObjectId={selectedObjectId} onSelect={sendSelection} onPatch={applyPatch} onSelectedRectChange={handleSelectedRectChange} viewport={viewport} /> : null}
    </>
  );
}
