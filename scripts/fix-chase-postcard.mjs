import { readFile, writeFile } from 'node:fs/promises';

const file = 'app/components/DailyPostcard.tsx';
let source = await readFile(file, 'utf8');

const variants = [
  "          style={{ objectPosition: artwork.revealPosition }}",
  "          style={{\n            objectPosition: artwork.revealPosition,\n            objectFit: artwork.id === 'chase-gathering-autumn-flowers' ? 'contain' : 'cover',\n          }}",
];
const after = "          style={{\n            objectPosition: artwork.id === 'chase-gathering-autumn-flowers' ? '54% 50%' : artwork.revealPosition,\n            objectFit: 'cover',\n          }}";

if (source.includes(after)) {
  console.log('Chase postcard crop already applied.');
} else {
  const before = variants.find((variant) => source.includes(variant));
  if (!before) throw new Error('Postcard artwork style marker not found.');
  source = source.replace(before, after);
  await writeFile(file, source);
  console.log('Applied proportional cover crop for Gathering Autumn Flowers.');
}
