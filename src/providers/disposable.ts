import { Disposable as IDisposable } from 'vscode-languageserver';

export default class Disposable implements IDisposable {
  protected disposables: IDisposable[] = [];

  dispose(): void {
    for (const item of this.disposables) {
      item.dispose();
    }
  }
}
