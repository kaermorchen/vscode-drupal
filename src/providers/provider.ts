// import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
// import { Connection } from 'vscode-languageserver';
// import Disposable from './disposable';

import { ExtensionContext } from "vscode";

// export default class Provider extends Disposable {
export default class Provider {
  readonly context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.context = context;
  }

  // onShutdown() {
  //   this.dispose();
  // }
}
