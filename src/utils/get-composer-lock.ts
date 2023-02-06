import { RelativePattern, workspace, WorkspaceFolder } from 'vscode';

export default async function getComposerLock(workspaceFolder: WorkspaceFolder) {
  const include = new RelativePattern(workspaceFolder, 'composer.lock');
  const composerUri = await workspace.findFiles(include, undefined, 1);

  if (composerUri.length === 0) {
    return null;
  }

  return await workspace.fs
    .readFile(composerUri[0])
    .then((value) => value.toString())
    .then((value) => JSON.parse(value));
}
