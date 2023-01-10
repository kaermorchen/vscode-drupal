import { readdir, access, constants } from 'fs/promises';
import { join } from 'path';

export default async function findApiFiles(dirName: string) {
  let matchedFiles: string[] = [];

  const dirs = await readdir(dirName, { withFileTypes: true });

  for (const dir of dirs) {
    try {
      const item = join(dirName, dir.name, `${dir.name}.api.php`);

      await access(item, constants.R_OK);

      matchedFiles.push(item);
    } catch {}
  }

  return matchedFiles;
}
