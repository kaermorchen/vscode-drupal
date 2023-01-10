import { Connection } from 'vscode-languageserver';
import Disposable from './disposable';

export default class Provider extends Disposable {
  readonly connection: Connection;

  constructor(connection: Connection) {
    super();

    this.connection = connection;

    this.disposables.push(
      this.connection.onShutdown(this.onShutdown.bind(this))
    );
  }

  onShutdown() {
    this.dispose();
  }
}
