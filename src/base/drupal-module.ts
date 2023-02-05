import { ExtensionContext, Uri } from 'vscode';
import Context from './context';
import DrupalWorkspace from './drupal-workspace';

export default class DrupalModule extends Context {
  drupalWorkspace: DrupalWorkspace;
  uri: Uri;

  constructor(arg: {
    drupalWorkspace: DrupalWorkspace;
    context: ExtensionContext;
    uri: Uri;
  }) {
    super(arg.context);

    this.uri = arg.uri;
    this.drupalWorkspace = arg.drupalWorkspace;
  }
}
