import {
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  window,
  workspace,
} from 'vscode';
import ShowOutputChannel from '../commands/show-output-channel';
import getWorkspaceFolders from '../utils/get-workspace-folders';
import Context from './context';

export default class DrupalStatusBar extends Context {
  statusBarItem: StatusBarItem;

  constructor(context: ExtensionContext) {
    super(context);

    this.statusBarItem = window.createStatusBarItem(
      'drupal',
      StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.name = 'Drupal';
    this.statusBarItem.command = ShowOutputChannel.id;
    this.statusBarItem.text = `$(drupal-logo) Drupal`;
    this.disposables.push(this.statusBarItem);

    if (this.context.workspaceState.get('drupal')) {
      this.statusBarItem.show();
    }

    return this;
  }
}
