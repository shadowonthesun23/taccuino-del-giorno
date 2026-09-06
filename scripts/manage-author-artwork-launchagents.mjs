#!/usr/bin/env node

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const projectDir = process.cwd();
const nodePath = process.execPath;
const launchAgentsDir = path.join(homedir(), 'Library', 'LaunchAgents');
const logsDir = path.join(homedir(), 'Library', 'Logs', 'TaccuinoDelGiorno');
const workDir = path.join(homedir(), 'Library', 'Application Support', 'Taccuino del Giorno', 'author-artwork');
const uid = typeof process.getuid === 'function' ? process.getuid() : null;

const services = [
  {
    label: 'com.antonello.taccuino-author-artwork-bridge',
    program: path.join(projectDir, 'scripts', 'local-author-artwork-bridge.mjs'),
    stdout: path.join(logsDir, 'author-artwork-bridge.log'),
    stderr: path.join(logsDir, 'author-artwork-bridge.error.log'),
    keepAlive: true,
    runAtLoad: true,
  },
  {
    label: 'com.antonello.taccuino-author-artwork-worker',
    program: path.join(projectDir, 'scripts', 'local-author-artwork-worker.mjs'),
    stdout: path.join(logsDir, 'author-artwork-worker.log'),
    stderr: path.join(logsDir, 'author-artwork-worker.error.log'),
    keepAlive: false,
    runAtLoad: false,
  },
];

function xml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function plistFor(service) {
  const environment = [
    ['TACCUINO_WORK_DIR', workDir],
  ];
  const calendar = service.label.endsWith('-worker')
    ? `
    <key>StartCalendarInterval</key>
    <dict>
      <key>Hour</key>
      <integer>3</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xml(service.label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xml(nodePath)}</string>
    <string>${xml(service.program)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xml(projectDir)}</string>
  <key>EnvironmentVariables</key>
  <dict>
${environment.map(([key, value]) => `    <key>${xml(key)}</key>\n    <string>${xml(value)}</string>`).join('\n')}
  </dict>
  <key>ProcessType</key>
  <string>Background</string>
  <key>LowPriorityIO</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xml(service.stdout)}</string>
  <key>StandardErrorPath</key>
  <string>${xml(service.stderr)}</string>
  <key>ThrottleInterval</key>
  <integer>30</integer>
  <key>RunAtLoad</key>
  <${service.runAtLoad ? 'true' : 'false'}/>
  <key>KeepAlive</key>
  <${service.keepAlive ? 'true' : 'false'}/>${calendar}
</dict>
</plist>
`;
}

async function launchctl(args, allowFailure = false) {
  if (uid === null) return;

  try {
    await execFileAsync('/bin/launchctl', args, { maxBuffer: 1 * 1024 * 1024 });
  } catch (error) {
    if (allowFailure) return;
    const detail = typeof error?.stderr === 'string' ? error.stderr.trim() : '';
    throw new Error(`launchctl ${args.join(' ')} non riuscito.${detail ? ` ${detail}` : ''}`);
  }
}

async function uninstall() {
  await mkdir(launchAgentsDir, { recursive: true });
  for (const service of services) {
    const plistPath = path.join(launchAgentsDir, `${service.label}.plist`);
    await launchctl(['bootout', `gui/${uid}/${service.label}`], true);
    await rm(plistPath, { force: true });
    console.log(`Rimosso ${plistPath}`);
  }
}

async function install() {
  if (uid === null) throw new Error('Questo installer richiede una sessione utente macOS.');
  await mkdir(launchAgentsDir, { recursive: true });
  await mkdir(logsDir, { recursive: true });
  await mkdir(workDir, { recursive: true });

  for (const service of services) {
    const plistPath = path.join(launchAgentsDir, `${service.label}.plist`);
    await launchctl(['bootout', `gui/${uid}/${service.label}`], true);
    await writeFile(plistPath, plistFor(service), 'utf8');
    await launchctl(['bootstrap', `gui/${uid}`, plistPath]);
    console.log(`Installato ${service.label}`);
  }

  console.log('Il worker preparerà il WebP ogni giorno alle 03:00 (ora locale del Mac).');
  console.log('Il ponte resterà disponibile su http://127.0.0.1:43127.');
}

if (process.argv[2] === 'uninstall') {
  await uninstall();
} else {
  await install();
}
