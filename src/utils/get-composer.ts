import { WorkspaceFolder } from "vscode";
import { readJsonFile } from "./read-json-file";

export async function getComposer(workspaceFolder: WorkspaceFolder) {
  return readJsonFile(workspaceFolder, "composer.json");
}
