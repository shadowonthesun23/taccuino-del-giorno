import { readFile, writeFile } from 'node:fs/promises';

const cssFile = 'app/globals.css';
const componentFile = 'app/components/DailyPostcard.tsx';

let css = await readFile(cssFile, 'utf8');
let component = await readFile(componentFile, 'utf8');

const oldClass = "className={`daily-postcard-stage ${isEditing ? 'is-editing' : ''}`}";
const newClass = "className={`daily-postcard-stage ${isFlipped ? 'is-flipped' : ''} ${isEditing ? 'is-editing' : ''}`}";
if (component.includes(oldClass)) {
  component = component.replace(oldClass, newClass);
  await writeFile(componentFile, component);
  console.log('Added flipped state class to postcard stage.');
} else if (!component.includes(newClass)) {
  throw new Error('DailyPostcard stage class marker not found.');
}

const marker = '/* Daily postcard: preserve physical 15x10 cm (3:2) ratio in the open modal. */';
const oldBlockRegex = /\n?\/\* Daily postcard: preserve physical 15x10 cm \(3:2\) ratio in the open modal\. \*\/[\s\S]*?min-height: 0;\n}\n?/g;
css = css.replace(oldBlockRegex, '\n');

const block = `\n${marker}\n/* Keep only the visible FRONT at the physical postcard ratio.\n   Once flipped, the stage returns to content-sized layout so the back can\n   grow naturally for longer quotes instead of being clipped. */\n.daily-postcard.is-open .daily-postcard-stage:not(.is-flipped) {\n  aspect-ratio: 3 / 2;\n  height: auto;\n}\n\n.daily-postcard.is-open .daily-postcard-stage:not(.is-flipped) .daily-postcard-card-motion,\n.daily-postcard.is-open .daily-postcard-stage:not(.is-flipped) .daily-postcard-card,\n.daily-postcard.is-open .daily-postcard-stage:not(.is-flipped) .daily-postcard-face {\n  height: 100%;\n  min-height: 0;\n}\n`;

css = `${css.trimEnd()}${block}\n`;
await writeFile(cssFile, css);
console.log('Locked only the postcard front to 3:2; back remains content-sized.');
