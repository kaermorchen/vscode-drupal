import { ExtensionContext, RelativePattern, workspace } from 'vscode';
import getWorkspaceFolders from '../utils/get-workspace-folders';
import Context from './context';
import DrupalWorkspace from './drupal-workspace';

const state: Map<string, unknown> = new Map();

export default class Main extends Context {
  drupalWorkspaces: DrupalWorkspace[] = [];

  constructor(context: ExtensionContext) {
    super(context);

    this.initDrupalWorkspaces();

    return this;
  }

  async initDrupalWorkspaces() {
    const workspaceFolders = getWorkspaceFolders();

    for (const workspaceFolder of workspaceFolders) {
      const include = new RelativePattern(workspaceFolder, 'composer.json');
      const composerUri = await workspace.findFiles(include, undefined, 1);

      if (composerUri.length === 0) {
        continue;
      }

      const composer = await workspace.fs
        .readFile(composerUri[0])
        .then((value) => value.toString())
        .then((value) => JSON.parse(value));

      if ('drupal/core-recommended' in composer.require) {
        this.drupalWorkspaces.push(new DrupalWorkspace(workspaceFolder));
      }
    }
  }
}
