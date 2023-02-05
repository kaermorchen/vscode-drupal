import { FileSystemWatcher } from 'vscode';
import { Constructor, MergeCtor } from '../types';

export default function Watcher<TBase extends Constructor>(Base: TBase) {
  const Cls = class Watcher extends (Base as any) {
    watcher?: FileSystemWatcher;

    constructor(arg: { watcher?: FileSystemWatcher }) {
      super(arg);

      if (arg.watcher) {
        this.watcher = arg.watcher;
      }
    }
  };

  return Cls as MergeCtor<typeof Cls, TBase>;
}
