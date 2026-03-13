import { WorkspaceFolder } from "vscode";
import { readJsonFile } from "./read-json-file";

export async function getComposerLock(workspaceFolder: WorkspaceFolder) {
  return readJsonFile(workspaceFolder, "composer.lock");
}
