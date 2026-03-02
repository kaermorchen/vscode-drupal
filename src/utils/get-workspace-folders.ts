import { workspace, WorkspaceFolder } from 'vscode';

export function getWorkspaceFolders(): readonly WorkspaceFolder[] {
  return workspace.workspaceFolders ?? [];
}
