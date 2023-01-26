import {
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  window,
} from 'vscode';
import ShowOutputChannel from '../commands/show-output-channel';
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
    this.statusBarItem.show();

    this.disposables.push(this.statusBarItem);

    return this;
  }
}
