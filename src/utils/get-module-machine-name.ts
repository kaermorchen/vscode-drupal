import { basename } from 'path';
import { findInfoFile } from './find-info-file';

export async function getModuleMachineName(
  filePath: string,
): Promise<string | null> {
  const moduleFilePath = await findInfoFile(filePath);

  if (!moduleFilePath) {
    return null;
  }

  return basename(moduleFilePath).replace(/\.info\.yml$/, '');
}
