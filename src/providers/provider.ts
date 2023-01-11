import Disposable from './disposable';

import { ExtensionContext } from "vscode";

export default class Provider extends Disposable {
  readonly context: ExtensionContext;

  constructor(context: ExtensionContext) {
    super();

    this.context = context;
  }
}
