import { readFile } from 'fs/promises';
import { parse } from 'yaml';
import findInfoFile from './find-info-file';

interface ModuleInfo {
  name: string;
  type: 'module';
}

export default async function getModuleInfo(
  filePath: string
): Promise<ModuleInfo | null> {
  const moduleFilePath = await findInfoFile(filePath);

  if (!moduleFilePath) {
    return null;
  }
  const fileContent = await readFile(moduleFilePath, 'utf-8');
  const moduleInfo = parse(fileContent) as ModuleInfo;

  return moduleInfo.type === 'module' ? moduleInfo : null;
}
