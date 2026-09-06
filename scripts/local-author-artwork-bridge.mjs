#!/usr/bin/env node

import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

const HOST = '127.0.0.1';
const PORT = Number(process.env.TACCUINO_ARTWORK_BRIDGE_PORT ?? 43127);
const MAX_BODY_BYTES = 16 * 1024;
const MAX_DATA_URL_LENGTH = 700_000;
const WORKER_TIMEOUT_MS = 5 * 60 * 1_000;
const WORK_DIR = process.env.TACCUINO_WORK_DIR ?? path.join(
  homedir(),
  'Library',
  'Application Support',
  'Taccuino del Giorno',
  'author-artwork',
);
const WORKER_PATH = path.join(process.cwd(), 'scripts', 'local-author-artwork-worker.mjs');
const allowedOrigins = new Set(
  (process.env.TACCUINO_ALLOWED_ORIGINS
    ?? 'https://dayatlas.vercel.app,http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

let activeRun = false;

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function corsOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return '';
  return allowedOrigins.has(origin) ? origin : null;
}

function setCorsHeaders(response, origin) {
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Cache-Control', 'no-store');
}

function sendJson(response, status, body, origin = '') {
  setCorsHeaders(response, origin);
  const payload = JSON.stringify(body);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(payload);
}

async function readRequestBody(request) {
  const chunks = [];
  let total = 0;

  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      throw new Error('Payload locale troppo grande.');
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function runWorker(date) {
  const { stderr } = await execFileAsync(
    process.execPath,
    [WORKER_PATH],
    {
      env: {
        ...process.env,
        TACCUINO_TARGET_DATE: date,
        TACCUINO_WORK_DIR: WORK_DIR,
      },
      timeout: WORKER_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
    },
  );

  if (stderr.trim()) console.warn(stderr.trim());
}

async function readGeneratedArtwork(date) {
  const statePath = path.join(WORK_DIR, date, 'state.json');
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  if (state.status !== 'success' || typeof state.outputPath !== 'string') {
    throw new Error('Il worker non ha prodotto un disegno valido.');
  }

  const workRoot = `${path.resolve(WORK_DIR)}${path.sep}`;
  const outputPath = path.resolve(state.outputPath);
  if (!outputPath.startsWith(workRoot)) {
    throw new Error('Percorso output locale non consentito.');
  }

  const output = await readFile(outputPath);
  const metadata = await sharp(output).metadata();
  if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
    throw new Error('Il file prodotto non è un WebP leggibile.');
  }

  const dataUrl = `data:image/webp;base64,${output.toString('base64')}`;
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('Il WebP prodotto supera il limite previsto dall’editor.');
  }

  return {
    dataUrl,
    bytes: output.length,
    dimensions: `${metadata.width}x${metadata.height}`,
    authorName: typeof state.authorName === 'string' ? state.authorName : '',
    sourceUrl: typeof state.sourceUrl === 'string' ? state.sourceUrl : '',
  };
}

async function handleGenerate(request, response, origin) {
  if (activeRun) {
    sendJson(response, 409, { error: 'È già in corso una generazione locale.' }, origin);
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readRequestBody(request));
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : 'Payload non valido.' }, origin);
    return;
  }

  const date = typeof payload?.data === 'string' ? payload.data.trim() : '';
  if (!isValidIsoDate(date)) {
    sendJson(response, 400, { error: 'Data non valida.' }, origin);
    return;
  }

  activeRun = true;
  console.log(`[artwork-bridge] generazione richiesta per ${date}`);

  try {
    await runWorker(date);
    const artwork = await readGeneratedArtwork(date);
    sendJson(response, 200, { ok: true, data: date, ...artwork }, origin);
    console.log(`[artwork-bridge] generazione completata per ${date}: ${artwork.bytes} byte WebP`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generazione locale non riuscita.';
    console.error(`[artwork-bridge] ${message}`);
    sendJson(response, 502, { error: message }, origin);
  } finally {
    activeRun = false;
  }
}

async function handlePreview(request, response, origin) {
  const { searchParams } = new URL(request.url, `http://${HOST}:${PORT}`);
  const date = searchParams.get('data')?.trim() ?? '';

  if (!isValidIsoDate(date)) {
    sendJson(response, 400, { error: 'Data non valida.' }, origin);
    return;
  }

  try {
    const artwork = await readGeneratedArtwork(date);
    sendJson(response, 200, { ok: true, data: date, ...artwork }, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Disegno parcheggiato non disponibile.';
    sendJson(response, 404, { error: message }, origin);
  }
}

const server = createServer(async (request, response) => {
  const origin = corsOrigin(request);

  if (origin === null) {
    sendJson(response, 403, { error: 'Origine non autorizzata.' });
    return;
  }

  if (request.method === 'OPTIONS') {
    setCorsHeaders(response, origin ?? '');
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { ok: true, service: 'taccuino-author-artwork-bridge' }, origin ?? '');
    return;
  }

  if (request.method === 'GET' && request.url?.startsWith('/preview?')) {
    await handlePreview(request, response, origin ?? '');
    return;
  }

  if (request.method === 'POST' && request.url === '/generate') {
    await handleGenerate(request, response, origin ?? '');
    return;
  }

  sendJson(response, 404, { error: 'Risorsa non trovata.' }, origin ?? '');
});

server.requestTimeout = WORKER_TIMEOUT_MS + 10_000;
server.headersTimeout = 15_000;
server.listen(PORT, HOST, () => {
  console.log(`[artwork-bridge] in ascolto su http://${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`[artwork-bridge] arresto richiesto (${signal})`);
  server.close(() => process.exit(0));
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
