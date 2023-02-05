import { RelativePattern, Uri, workspace } from 'vscode';
import { Constructor, MergeCtor, Tail } from '../types';

export default function Relatively<TBase extends Constructor>(Base: TBase) {
  const Cls = class Relatively extends (Base as any) {
    uri: Uri;

    constructor(arg: { uri: Uri }) {
      super(arg);

      this.uri = arg.uri;
    }

    getRelativePattern(pattern: string): RelativePattern {
      return new RelativePattern(this.uri, pattern);
    }

    async findFile(pattern: string): Promise<Uri | undefined> {
      const result = await workspace.findFiles(
        this.getRelativePattern(pattern),
        undefined,
        1
      );

      return result.length ? result[0] : undefined;
    }

    async findFiles(
      pattern: string,
      ...args: Tail<Parameters<typeof workspace['findFiles']>>
    ) {
      return workspace.findFiles(this.getRelativePattern(pattern), ...args);
    }
  };

  return Cls as MergeCtor<typeof Cls, TBase>;
}
