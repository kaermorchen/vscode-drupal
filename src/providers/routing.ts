import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  languages,
  TextDocument,
  workspace,
} from 'vscode';
import { basename } from 'path';
import Provider from './provider';
import { parse } from 'yaml';
import DrupalWorkspace from '../base/drupal-workspace';

export default class RoutingCompletionProvider
  extends Provider
  implements CompletionItemProvider
{
  static language = 'php';

  drupalWorkspace: DrupalWorkspace;
  completions: CompletionItem[] = [];
  include: string;

  constructor(drupalWorkspace: DrupalWorkspace, include: string) {
    super();

    this.drupalWorkspace = drupalWorkspace;
    this.include = include;

    this.drupalWorkspace.composerWatcher.onDidChange(
      this.parseFiles,
      this,
      this.disposables
    );

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
    const uris = await this.drupalWorkspace.findFiles(this.include);

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
