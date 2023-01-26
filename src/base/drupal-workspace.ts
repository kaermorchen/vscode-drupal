import { ExtensionContext, RelativePattern, workspace, WorkspaceFolder } from 'vscode';
import Context from './context';

export default class DrupalWorkspace {
  workspaceFolder: WorkspaceFolder;

  constructor(workspaceFolder: WorkspaceFolder) {
    this.workspaceFolder = workspaceFolder;

    console.log(this.workspaceFolder.name);

  }
}
