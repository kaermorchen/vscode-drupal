import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  languages,
  Position,
  TextDocument,
  Uri,
  workspace,
} from 'vscode';
import { basename } from 'path';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import { parse } from 'yaml';
import DrupalWorkspace from '../base/drupal-workspace';
import { DrupalWorkspaceProviderConstructorArguments } from '../types';

const prefixes = [
  'Drupal::service(',
  '$container->get(',
  '$container->getDefinition(',
];

export default class ServicesCompletionProvider
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
        ServicesCompletionProvider.language,
        this,
        '"',
        "'"
      )
    );

    this.parseFiles();
  }

  async parseFiles() {
    const uris = await this.drupalWorkspace.findFiles(this.pattern, null);
    this.completions = [];

    for (const uri of uris) {
      await this.extractFileCompletions(uri);
    }
  }

  async provideCompletionItems(document: TextDocument, position: Position) {
    if (
      this.drupalWorkspace.workspaceFolder !==
      workspace.getWorkspaceFolder(document.uri)
    ) {
      return [];
    }

    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);

    if (!prefixes.some((item) => linePrefix.includes(item))) {
      return [];
    }

    return this.completions;
  }

  async extractFileCompletions(uri: Uri) {
    const buffer = await workspace.fs.readFile(uri);
    const moduleName = basename(uri.path, '.services.yml');
    const yaml = parse(buffer.toString());

    if ('services' in yaml) {
      for (const name in yaml.services) {
        const completion: CompletionItem = {
          label: `${moduleName}.${name}`,
          kind: CompletionItemKind.Class,
          detail: `Service`,
        };

        this.completions.push(completion);
      }
    }
  }
}
