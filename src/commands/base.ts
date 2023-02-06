import { commands } from "vscode";
import Disposable from "../base/disposable";

export default class BaseCommand extends Disposable {
  static id: string;

  constructor() {
    super();

    const id = (<typeof BaseCommand>this.constructor).id;
    const cb = this.callback.bind(this);

    this.disposables.push(commands.registerCommand(id, cb));
  }

  callback() {
    throw new Error('Callback not implemented.');
  }
}
