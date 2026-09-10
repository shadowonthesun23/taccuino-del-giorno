'use client';

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
import { STUDIO_PREVIEW_MESSAGE, STUDIO_TOGGLE_UI_MESSAGE } from '@/lib/studio-preview-protocol';
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

type PanelId = 'viewport' | 'objects';
type PanelPositions = Record<PanelId, Point>;

const INITIAL_POSITIONS: PanelPositions = {
  viewport: { x: 24, y: 24 },
  objects: { x: 24, y: 342 },
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
    };
  } catch {
    return {};
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
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

export default function StudioShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewportId, setViewportId] = useState<StudioViewportPresetId>('1440x900');
  const [mode, setMode] = useState<SceneMode>('edit');
  const [uiHidden, setUiHidden] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 1440, height: 900 });
  const [positions, setPositions] = useState<PanelPositions>(INITIAL_POSITIONS);
  const [positionsRestored, setPositionsRestored] = useState(false);
  const viewport = getStudioViewportPreset(viewportId);

  useEffect(() => {
    const updateWindowSize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      if (
        event.data &&
        typeof event.data === 'object' &&
        (event.data as { type?: unknown }).type === STUDIO_TOGGLE_UI_MESSAGE
      ) {
        setUiHidden((current) => !current);
      }
    };
    window.addEventListener('message', handlePreviewMessage);
    return () => window.removeEventListener('message', handlePreviewMessage);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = parseStoredPositions(window.localStorage.getItem(PANEL_STORAGE_KEY));
      const defaultObjects = { x: Math.max(24, window.innerWidth - 292), y: 24 };
      setPositions({
        viewport: stored.viewport ?? INITIAL_POSITIONS.viewport,
        objects: stored.objects ?? defaultObjects,
      });
      setPositionsRestored(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!positionsRestored) return;
    window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(positions));
  }, [positions, positionsRestored]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'h' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      setUiHidden((current) => !current);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scale = calculatePreviewScale(viewport, windowSize);
  const previewSrc = useMemo(() => {
    const query = new URLSearchParams({ mode, viewport: viewport.id });
    return `/studio/preview?${query.toString()}`;
  }, [mode, viewport.id]);

  const sendPreviewEnvironment = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: STUDIO_PREVIEW_MESSAGE, mode, viewport: viewport.id },
      window.location.origin,
    );
  }, [mode, viewport.id]);

  useEffect(() => {
    sendPreviewEnvironment();
  }, [sendPreviewEnvironment]);

  function updatePanelPosition(id: PanelId, position: Point) {
    setPositions((current) => ({ ...current, [id]: position }));
  }

  function resetPanelPosition(id: PanelId) {
    const next = id === 'objects'
      ? { x: Math.max(24, window.innerWidth - 292), y: 24 }
      : INITIAL_POSITIONS.viewport;
    updatePanelPosition(id, next);
  }

  return (
    <main className={styles.studio} data-studio-ui-hidden={uiHidden ? 'true' : 'false'}>
      <div
        className={styles.previewFrame}
        style={{ width: viewport.width * scale, height: viewport.height * scale }}
      >
        <iframe
          ref={iframeRef}
          className={styles.previewIframe}
          src={previewSrc}
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

      {uiHidden ? null : (
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
              <button
                type="button"
                className={mode === 'edit' ? styles.modeActive : styles.modeButton}
                onClick={() => setMode('edit')}
              >
                Modifica
              </button>
              <button
                type="button"
                className={mode === 'preview' ? styles.modeActive : styles.modeButton}
                onClick={() => setMode('preview')}
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
              <li><span aria-hidden="true">🔒</span> Tazza</li>
              <li><span aria-hidden="true">🔒</span> Boccetta</li>
              <li><span className={styles.figDot} aria-hidden="true">●</span> Fico</li>
            </ul>
          </FloatingPanel>
        </div>
      )}
    </main>
  );
}
