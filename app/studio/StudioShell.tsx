'use client';
/* eslint-disable @next/next/no-img-element -- local blob preview is intentionally not image-optimized. */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import type { SceneMode } from '@/lib/scene-config';
import {
  HOME_SCENE_DRAFT_BASELINE_V1,
  addSceneObject,
  createSceneResponsiveOverride,
  cloneBaselineSceneDraft,
  removeSceneResponsiveOverride,
  removeScenePresetOverride,
  replaceSceneObjectAsset,
  resolveSceneDraft,
  updateSceneDraft,
  type SceneEditingTarget,
} from '@/lib/scene-draft-editor';
import {
  SCENE_RESPONSIVE_LABELS,
  getSceneObject,
  getSceneResponsiveBreakpoint,
  getSceneObjectResponsiveState,
  resolveSceneObjectForViewport,
  type SceneDraft,
  type SceneObjectDraftPatch,
  type SceneObjectDraft,
  type SceneObjectId,
  type ScenePresetOverrideId,
} from '@/lib/scene-draft';
import { resolvePublishedScene } from '@/lib/scene-publication';
import {
  STUDIO_DRAFT_CHANGE_MESSAGE,
  STUDIO_PREVIEW_MESSAGE,
  STUDIO_RETURN_TO_EDIT_MESSAGE,
  STUDIO_SELECTION_CHANGE_MESSAGE,
  STUDIO_SCENE_SAFETY_MESSAGE,
  STUDIO_TOGGLE_UI_MESSAGE,
} from '@/lib/studio-preview-protocol';
import type { SceneCollision, SceneGuideMode } from '@/lib/scene-safe-areas';
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
const GUIDE_STORAGE_KEY = 'day-atlas-scene-studio-guides-v1';

type PanelId = 'viewport' | 'objects' | 'properties';
type PanelPositions = Record<PanelId, Point>;
type SceneVersionRecord = {
  id: string;
  version_number: number;
  label: string;
  display_name: string | null;
  scene: SceneDraft;
  is_baseline: boolean;
  is_current: boolean;
  source_version_id: string | null;
  created_at: string;
};

const INITIAL_POSITIONS: PanelPositions = {
  viewport: { x: 24, y: 24 },
  objects: { x: 1124, y: 24 },
  properties: { x: 1124, y: 254 },
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
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
}

function isSceneGuideMode(value: unknown): value is SceneGuideMode {
  return value === 'off' || value === 'content' || value === 'interactive' || value === 'all';
}

function isSceneCollisionList(value: unknown): value is SceneCollision[] {
  return Array.isArray(value) && value.every((collision) => Boolean(
    collision && typeof collision === 'object'
      && typeof (collision as SceneCollision).id === 'string'
      && ['content', 'interactive', 'postcard'].includes((collision as SceneCollision).category),
  ));
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
    const bounds = panel?.getBoundingClientRect();
    return clampPanelPosition(
      nextPosition,
      { width: bounds?.width ?? 280, height: bounds?.height ?? 180 },
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
  const [viewportId, setViewportId] = useState<StudioViewportPresetId>('1920x1080');
  const [mode, setMode] = useState<SceneMode>('edit');
  const [uiHidden, setUiHidden] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<SceneObjectId>('seasonal-fig');
  const [editingTarget, setEditingTarget] = useState<SceneEditingTarget>({ mode: 'base' });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [guideMode, setGuideMode] = useState<SceneGuideMode>('off');
  const [collisions, setCollisions] = useState<SceneCollision[]>([]);
  const [draft, setDraft] = useState<SceneDraft>(HOME_SCENE_DRAFT_BASELINE_V1);
  const [undoStack, setUndoStack] = useState<SceneDraft[]>([]);
  const [redoStack, setRedoStack] = useState<SceneDraft[]>([]);
  const draftRef = useRef(draft);
  const resetReferenceRef = useRef<SceneDraft>(HOME_SCENE_DRAFT_BASELINE_V1);
  const interactionHistoryRef = useRef(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [publishedScene, setPublishedScene] = useState<SceneDraft | null>(null);
  const [versions, setVersions] = useState<SceneVersionRecord[]>([]);
  const [versionPreview, setVersionPreview] = useState<SceneVersionRecord | null>(null);
  const [renamingVersionId, setRenamingVersionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetPreviewUrl, setAssetPreviewUrl] = useState<string | null>(null);
  const [replacingAsset, setReplacingAsset] = useState(false);
  const replaceAssetInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 1440, height: 900 });
  const [positions, setPositions] = useState<PanelPositions>(INITIAL_POSITIONS);
  const [positionsRestored, setPositionsRestored] = useState(false);
  const viewport = getStudioViewportPreset(viewportId);
  const selectedBaseObject = getSceneObject(draft, selectedObjectId) ?? draft.objects[0];
  const selectedResponsiveState = getSceneObjectResponsiveState(selectedBaseObject, viewport, viewport.id as ScenePresetOverrideId);
  const activeBreakpoint = selectedResponsiveState.overrideBreakpointId ?? getSceneResponsiveBreakpoint(viewport);
  const presetOverride = selectedBaseObject.presetOverrides[viewport.id];
  const selectedObject = selectedResponsiveState.object;
  const hasCurrentOverride = Boolean(selectedResponsiveState.overrideBreakpointId);
  const effectiveEditingTarget = useMemo<SceneEditingTarget>(() => {
    if (advancedOpen) {
      if (editingTarget.mode === 'override' && editingTarget.breakpointId === activeBreakpoint) return editingTarget;
      if (editingTarget.mode === 'base') return editingTarget;
    }
    return { mode: 'preset', presetId: viewport.id as ScenePresetOverrideId };
  }, [activeBreakpoint, advancedOpen, editingTarget, viewport.id]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const commitDraftMutation = useCallback((mutator: (current: SceneDraft) => SceneDraft) => {
    setDraft((current) => {
      const next = mutator(current);
      if (JSON.stringify(next) === JSON.stringify(current)) return current;
      setUndoStack((history) => [...history, current].slice(-80));
      setRedoStack([]);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setUndoStack((history) => {
      const previous = history.at(-1);
      if (!previous) return history;
      setRedoStack((redo) => [...redo, draftRef.current].slice(-80));
      setDraft(previous);
      return history.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((history) => {
      const next = history.at(-1);
      if (!next) return history;
      setUndoStack((undoHistory) => [...undoHistory, draftRef.current].slice(-80));
      setDraft(next);
      return history.slice(0, -1);
    });
  }, []);

  const sendPreviewEnvironment = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: STUDIO_PREVIEW_MESSAGE,
        mode,
        viewport: viewport.id,
        sceneDraft: mode === 'online' ? publishedScene : mode === 'preview' && versionPreview ? versionPreview.scene : draft,
        previewLabel: mode === 'preview' ? versionPreview?.label : undefined,
        selectedObjectId,
        editingTarget: effectiveEditingTarget,
        guideMode,
        showEditor: mode === 'edit' && !uiHidden,
      },
      window.location.origin,
    );
  }, [draft, effectiveEditingTarget, guideMode, mode, publishedScene, selectedObjectId, uiHidden, versionPreview, viewport.id]);

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
        setVersionPreview(null);
        setMode('edit');
        setUiHidden(false);
      } else if (candidate.type === STUDIO_SELECTION_CHANGE_MESSAGE && isSceneObjectId(candidate.objectId) && getSceneObject(draft, candidate.objectId)) {
        setSelectedObjectId(candidate.objectId);
      } else if (candidate.type === STUDIO_DRAFT_CHANGE_MESSAGE && isSceneObjectId(candidate.objectId) && getSceneObject(draft, candidate.objectId)) {
        const patch = candidate.patch;
        if (patch && typeof patch === 'object' && !Array.isArray(patch)) {
          const phase = candidate.phase;
          if (phase === 'start' && !interactionHistoryRef.current) {
            interactionHistoryRef.current = true;
            setUndoStack((history) => [...history, draftRef.current].slice(-80));
            setRedoStack([]);
          }
          setDraft((current) => updateSceneDraft(current, candidate.objectId as SceneObjectId, patch as SceneObjectDraftPatch, effectiveEditingTarget));
          if (phase === 'end') interactionHistoryRef.current = false;
        }
      } else if (candidate.type === STUDIO_SCENE_SAFETY_MESSAGE && isSceneCollisionList(candidate.collisions)) {
        setCollisions(candidate.collisions);
      } else if (candidate.type === 'day-atlas:studio-preview-ready') {
        sendPreviewEnvironment();
      }
    };
    window.addEventListener('message', handlePreviewMessage);
    return () => window.removeEventListener('message', handlePreviewMessage);
  }, [draft, effectiveEditingTarget, sendPreviewEnvironment]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedPositions = parseStoredPositions(window.localStorage.getItem(PANEL_STORAGE_KEY));
      const rightX = Math.max(24, window.innerWidth - 292);
      setPositions({
        viewport: storedPositions.viewport ?? INITIAL_POSITIONS.viewport,
        objects: storedPositions.objects ?? { x: rightX, y: 24 },
        properties: storedPositions.properties ?? { x: rightX, y: 254 },
      });
      const storedGuideMode = window.localStorage.getItem(GUIDE_STORAGE_KEY);
      if (isSceneGuideMode(storedGuideMode)) setGuideMode(storedGuideMode);
      setPositionsRestored(true);
    });
    const loadDraft = async () => {
      const storedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      let recovery = cloneBaselineSceneDraft();
      if (storedDraft) try { recovery = resolveSceneDraft(JSON.parse(storedDraft)); } catch { /* Baseline fallback */ }
      try {
        const response = await fetch('/api/studio/scene', { cache: 'no-store' });
        if (!response.ok) throw new Error('online scene unavailable');
        const payload = await response.json() as { draft?: unknown; published?: unknown; versions?: unknown };
        const loadedDraft = payload.draft ? resolveSceneDraft(payload.draft) : recovery;
        resetReferenceRef.current = structuredClone(loadedDraft);
        setDraft(loadedDraft);
        setUndoStack([]);
        setRedoStack([]);
        setPublishedScene(resolvePublishedScene(payload.published));
        if (Array.isArray(payload.versions)) {
          setVersions(payload.versions.flatMap((entry) => {
            if (!entry || typeof entry !== 'object') return [];
            const candidate = entry as Record<string, unknown>;
            let scene: SceneDraft;
            try { scene = resolveSceneDraft(candidate.scene); } catch { return []; }
            if (typeof candidate.id !== 'string' || typeof candidate.version_number !== 'number' || typeof candidate.label !== 'string' || typeof candidate.created_at !== 'string') return [];
            return [{ id: candidate.id, version_number: candidate.version_number, label: candidate.label, display_name: typeof candidate.display_name === 'string' ? candidate.display_name : null, scene, is_baseline: candidate.is_baseline === true, is_current: candidate.is_current === true, source_version_id: typeof candidate.source_version_id === 'string' ? candidate.source_version_id : null, created_at: candidate.created_at }];
          }));
        }
      } catch {
        resetReferenceRef.current = structuredClone(recovery);
        setDraft(recovery);
        setUndoStack([]);
        setRedoStack([]);
        setSaveStatus('error');
      } finally {
        setDraftRestored(true);
      }
    };
    void loadDraft();
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!positionsRestored) return;
    window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(positions));
  }, [positions, positionsRestored]);

  useEffect(() => {
    if (!draftRestored) return;
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    const frame = window.requestAnimationFrame(() => setSaveStatus('saving'));
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/studio/scene', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) });
        setSaveStatus(response.ok ? 'saved' : 'error');
      } catch { setSaveStatus('error'); }
    }, 1000);
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timeout); };
  }, [draft, draftRestored]);

  useEffect(() => {
    return () => { if (assetPreviewUrl) URL.revokeObjectURL(assetPreviewUrl); };
  }, [assetPreviewUrl]);

  useEffect(() => {
    window.localStorage.setItem(GUIDE_STORAGE_KEY, guideMode);
  }, [guideMode]);

  useEffect(() => {
    sendPreviewEnvironment();
  }, [sendPreviewEnvironment]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || isTypingTarget(event.target)) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if (event.key === 'Escape' && mode !== 'edit') {
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
  }, [mode, redo, undo]);

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
    commitDraftMutation((current) => updateSceneDraft(current, selectedObjectId, patch, effectiveEditingTarget));
  }

  function createOverride() {
    if (!activeBreakpoint) return;
    commitDraftMutation((current) => createSceneResponsiveOverride(current, selectedObjectId, activeBreakpoint));
    setEditingTarget({ mode: 'override', breakpointId: activeBreakpoint });
  }

  function removeOverride() {
    if (!activeBreakpoint) return;
    commitDraftMutation((current) => removeSceneResponsiveOverride(current, selectedObjectId, activeBreakpoint));
    setEditingTarget({ mode: 'base' });
  }

  function removePresetOverride() {
    commitDraftMutation((current) => removeScenePresetOverride(current, selectedObjectId, viewport.id as ScenePresetOverrideId));
    setEditingTarget({ mode: 'base' });
  }

  function resetSelectedObject() {
    const original = getSceneObject(resetReferenceRef.current, selectedObjectId);
    if (!original) return;
    commitDraftMutation((current) => {
      return {
        ...current,
        objects: current.objects.map((object) => object.id === selectedObjectId
          ? { ...object, offsetX: original.offsetX, offsetY: original.offsetY, scale: original.scale, rotation: original.rotation, visible: original.visible }
          : object),
      };
    });
    setEditingTarget({ mode: 'base' });
  }

  function resetDraft() {
    const baseline = cloneBaselineSceneDraft();
    resetReferenceRef.current = structuredClone(baseline);
    commitDraftMutation(() => baseline);
    setSelectedObjectId('seasonal-fig');
    setEditingTarget({ mode: 'base' });
  }

  async function uploadAsset() {
    if (!assetFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', assetFile);
      const response = await fetch('/api/studio/assets', { method: 'POST', body: form });
      if (!response.ok) throw new Error(await response.text());
      const uploaded = await response.json() as Pick<SceneObjectDraft, 'id' | 'name' | 'asset'>;
      const object: SceneObjectDraft = { ...uploaded, rendererType: 'image', anchorX: 'right', anchorY: 'bottom', zIndex: 4, offsetX: -48, offsetY: -48, scale: 1, rotation: 0, visible: true, locked: false, availability: 'permanent', responsiveOverrides: {}, presetOverrides: {} };
      commitDraftMutation((current) => addSceneObject(current, object));
      resetReferenceRef.current = addSceneObject(resetReferenceRef.current, object);
      setSelectedObjectId(object.id);
      setAssetFile(null);
      setAssetPreviewUrl(null);
    } catch { setSaveStatus('error'); } finally { setUploading(false); }
  }

  async function replaceSelectedAsset(file: File) {
    setReplacingAsset(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/studio/assets', { method: 'POST', body: form });
      if (!response.ok) throw new Error(await response.text());
      const uploaded = await response.json() as Pick<SceneObjectDraft, 'asset'>;
      if (!uploaded.asset) throw new Error('asset missing');
      commitDraftMutation((current) => replaceSceneObjectAsset(current, selectedObjectId, uploaded.asset));
    } catch { setSaveStatus('error'); } finally { setReplacingAsset(false); }
  }

  async function publishDraft() {
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/studio/scene', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) });
      if (!response.ok) throw new Error('publish failed');
      const payload = await response.json() as { scene: unknown };
      setPublishedScene(resolvePublishedScene(payload.scene));
      if (payload && 'version' in payload && payload.version && typeof payload.version === 'object') {
        const version = payload.version as Record<string, unknown>;
        if (typeof version.id === 'string' && typeof version.version_number === 'number' && typeof version.label === 'string' && typeof version.created_at === 'string') {
          const nextVersion: SceneVersionRecord = { id: version.id, version_number: version.version_number, label: version.label, display_name: null, scene: draft, is_baseline: false, is_current: true, source_version_id: typeof version.source_version_id === 'string' ? version.source_version_id : null, created_at: version.created_at };
          setVersions((current) => [nextVersion, ...current.map((entry) => ({ ...entry, is_current: false }))]);
        }
      }
      setSaveStatus('saved');
      enterMode('edit');
    } catch { setSaveStatus('error'); }
  }

  async function renameVersion(version: SceneVersionRecord) {
    const displayName = renameValue.trim().slice(0, 60);
    try {
      const response = await fetch('/api/studio/scene', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ versionId: version.id, displayName }) });
      if (!response.ok) throw new Error('rename failed');
      setVersions((current) => current.map((entry) => entry.id === version.id ? { ...entry, display_name: displayName || null } : entry));
      setRenamingVersionId(null);
      setRenameValue('');
    } catch { setSaveStatus('error'); }
  }

  function previewVersion(version: SceneVersionRecord) {
    setVersionPreview(version);
    setMode('preview');
    setUiHidden(false);
  }

  async function rollbackVersion(version: SceneVersionRecord) {
    if (version.is_current || !window.confirm(`Ripristinare v${version.version_number}?\nVerrà creata una nuova versione.\nLa cronologia esistente non verrà cancellata.`)) return;
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/studio/scene', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'rollback', scene: version.scene, sourceVersionId: version.id }) });
      if (!response.ok) throw new Error('rollback failed');
      const payload = await response.json() as { scene?: unknown; version?: Record<string, unknown> };
      const nextScene = resolveSceneDraft(payload.scene);
      setDraft(nextScene);
      setPublishedScene(resolvePublishedScene(nextScene));
      resetReferenceRef.current = structuredClone(nextScene);
      setUndoStack([]);
      setRedoStack([]);
      setVersionPreview(null);
      if (payload.version && typeof payload.version.id === 'string' && typeof payload.version.version_number === 'number' && typeof payload.version.label === 'string' && typeof payload.version.created_at === 'string') {
        const nextVersion: SceneVersionRecord = { id: payload.version.id, version_number: payload.version.version_number, label: payload.version.label, display_name: null, scene: nextScene, is_baseline: false, is_current: true, source_version_id: version.id, created_at: payload.version.created_at };
        setVersions((current) => [nextVersion, ...current.map((entry) => ({ ...entry, is_current: false }))]);
      }
      setSaveStatus('saved');
      enterMode('edit');
    } catch { setSaveStatus('error'); }
  }

  function enterMode(nextMode: SceneMode) {
    if (nextMode !== 'preview') setVersionPreview(null);
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
              Viewport CSS
            </label>
            <select
              id="studio-viewport"
              className={styles.select}
              value={viewportId}
              onChange={(event) => setViewportId(event.target.value as StudioViewportPresetId)}
            >
              {STUDIO_VIEWPORT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.width} × {preset.height} · {(() => {
                    const selected = getSceneObject(draft, selectedObjectId) ?? draft.objects[0];
                    const state = getSceneObjectResponsiveState(selected, preset, preset.id as ScenePresetOverrideId);
                    const band = state.bandId ? SCENE_RESPONSIVE_LABELS[state.bandId] : 'BASELINE';
                    const level = state.status === 'hidden' ? 'HIDDEN' : state.overridePresetId ? 'OVERRIDE PRESET' : state.status === 'override' ? 'OVERRIDE FASCIA' : 'BASE';
                    return `${band} · ${level}`;
                  })()}
                </option>
              ))}
            </select>
            <p className={styles.statusText}>Dimensioni logiche del browser, non risoluzione fisica del monitor.</p>
            <p className={styles.statusText}>Finestra attuale: {windowSize.width} × {windowSize.height} CSS px</p>
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
              <button type="button" className={styles.modeButton} disabled={!publishedScene} onClick={() => enterMode('online')} title="Scena pubblicata corrente">
                Online
              </button>
            </div>
            <p className={styles.statusText}>
              {viewport.width} × {viewport.height} CSS px · {selectedResponsiveState.bandId ? SCENE_RESPONSIVE_LABELS[selectedResponsiveState.bandId] : 'BASELINE'} · scala {Math.round(scale * 100)}%
            </p>
            <p className={styles.statusText}>{saveStatus === 'saving' ? 'Salvataggio…' : saveStatus === 'saved' ? 'Bozza salvata' : saveStatus === 'error' ? 'Errore' : ''}</p>
            <div className={styles.historyControls} aria-label="Cronologia bozza">
              <button type="button" className={styles.secondaryButton} onClick={undo} disabled={undoStack.length === 0}>Undo</button>
              <button type="button" className={styles.secondaryButton} onClick={redo} disabled={redoStack.length === 0}>Redo</button>
            </div>
            <label className={styles.fieldLabel} htmlFor="studio-guides">
              Guide
            </label>
            <select id="studio-guides" className={styles.select} value={guideMode} onChange={(event) => setGuideMode(event.target.value as SceneGuideMode)}>
              <option value="off">Off</option>
              <option value="content">Contenuto</option>
              <option value="interactive">Interattivi</option>
              <option value="all">Tutti</option>
            </select>
            <button type="button" className={styles.primaryButton} onClick={() => setUiHidden(true)}>
              Nascondi UI <kbd>H</kbd>
            </button>
            <button type="button" className={styles.primaryButton} onClick={publishDraft}>PUBBLICA</button>
            <section className={styles.versionHistory} aria-label="Cronologia versioni">
              <div className={styles.propertyHeading}><strong>Cronologia</strong><span>{versions.length} versioni</span></div>
              <div className={styles.versionList}>
                {versions.map((version) => (
                  <div key={version.id} className={styles.versionRow}>
                    <div className={styles.versionMeta}>
                      <strong>v{version.version_number}</strong>
                      {renamingVersionId === version.id ? (
                        <input className={styles.versionNameInput} value={renameValue} maxLength={60} autoFocus onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void renameVersion(version); if (event.key === 'Escape') { setRenamingVersionId(null); setRenameValue(''); } }} aria-label={`Nome v${version.version_number}`} />
                      ) : <span>{version.is_current ? 'CURRENT · ' : ''}{version.is_baseline ? `BASELINE${version.display_name ? ` · ${version.display_name}` : ''}` : (version.display_name || version.label)}</span>}
                      <time dateTime={version.created_at}>{new Date(version.created_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</time>
                    </div>
                    <div className={styles.versionActions}>
                      <button type="button" className={styles.modeButton} onClick={() => previewVersion(version)}>Anteprima</button>
                      <button type="button" className={styles.modeButton} disabled={version.is_current} onClick={() => void rollbackVersion(version)}>Ripristina</button>
                      {renamingVersionId === version.id ? <><button type="button" className={styles.modeButton} onClick={() => void renameVersion(version)}>Salva</button><button type="button" className={styles.modeButton} onClick={() => { setRenamingVersionId(null); setRenameValue(''); }}>Annulla</button></> : <button type="button" className={styles.modeButton} onClick={() => { setRenamingVersionId(version.id); setRenameValue(version.display_name ?? ''); }}>Rinomina</button>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </FloatingPanel>

          <FloatingPanel
            id="objects"
            title="Oggetti"
            position={positions.objects}
            onPositionChange={(position) => updatePanelPosition('objects', position)}
            onReset={() => resetPanelPosition('objects')}
          >
            <ul className={styles.objectList}>
              {draft.objects.map((baseObject) => {
                const objectId = baseObject.id;
                const object = resolveSceneObjectForViewport(baseObject, viewport, viewport.id as ScenePresetOverrideId).object;
                return (
                  <li key={objectId}>
                    <button
                      type="button"
                      className={selectedObjectId === objectId ? styles.objectButtonActive : styles.objectButton}
                      onClick={() => setSelectedObjectId(objectId)}
                      aria-pressed={selectedObjectId === objectId}
                    >
                      <span aria-hidden="true">{object.visible ? '●' : '○'}</span>
                      <span>{object.name}</span>
                      <span className={styles.objectState} aria-label={object.locked ? 'Bloccato' : 'Modificabile'}>
                        {object.locked ? '🔒' : '↗'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <label className={styles.fieldLabel} htmlFor="studio-asset-upload">Carica asset · PNG/WebP · max 1 MB</label>
            <input className={styles.fileInput} id="studio-asset-upload" type="file" accept="image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; setAssetFile(file); setAssetPreviewUrl(file ? URL.createObjectURL(file) : null); }} />
            {assetPreviewUrl ? <img src={assetPreviewUrl} alt="Anteprima asset" style={{ display: 'block', maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }} /> : null}
            <button type="button" className={styles.secondaryButton} disabled={!assetFile || uploading} onClick={uploadAsset}>{uploading ? 'Caricamento…' : 'Aggiungi alla scena'}</button>
          </FloatingPanel>

          <FloatingPanel
            id="properties"
            title="Proprietà"
            position={positions.properties}
            onPositionChange={(position) => updatePanelPosition('properties', position)}
            onReset={() => resetPanelPosition('properties')}
          >
            <div className={styles.propertyHeading}>
              <strong>{selectedBaseObject.name}</strong>
              <span>{selectedBaseObject.locked ? 'Bloccato' : 'Modificabile'}</span>
            </div>
            <p className={styles.statusText}>Modifica: {viewport.width} × {viewport.height}</p>
            <p className={styles.statusText}>{presetOverride ? 'Personalizzato' : `Eredita da ${selectedResponsiveState.bandId ? SCENE_RESPONSIVE_LABELS[selectedResponsiveState.bandId] : 'BASE'}`}</p>
            {collisions.length > 0 ? <p className={styles.collisionWarning}>⚠ Interferenza: {[...new Set(collisions.map((collision) => collision.category === 'postcard' ? 'cartolina' : collision.category))].join(', ')}</p> : null}
            {presetOverride ? <button type="button" className={styles.secondaryButton} onClick={removePresetOverride}>Ripristina questa risoluzione</button> : null}
            <button type="button" className={styles.secondaryButton} onClick={() => setAdvancedOpen((open) => !open)} aria-expanded={advancedOpen}>Avanzate {advancedOpen ? '−' : '+'}</button>
            {advancedOpen ? <div className={styles.advancedSection}>
              <div className={styles.modeGroup} aria-label="Target avanzato">
                <button type="button" className={editingTarget.mode === 'base' ? styles.modeActive : styles.modeButton} onClick={() => setEditingTarget({ mode: 'base' })}>Base</button>
                <button type="button" className={editingTarget.mode === 'override' ? styles.modeActive : styles.modeButton} disabled={!activeBreakpoint || !hasCurrentOverride} onClick={() => activeBreakpoint && setEditingTarget({ mode: 'override', breakpointId: activeBreakpoint })}>Override fascia</button>
              </div>
              <p className={styles.statusText}>{editingTarget.mode === 'override' && activeBreakpoint ? `MODIFICA · OVERRIDE FASCIA · ${SCENE_RESPONSIVE_LABELS[activeBreakpoint]}` : 'MODIFICA · BASE'}</p>
              {activeBreakpoint && !hasCurrentOverride ? <button type="button" className={styles.secondaryButton} onClick={createOverride}>Crea override fascia</button> : null}
            </div> : null}
            <div className={styles.numericGrid}>
              <NumericField label="X · px" value={selectedObject.offsetX} step={1} disabled={selectedBaseObject.locked} onChange={(offsetX) => patchSelectedObject({ offsetX })} />
              <NumericField label="Y · px" value={selectedObject.offsetY} step={1} disabled={selectedBaseObject.locked} onChange={(offsetY) => patchSelectedObject({ offsetY })} />
              <NumericField label="Scala" value={selectedObject.scale} step={0.05} disabled={selectedBaseObject.locked} onChange={(scaleValue) => patchSelectedObject({ scale: scaleValue })} />
              <NumericField label="Rotazione · °" value={selectedObject.rotation} step={1} disabled={selectedBaseObject.locked} onChange={(rotation) => patchSelectedObject({ rotation })} />
              <NumericField label="Livello" value={selectedBaseObject.zIndex} step={1} disabled={selectedBaseObject.locked || effectiveEditingTarget.mode !== 'base'} onChange={(zIndex) => patchSelectedObject({ zIndex })} />
            </div>
            {effectiveEditingTarget.mode !== 'base' ? <label className={styles.fieldLabel} htmlFor="studio-override-visibility">Visibile in questo livello</label> : null}
            {effectiveEditingTarget.mode !== 'base' ? <select id="studio-override-visibility" className={styles.select} value={selectedObject.visible ? 'on' : 'off'} onChange={(event) => patchSelectedObject({ visible: event.target.value === 'on' })}>
              <option value="on">ON</option>
              <option value="off">OFF</option>
            </select> : null}
            <label className={styles.fieldLabel} htmlFor="studio-availability">Durata</label>
            <select id="studio-availability" className={styles.select} value={selectedBaseObject.availability} onChange={(event) => commitDraftMutation((current) => updateSceneDraft(current, selectedObjectId, { availability: event.target.value as 'permanent' | 'seasonal' }, { mode: 'base' }))}>
              <option value="permanent">Permanente</option>
              <option value="seasonal">Stagionale</option>
            </select>
            {selectedBaseObject.availability === 'seasonal' ? <div className={styles.numericGrid}>
              <label className={styles.numericField}><span>Da · MM-DD</span><input value={selectedBaseObject.seasonal?.activeFrom ?? '01-01'} pattern="\d{2}-\d{2}" onChange={(event) => commitDraftMutation((current) => updateSceneDraft(current, selectedObjectId, { seasonal: { activeFrom: event.target.value, activeUntil: selectedBaseObject.seasonal?.activeUntil ?? '12-31' } }, { mode: 'base' }))} /></label>
              <label className={styles.numericField}><span>A · MM-DD</span><input value={selectedBaseObject.seasonal?.activeUntil ?? '12-31'} pattern="\d{2}-\d{2}" onChange={(event) => commitDraftMutation((current) => updateSceneDraft(current, selectedObjectId, { seasonal: { activeFrom: selectedBaseObject.seasonal?.activeFrom ?? '01-01', activeUntil: event.target.value } }, { mode: 'base' }))} /></label>
            </div> : null}
            <div className={styles.propertyActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => commitDraftMutation((current) => updateSceneDraft(current, selectedObjectId, { locked: !selectedBaseObject.locked }))}>
                {selectedBaseObject.locked ? 'Sblocca' : 'Blocca'}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => patchSelectedObject({ visible: !selectedObject.visible })}>
                {selectedObject.visible ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
            <input ref={replaceAssetInputRef} className={styles.hiddenFileInput} type="file" accept="image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (file) void replaceSelectedAsset(file); }} />
            <button type="button" className={styles.secondaryButton} disabled={replacingAsset} onClick={() => replaceAssetInputRef.current?.click()}>{replacingAsset ? 'Sostituzione…' : 'Sostituisci asset'}</button>
            <button type="button" className={styles.secondaryButton} onClick={effectiveEditingTarget.mode === 'override' ? removeOverride : effectiveEditingTarget.mode === 'preset' ? removePresetOverride : resetSelectedObject}>
              {effectiveEditingTarget.mode === 'override' ? 'Ripristina override fascia' : effectiveEditingTarget.mode === 'preset' ? 'Ripristina override preset' : 'Reset oggetto'}
            </button>
            <button type="button" className={styles.resetDraftButton} onClick={resetDraft}>
              Reset bozza
            </button>
          </FloatingPanel>
        </div>
      ) : null}
    </main>
  );
}
