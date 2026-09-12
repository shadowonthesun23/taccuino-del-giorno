import { readFile, writeFile } from 'node:fs/promises';

const file = 'app/components/DailyPostcard.tsx';
let source = await readFile(file, 'utf8');

const before = "          style={{ objectPosition: artwork.revealPosition }}";
const after = "          style={{\n            objectPosition: artwork.revealPosition,\n            objectFit: artwork.id === 'chase-gathering-autumn-flowers' ? 'contain' : 'cover',\n          }}";

if (source.includes(after)) {
  console.log('Chase postcard fit already applied.');
} else {
  if (!source.includes(before)) throw new Error('Postcard artwork style marker not found.');
  source = source.replace(before, after);
  await writeFile(file, source);
  console.log('Applied proportional postcard fit for Gathering Autumn Flowers.');
}
