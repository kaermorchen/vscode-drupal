import { readdir } from "fs/promises";
import { dirname, join } from "path";

const INFO_FILE_REGEX = /\w+\.info\.yml$/;

/**
 * Finds the first .info.yml file in the same directory as the given file.
 *
 * @param filePath - Path to a file within a Drupal module.
 * @returns Full path to the .info.yml file, or null if not found.
 */
export async function findInfoFile(filePath: string): Promise<string | null> {
  const fileDir = dirname(filePath);
  const files = await readdir(fileDir);
  const infoFile = files.find((file) => INFO_FILE_REGEX.test(file));

  return infoFile ? join(fileDir, infoFile) : null;
}
