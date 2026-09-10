'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import NotebookHome from '@/app/components/NotebookHome';
import type { SceneMode } from '@/lib/scene-config';
import {
  HOME_SCENE_DRAFT_BASELINE_V1,
  resolveSceneDraft,
  updateSceneDraft,
  type SceneEditingTarget,
} from '@/lib/scene-draft-editor';
import {
  SCENE_OBJECT_IDS,
  SCENE_RESPONSIVE_BREAKPOINT_IDS,
  resolveSceneObjectForViewport,
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
};

type ObjectRects = Partial<Record<SceneObjectId, ObjectRect>>;

function isSceneEditingTarget(value: unknown): value is SceneEditingTarget {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.mode === 'base' || (
    candidate.mode === 'override'
    && typeof candidate.breakpointId === 'string'
    && SCENE_RESPONSIVE_BREAKPOINT_IDS.includes(candidate.breakpointId as (typeof SCENE_RESPONSIVE_BREAKPOINT_IDS)[number])
  );
}

const OBJECT_LABELS: Record<SceneObjectId, string> = {
  'coffee-cup': 'Tazza',
  'ink-bottle': 'Boccetta',
  'seasonal-fig': 'Fico',
};

function sameRects(current: ObjectRects, next: ObjectRects) {
  return JSON.stringify(current) === JSON.stringify(next);
}

function SceneObjectEditor({
  draft,
  selectedObjectId,
  onSelect,
  onPatch,
  viewport,
}: {
  draft: SceneDraft;
  selectedObjectId: SceneObjectId;
  onSelect: (objectId: SceneObjectId) => void;
  onPatch: (objectId: SceneObjectId, patch: SceneObjectDraftPatch) => void;
  viewport: { width: number; height: number };
}) {
  const [rects, setRects] = useState<ObjectRects>({});
  const interactionRef = useRef<
    | {
        kind: 'drag';
        pointerId: number;
        objectId: SceneObjectId;
        startX: number;
        startY: number;
        originX: number;
        originY: number;
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
      for (const objectId of SCENE_OBJECT_IDS) {
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
        };
      }
      setRects((current) => sameRects(current, next) ? current : next);
      frame = window.requestAnimationFrame(measure);
    };
    frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [draft, viewport]);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, objectId: SceneObjectId) {
    if (event.button !== 0) return;
    onSelect(objectId);
    const object = resolveSceneObjectForViewport(draft.objects[objectId], viewport).object;
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
    };
  }

  function startResize(event: ReactPointerEvent<HTMLSpanElement>, objectId: SceneObjectId) {
    const rect = rects[objectId];
    if (!rect || draft.objects[objectId].locked || event.button !== 0) return;
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
      originScale: resolveSceneObjectForViewport(draft.objects[objectId], viewport).object.scale,
    };
  }

  function startRotate(event: ReactPointerEvent<HTMLSpanElement>, objectId: SceneObjectId) {
    const rect = rects[objectId];
    if (!rect || draft.objects[objectId].locked || event.button !== 0) return;
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
      originRotation: resolveSceneObjectForViewport(draft.objects[objectId], viewport).object.rotation,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    if (interaction.kind === 'drag') {
      onPatch(interaction.objectId, {
        offsetX: interaction.originX + event.clientX - interaction.startX,
        offsetY: interaction.originY + event.clientY - interaction.startY,
      });
      return;
    }
    if (interaction.kind === 'resize') {
      const distance = Math.hypot(
        event.clientX - interaction.centerX,
        event.clientY - interaction.centerY,
      );
      onPatch(interaction.objectId, {
        scale: interaction.originScale * distance / interaction.startDistance,
      });
      return;
    }
    const angle = Math.atan2(event.clientY - interaction.centerY, event.clientX - interaction.centerX);
    const degrees = (angle - interaction.startAngle) * 180 / Math.PI;
    let rotation = interaction.originRotation + degrees;
    while (rotation > 180) rotation -= 360;
    while (rotation < -180) rotation += 360;
    onPatch(interaction.objectId, { rotation });
  }

  function endInteraction(event: ReactPointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    interactionRef.current = null;
  }

  return (
    <div className={styles.editorLayer} data-studio-editor-layer="true">
      {SCENE_OBJECT_IDS.map((objectId) => {
        const rect = rects[objectId];
        const object = resolveSceneObjectForViewport(draft.objects[objectId], viewport).object;
        if (!rect || !object.visible) return null;
        const selected = selectedObjectId === objectId;
        return (
          <div
            key={objectId}
            className={`${styles.objectHitbox} ${selected ? styles.selected : ''} ${object.locked ? styles.locked : ''}`}
            data-studio-object-hitbox={objectId}
            data-studio-selected={selected ? 'true' : 'false'}
            data-studio-locked={object.locked ? 'true' : 'false'}
            aria-label={`Seleziona ${OBJECT_LABELS[objectId]}`}
            role="button"
            tabIndex={0}
            style={{
              left: rect.centerX,
              top: rect.centerY,
              width: rect.width,
              height: rect.height,
              transform: `translate(-50%, -50%) rotate(${rect.rotation}deg)`,
              zIndex: rect.zIndex,
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
                <span className={styles.objectLabel}>{OBJECT_LABELS[objectId]}{object.locked ? ' · bloccato' : ''}</span>
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
  const viewport = getStudioViewportPreset(viewportId);

  const sendSelection = useCallback((objectId: SceneObjectId) => {
    setSelectedObjectId(objectId);
    window.parent.postMessage(
      { type: STUDIO_SELECTION_CHANGE_MESSAGE, objectId },
      window.location.origin,
    );
  }, []);

  const applyPatch = useCallback((objectId: SceneObjectId, patch: SceneObjectDraftPatch) => {
    setDraft((current) => updateSceneDraft(current, objectId, patch, editingTarget));
    window.parent.postMessage(
      { type: STUDIO_DRAFT_CHANGE_MESSAGE, objectId, patch, editingTarget },
      window.location.origin,
    );
  }, [editingTarget]);

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
      if (candidate.selectedObjectId && SCENE_OBJECT_IDS.includes(candidate.selectedObjectId)) {
        setSelectedObjectId(candidate.selectedObjectId);
      }
      if (isSceneEditingTarget(candidate.editingTarget)) setEditingTarget(candidate.editingTarget);
      if (candidate.sceneDraft !== undefined) setDraft(resolveSceneDraft(candidate.sceneDraft));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Escape' && modeRef.current === 'preview') {
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
  }, [initialMode, initialViewport]);

  return (
    <>
      <NotebookHome sceneDraft={draft} sceneViewport={viewport} />
      {showEditor && mode === 'edit' ? (
        <SceneObjectEditor
          draft={draft}
          selectedObjectId={selectedObjectId}
          onSelect={sendSelection}
          onPatch={applyPatch}
          viewport={viewport}
        />
      ) : null}
    </>
  );
}
