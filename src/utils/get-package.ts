import { readFileSync } from 'fs';
import { resolve } from 'path';

export default function getPackage() {
  const pack: string = readFileSync(
    resolve(__dirname, '../package.json'),
    'utf8'
  );

  return JSON.parse(pack);
}
