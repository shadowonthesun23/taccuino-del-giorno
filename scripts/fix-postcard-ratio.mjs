import { readFile, writeFile } from 'node:fs/promises';

const file = 'app/globals.css';
let source = await readFile(file, 'utf8');

const marker = '/* Daily postcard: preserve physical 15x10 cm (3:2) ratio in the open modal. */';
const block = `\n${marker}\n.daily-postcard.is-open .daily-postcard-stage {\n  aspect-ratio: 3 / 2;\n  height: auto;\n}\n\n.daily-postcard.is-open .daily-postcard-card-motion,\n.daily-postcard.is-open .daily-postcard-card,\n.daily-postcard.is-open .daily-postcard-stage .daily-postcard-face {\n  height: 100%;\n  min-height: 0;\n}\n`;

if (source.includes(marker)) {
  console.log('Open postcard ratio fix already applied.');
} else {
  source = `${source.trimEnd()}${block}\n`;
  await writeFile(file, source);
  console.log('Locked open postcard to 3:2 ratio.');
}
