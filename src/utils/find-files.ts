import { readdir } from 'fs/promises';
import { join } from 'path';

export async function findFiles(dirName: string, pattern?: RegExp | string) {
  let matchedFiles: string[] = [];

  const items = await readdir(dirName, { withFileTypes: true });

  for (const item of items) {
    const itemPath = join(dirName, item.name);
    const files = await findFiles(itemPath);

    if (item.isDirectory()) {
      matchedFiles = [...matchedFiles, ...files];
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
