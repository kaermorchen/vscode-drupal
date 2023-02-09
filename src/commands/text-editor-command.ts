import { commands } from 'vscode';
import Command from './command';

type cb = Parameters<typeof commands.registerTextEditorCommand>[1];

export default abstract class TextEditorCommand extends Command {
  register() {
    const id = (<typeof Command>this.constructor).id;
    const cb = this.callback.bind(this);

    this.disposables.push(commands.registerTextEditorCommand(id, cb, this));
  }

  abstract callback(...args: Parameters<cb>): ReturnType<cb>;
}
