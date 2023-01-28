import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  languages,
  TextDocument,
  workspace,
} from 'vscode';
import { basename } from 'path';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import { parse } from 'yaml';
import DrupalWorkspace from '../base/drupal-workspace';
import { DrupalWorkspaceProviderConstructorArguments } from '../types';

export default class RoutingCompletionProvider
  extends DrupalWorkspaceProvider
  implements CompletionItemProvider
{
  static language = 'php';

  completions: CompletionItem[] = [];

  constructor(args: DrupalWorkspaceProviderConstructorArguments) {
    super(args);

    this.watcher.onDidChange(this.parseFiles, this, this.disposables);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        RoutingCompletionProvider.language,
        this,
        '"',
        "'"
      )
    );

    this.parseFiles();
  }

  async parseFiles() {
    const uris = await this.drupalWorkspace.findFiles(this.pattern);

    this.completions = [];

    for (const uri of uris) {
      const buffer = await workspace.fs.readFile(uri);
      const moduleName = basename(uri.path, '.routing.yml');
      const yaml = parse(buffer.toString());

      for (const name in yaml) {
        const completion: CompletionItem = {
          label: name,
          kind: CompletionItemKind.Keyword,
          detail: `Route ${moduleName}`,
        };

        this.completions.push(completion);
      }
    }
  }

  provideCompletionItems(document: TextDocument) {
    return this.drupalWorkspace.workspaceFolder ===
      workspace.getWorkspaceFolder(document.uri)
      ? this.completions
      : [];
  }
}
