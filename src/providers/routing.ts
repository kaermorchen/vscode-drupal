import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  languages,
  TextDocument,
  Uri,
  workspace,
} from 'vscode';
import { basename } from 'path';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import { parse } from 'yaml';

export default class RoutingCompletionProvider
  extends DrupalWorkspaceProvider
  implements CompletionItemProvider
{
  static language = 'php';

  completions: CompletionItem[] = [];
  completionFileCache: Map<string, CompletionItem[]> = new Map();

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);

    this.watcher.onDidChange(this.parseFiles, this, this.disposables);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        {
          language: RoutingCompletionProvider.language,
          scheme: 'file',
          pattern: this.drupalWorkspace.getRelativePattern('**'),
        },
        this,
        '"',
        "'"
      )
    );

    this.parseFiles();
  }

  async parseFiles(uri?: Uri) {
    const uris = uri
      ? [uri]
      : await this.drupalWorkspace.findFiles(this.pattern);

    for (const uri of uris) {
      const completions: CompletionItem[] = [];
      const buffer = await workspace.fs.readFile(uri);
      const moduleName = basename(uri.path, '.routing.yml');
      const yaml = parse(buffer.toString());

      for (const name in yaml) {
        completions.push({
          label: name,
          kind: CompletionItemKind.Keyword,
          detail: `Route ${moduleName}`,
        });
      }

      this.completionFileCache.set(uri.fsPath, completions);
    }

    this.completions = ([] as CompletionItem[]).concat(
      ...this.completionFileCache.values()
    );
  }

  provideCompletionItems(document: TextDocument) {
    return this.drupalWorkspace.hasFile(document.uri) ? this.completions : [];
  }
}
