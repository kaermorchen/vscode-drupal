import { readFile } from 'fs/promises';
import { resolve } from 'path';

export default async function getPackage() {
  const pack: string = await readFile(
    resolve(__dirname, '../package.json'),
    'utf8'
  );

  return JSON.parse(pack);
}
