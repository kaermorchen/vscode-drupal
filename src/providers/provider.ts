import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { Connection } from 'vscode-languageserver';
import Disposable from './disposable';

export default class Provider extends Disposable {
  readonly connection: Connection;

  constructor() {
    super();

    this.connection = createConnection(ProposedFeatures.all);;

    this.disposables.push(
      this.connection.onShutdown(this.onShutdown.bind(this))
    );

    this.connection.listen();
  }

  onShutdown() {
    this.dispose();
  }
}
