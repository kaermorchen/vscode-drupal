import { ExtensionContext, Uri } from 'vscode';
import Context from './context';

export default class DrupalCoreModule extends Context {
  uri: Uri;

  constructor(args: { context: ExtensionContext; uri: Uri }) {
    super(args.context);

    this.uri = args.uri;
  }
}
