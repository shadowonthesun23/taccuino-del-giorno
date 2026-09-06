#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { appendFile, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

const ROME_TIME_ZONE = 'Europe/Rome';
const DEFAULT_BASE_URL = 'https://dayatlas.vercel.app';
const DEFAULT_SHORTCUT_NAME = 'Ritratto ad Acquerello';
const DEFAULT_WORK_DIR = path.join(
  homedir(),
  'Library',
  'Application Support',
  'Taccuino del Giorno',
  'author-artwork',
);

const API_TIMEOUT_MS = 30_000;
const SHORTCUT_TIMEOUT_MS = 4 * 60 * 1_000;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MIN_IMAGE_BYTES = 32 * 1024;
const MIN_GENERATED_DIMENSION = 512;
const MAX_GENERATED_DIMENSION = 4096;
const WEBP_QUALITY = 88;
const ARTWORK_GENERATION_VERSION = 'square-contain-v2';

const baseUrl = (process.env.TACCUINO_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
const shortcutName = process.env.TACCUINO_SHORTCUT_NAME ?? DEFAULT_SHORTCUT_NAME;
const shortcutsBinary = process.env.TACCUINO_SHORTCUT_BIN ?? '/usr/bin/shortcuts';
const workDir = process.env.TACCUINO_WORK_DIR ?? DEFAULT_WORK_DIR;
const requestedDate = process.env.TACCUINO_TARGET_DATE ?? getRomeDate();

function getRomeDate() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ROME_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date());
}

function assertDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Data non valida: ${value}`);
  }
}

function slugify(value) {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'autore';
}

function extensionFor(contentType, sourceUrl) {
  const normalizedType = contentType.split(';', 1)[0].trim().toLowerCase();

  if (normalizedType === 'image/jpeg') return 'jpg';
  if (normalizedType === 'image/png') return 'png';
  if (normalizedType === 'image/webp') return 'webp';
  if (normalizedType === 'image/avif') return 'avif';
  if (normalizedType === 'image/gif') return 'gif';

  const extension = path.extname(new URL(sourceUrl).pathname).replace('.', '').toLowerCase();
  return /^[a-z0-9]{2,5}$/.test(extension) ? extension : 'img';
}

function hashBuffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function hashFile(filePath) {
  return hashBuffer(await readFile(filePath));
}

async function fileSize(filePath) {
  return (await stat(filePath)).size;
}

async function appendLog(logPath, message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  await appendFile(logPath, line, 'utf8');
  console.log(message);
}

async function fetchDailyData(date) {
  const url = `${baseUrl}/api/oggi?data=${encodeURIComponent(date)}`;
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`API giornaliera non disponibile (${response.status}): ${url}`);
  }

  const payload = await response.json();

  if (!payload || typeof payload !== 'object') {
    throw new Error('La risposta dell’API giornaliera non è un oggetto JSON.');
  }

  if (payload.data !== date) {
    throw new Error(`Data API inattesa: attesa ${date}, ricevuta ${String(payload.data)}.`);
  }

  const authorName = typeof payload.autore_giorno === 'string' ? payload.autore_giorno.trim() : '';
  const sourceUrl = typeof payload.foto_autore_url === 'string' ? payload.foto_autore_url.trim() : '';

  if (!authorName) {
    throw new Error(`Nessun autore del giorno disponibile per ${date}.`);
  }

  if (!/^https:\/\//i.test(sourceUrl)) {
    throw new Error(`La foto dell’autore non è un URL HTTPS valido: ${sourceUrl || '(vuoto)'}`);
  }

  return { authorName, sourceUrl, payload };
}

async function downloadSource(sourceUrl, targetPath) {
  const response = await fetch(sourceUrl, {
    headers: { accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Foto dell’autore non scaricabile (${response.status}): ${sourceUrl}`);
  }

  const sourceBuffer = Buffer.from(await response.arrayBuffer());

  if (sourceBuffer.length < 1_024 || sourceBuffer.length > MAX_SOURCE_BYTES) {
    throw new Error(`Dimensione della foto sorgente non plausibile: ${sourceBuffer.length} byte.`);
  }

  await writeFile(targetPath, sourceBuffer, { flag: 'wx' });

  const metadata = await sharp(sourceBuffer).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 64 || metadata.height < 64) {
    throw new Error('La foto sorgente non contiene dimensioni immagine valide.');
  }

  return {
    bytes: sourceBuffer.length,
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    dimensions: `${metadata.width}x${metadata.height}`,
    sha256: hashBuffer(sourceBuffer),
  };
}

async function runImagePlayground(sourcePath, pngPath) {
  try {
    await execFileAsync(
      shortcutsBinary,
      ['run', shortcutName, '--input-path', sourcePath, '--output-path', pngPath],
      {
        timeout: SHORTCUT_TIMEOUT_MS,
        maxBuffer: 2 * 1024 * 1024,
        windowsHide: true,
      },
    );
  } catch (error) {
    const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : '';
    const suffix = stderr ? ` ${stderr}` : '';
    throw new Error(`Image Playground/Shortcuts non ha completato la generazione.${suffix}`);
  }

  const generatedBytes = await fileSize(pngPath).catch(() => 0);
  if (generatedBytes < MIN_IMAGE_BYTES) {
    throw new Error(`Output PNG assente o troppo piccolo (${generatedBytes} byte).`);
  }

  const metadata = await sharp(pngPath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('L’output di Image Playground non è un’immagine leggibile.');
  }

  if (
    metadata.width < MIN_GENERATED_DIMENSION ||
    metadata.height < MIN_GENERATED_DIMENSION ||
    metadata.width > MAX_GENERATED_DIMENSION ||
    metadata.height > MAX_GENERATED_DIMENSION
  ) {
    throw new Error(`Dimensioni output non previste: ${metadata.width}x${metadata.height}.`);
  }

  const ratio = metadata.width / metadata.height;
  if (Math.abs(ratio - 1) > 0.03) {
    throw new Error(`L’output non è quadrato come previsto: ${metadata.width}x${metadata.height}.`);
  }

  return { bytes: generatedBytes, dimensions: `${metadata.width}x${metadata.height}` };
}

async function prepareImagePlaygroundInput(sourcePath, inputPath) {
  await sharp(sourcePath)
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 248, g: 246, b: 240, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toFile(inputPath);

  const metadata = await sharp(inputPath).metadata();
  if (metadata.width !== 1024 || metadata.height !== 1024) {
    throw new Error(`Input preparato con dimensioni inattese: ${metadata.width}x${metadata.height}.`);
  }

  return { dimensions: `${metadata.width}x${metadata.height}` };
}

async function convertToWebp(pngPath, webpPath) {
  await sharp(pngPath)
    .webp({ quality: WEBP_QUALITY, effort: 4, smartSubsample: true })
    .toFile(webpPath);

  const bytes = await fileSize(webpPath);
  if (bytes < MIN_IMAGE_BYTES) {
    throw new Error(`Output WebP assente o troppo piccolo (${bytes} byte).`);
  }

  const metadata = await sharp(webpPath).metadata();
  if (!metadata.width || !metadata.height || metadata.format !== 'webp') {
    throw new Error('La conversione WebP non ha prodotto un file WebP valido.');
  }

  return { bytes, dimensions: `${metadata.width}x${metadata.height}` };
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  assertDate(requestedDate);

  const authorData = await fetchDailyData(requestedDate);
  const authorSlug = slugify(authorData.authorName);
  const dateDir = path.join(workDir, requestedDate);
  const sourceDir = path.join(dateDir, 'source');
  const outputDir = path.join(dateDir, 'output');
  const logPath = path.join(dateDir, 'worker.log');
  const statePath = path.join(dateDir, 'state.json');
  const sourcePath = path.join(sourceDir, `${requestedDate}-${authorSlug}-original.${extensionFor('', authorData.sourceUrl)}`);
  const outputPath = path.join(outputDir, `${requestedDate}-${authorSlug}.webp`);
  await mkdir(path.join(dateDir, 'runs'), { recursive: true });
  const runDir = await mkdtemp(path.join(dateDir, 'runs', `${Date.now()}-`));

  await mkdir(sourceDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });
  await appendLog(logPath, `Avvio preparazione parcheggiata per ${authorData.authorName} (${requestedDate}).`);

  const previousState = await readJson(statePath);
  let succeeded = false;
  let failureMessage = 'Generazione non completata.';

  try {
    const sourceRunPath = path.join(runDir, `${requestedDate}-${authorSlug}-original.${extensionFor('', authorData.sourceUrl)}`);
    const sourceInfo = await downloadSource(authorData.sourceUrl, sourceRunPath);
    await rename(sourceRunPath, sourcePath);

    await appendLog(logPath, `Sorgente verificata: ${sourceInfo.dimensions}, ${sourceInfo.bytes} byte.`);

    const playgroundInputPath = path.join(runDir, `${requestedDate}-${authorSlug}-input.png`);
    const playgroundInputInfo = await prepareImagePlaygroundInput(sourcePath, playgroundInputPath);
    await appendLog(logPath, `Input Image Playground preparato senza ritaglio: ${playgroundInputInfo.dimensions}.`);

    const existingOutput = await fileSize(outputPath).catch(() => 0);
    if (
      previousState?.status === 'success' &&
      previousState.generatorVersion === ARTWORK_GENERATION_VERSION &&
      previousState.authorName === authorData.authorName &&
      previousState.sourceSha256 === sourceInfo.sha256 &&
      existingOutput >= MIN_IMAGE_BYTES
    ) {
      const existingMetadata = await sharp(outputPath).metadata();
      if (existingMetadata.format === 'webp') {
        await appendLog(logPath, `Già completato: WebP valido presente (${existingOutput} byte).`);
        succeeded = true;
        return;
      }
    }

    const pngPath = path.join(runDir, `${requestedDate}-${authorSlug}.png`);
    const tempWebpPath = path.join(runDir, `${requestedDate}-${authorSlug}.webp`);
    const playgroundInfo = await runImagePlayground(playgroundInputPath, pngPath);
    await appendLog(logPath, `Image Playground completato: ${playgroundInfo.dimensions}, ${playgroundInfo.bytes} byte PNG temporanei.`);

    const webpInfo = await convertToWebp(pngPath, tempWebpPath);
    await rename(tempWebpPath, outputPath);

    const state = {
      status: 'success',
      mode: 'parked',
      generatorVersion: ARTWORK_GENERATION_VERSION,
      date: requestedDate,
      authorName: authorData.authorName,
      sourceUrl: authorData.sourceUrl,
      sourceSha256: sourceInfo.sha256,
      sourceDimensions: sourceInfo.dimensions,
      generatedPngDimensions: playgroundInfo.dimensions,
      generatedPngBytes: playgroundInfo.bytes,
      webpBytes: webpInfo.bytes,
      webpDimensions: webpInfo.dimensions,
      webpSha256: await hashFile(outputPath),
      outputPath,
      completedAt: new Date().toISOString(),
    };

    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await appendLog(logPath, `WebP validato e salvato: ${outputPath} (${webpInfo.bytes} byte).`);
    await appendLog(logPath, 'Nessuna pubblicazione remota eseguita: WebP parcheggiato in attesa della scelta editoriale.');
    succeeded = true;
  } catch (error) {
    failureMessage = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (succeeded) {
      await rm(runDir, { recursive: true, force: true });
    } else {
      const existingOutput = await fileSize(outputPath).catch(() => 0);
      const hasPreviousValidOutput = previousState?.status === 'success'
        && previousState.authorName === authorData.authorName
        && existingOutput >= MIN_IMAGE_BYTES;
      const failure = {
        message: failureMessage,
        runDir,
        failedAt: new Date().toISOString(),
      };

      if (hasPreviousValidOutput) {
        await appendLog(logPath, `Generazione non completata (${failureMessage}). Il WebP precedente resta disponibile: ${outputPath}`);
        await writeFile(statePath, `${JSON.stringify({ ...previousState, lastFailure: failure }, null, 2)}\n`, 'utf8');
      } else {
        await appendLog(logPath, `Generazione non completata. Run conservata per diagnosi: ${runDir}`);
        const failedState = {
          status: 'failed',
          mode: 'parked',
          date: requestedDate,
          authorName: authorData.authorName,
          sourceUrl: authorData.sourceUrl,
          outputPath,
          runDir,
          failedAt: failure.failedAt,
          error: failureMessage,
        };
        await writeFile(statePath, `${JSON.stringify(failedState, null, 2)}\n`, 'utf8');
      }
    }
  }
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Worker fallito: ${message}`);
  process.exitCode = 1;
});
