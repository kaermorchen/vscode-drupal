import { ExtensionContext } from 'vscode';
import Disposable from '../providers/disposable';

export default class Context extends Disposable {
  context: ExtensionContext;

  constructor(context: ExtensionContext) {
    super();

    this.context = context;
  }
}
