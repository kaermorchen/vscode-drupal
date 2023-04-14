import { ExtensionContext } from 'vscode';
import ShowOutputChannel from './commands/show-output-channel';
import DrupalStatusBar from './base/drupal-status-bar';
import DrupalWorkspace from './base/drupal-workspace';
import getWorkspaceFolders from './utils/get-workspace-folders';
import getComposer from './utils/get-composer';
import SearchApi from './commands/search-api';
import GenerateTranslations from './commands/generate-translations';

export async function activate(context: ExtensionContext) {
  const drupalWorkspaces = [];

  for (const workspaceFolder of getWorkspaceFolders()) {
    const composer = await getComposer(workspaceFolder);

    if (!composer) {
      continue;
    }

    if ('drupal/core-recommended' in composer.require) {
      drupalWorkspaces.push(new DrupalWorkspace(workspaceFolder));
    }
  }

  if (drupalWorkspaces.length === 0) {
    return;
  }

  context.subscriptions.push(
    ...drupalWorkspaces,

    // Common
    new DrupalStatusBar(),

    // Commands
    new SearchApi(drupalWorkspaces),
    new GenerateTranslations(drupalWorkspaces),
    new ShowOutputChannel()
  );
}

export function deactivate() {}
