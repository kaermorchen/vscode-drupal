import { RelativePattern, workspace, WorkspaceFolder } from "vscode";

export async function readJsonFile(
  workspaceFolder: WorkspaceFolder,
  filename: string,
): Promise<any | null> {
  const include = new RelativePattern(workspaceFolder, filename);
  const files = await workspace.findFiles(include, undefined, 1);

  if (files.length === 0) {
    return null;
  }

  const content = await workspace.fs.readFile(files[0]);

  return JSON.parse(content.toString());
}
