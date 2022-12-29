import { readdir } from 'fs/promises';
import { dirname, join } from 'path';

export default async function findFiles(dirName: string, pattern?: RegExp | string) {
  let matchedFiles: string[] = [];

  const items = await readdir(dirName, { withFileTypes: true });

  for (const item of items) {
    const itemPath = join(dirName, item.name);
    if (item.isDirectory()) {
      matchedFiles = [
        ...matchedFiles,
        ...(await findFiles(itemPath)),
      ];
    } else if (pattern) {
      if (new RegExp(pattern).test(itemPath)) {
        matchedFiles.push(itemPath);
      }
    } else {
      matchedFiles.push(itemPath);
    }
  }

  return matchedFiles;
}
