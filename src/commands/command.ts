import { commands } from 'vscode';
import Disposable from '../base/disposable';

type cb = Parameters<typeof commands.registerCommand>[1];

export default abstract class Command extends Disposable {
  static id: string;

  constructor() {
    super();

    this.register();
  }

  register() {
    const id = (<typeof Command>this.constructor).id;
    const cb = this.callback.bind(this);

    this.disposables.push(commands.registerCommand(id, cb, this));
  }

  abstract callback(...args: Parameters<cb>): ReturnType<cb>;
}
