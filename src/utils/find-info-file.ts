import { readdir } from 'fs/promises';
import { dirname, join } from 'path';

export default async function findInfoFile(filePath: string) {
  const fileDir = dirname(filePath);
  const moduleFilePath = (await readdir(fileDir)).filter(
    (allFilesPaths: string) => allFilesPaths.match(/\w+\.info\.yml$/) !== null
  );

  if (moduleFilePath[0]) {
    return join(fileDir, moduleFilePath[0]);
  } else {
    return null;
  }
}
