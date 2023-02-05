import { ExtensionContext } from 'vscode';
import { Constructor, MergeCtor } from '../types';

export function Contextable<TBase extends Constructor>(Base: TBase) {
  const Cls = class Contextable extends (Base as any) {
    context: ExtensionContext;

    constructor(arg: { context: ExtensionContext }) {
      super(arg);

      this.context = arg.context;
    }
  };

  return Cls as MergeCtor<typeof Cls, TBase>;
}
