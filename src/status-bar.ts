import { ExtensionContext, StatusBarAlignment, StatusBarItem, window } from "vscode";
import Disposable from "./providers/disposable";

export default class DrupalStatusBarItem extends Disposable {
  statusBarItem: StatusBarItem;
  context: ExtensionContext;

  constructor(context: ExtensionContext) {
    super();

    this.context = context;
    this.statusBarItem = window.createStatusBarItem('drupal', StatusBarAlignment.Right, 1000);
    this.statusBarItem.name = 'Drupal';

    this.disposables.push(this.statusBarItem);

    this.update();

    return this;
  }

  update() {
    this.statusBarItem.text = `$(drupal-logo) Drupal`;
    this.statusBarItem.show();
  }
}
