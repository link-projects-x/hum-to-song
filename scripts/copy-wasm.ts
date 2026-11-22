import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { WASM_BASE_URL } from '@/constants/audio';

const manifest = createRequire(import.meta.url).resolve(
  '@tensorflow/tfjs-backend-wasm/package.json'
);
const source = join(dirname(manifest), 'dist');
const target = resolve('public', WASM_BASE_URL.slice(1));
const files = readdirSync(source).filter((name) => name.endsWith('.wasm'));
if (files.length === 0) throw new Error(`No .wasm files in ${source}`);

mkdirSync(target, { recursive: true });
for (const name of files) copyFileSync(join(source, name), join(target, name));
console.log(`${target}  ${files.join(', ')}`);
