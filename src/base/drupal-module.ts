import { Disposable, ExtensionContext, RelativePattern, Uri, workspace } from 'vscode';
import { Contextable } from '../mixins/contextable';
import GlobalVariablesCompletionProvider from '../providers/global-variables';
import { FirstParam } from '../types';
import Context from './context';
import DrupalWorkspace from './drupal-workspace';

const Mix = Contextable(Disposable);

export default class DrupalModule extends Mix {
  drupalWorkspace: DrupalWorkspace;
  uri: Uri;
  // globalVariables: GlobalVariablesCompletionProvider;
  // coreRoutingCompletionProvider: RoutingCompletionProvider;
  // contribRoutingCompletionProvider: RoutingCompletionProvider;
  // coreHookCompletionProvider: HookCompletionProvider;
  // contribHookCompletionProvider: HookCompletionProvider;
  // coreServicesCompletionProvider: ServicesCompletionProvider;
  // contribServicesCompletionProvider: ServicesCompletionProvider;

  constructor(arg: FirstParam<typeof Mix> & {
    drupalWorkspace: DrupalWorkspace;
    uri: Uri;
  }) {
    super(arg);

    this.uri = arg.uri;
    this.drupalWorkspace = arg.drupalWorkspace;

    // this.globalVariables = new GlobalVariablesCompletionProvider({
    //   drupalWorkspace: this.drupalWorkspace,
    //   pattern: Uri.joinPath(this.uri, 'globals.api.php')
    // });
  }
}
