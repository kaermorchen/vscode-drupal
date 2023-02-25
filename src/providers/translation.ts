import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  DocumentFilter,
  DocumentSelector,
  languages,
  Position,
  TextDocument,
  Uri,
  workspace,
} from 'vscode';
import gettextParser from 'gettext-parser';
import DrupalWorkspaceProviderWithWatcher from '../base/drupal-workspace-provider-with-watcher';
import getModuleUri from '../utils/get-module-uri';

const prefixes: Map<string, string[]> = new Map([
  ['php', ['$this->t(', ' t(', 'formatPlural(', 'TranslatableMarkup(']],
  ['javascript', ['Drupal.t(']],
]);

export default class TranslationProvider
  extends DrupalWorkspaceProviderWithWatcher
  implements CompletionItemProvider
{
  moduleCompletions: Map<string, CompletionItem[]> = new Map();

  selectors: DocumentFilter[] = [
    {
      language: 'php',
      scheme: 'file',
      pattern: this.drupalWorkspace.getRelativePattern('**'),
    },
    {
      language: 'javascript',
      scheme: 'file',
      pattern: this.drupalWorkspace.getRelativePattern('**/*.js'),
    },
  ];

  constructor(
    arg: ConstructorParameters<typeof DrupalWorkspaceProviderWithWatcher>[0]
  ) {
    super(arg);

    this.watcher.onDidChange(this.parseFiles, this, this.disposables);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        <DocumentFilter[]>Array.from(this.selectors.values()),
        this,
        '"',
        "'"
      )
    );

    this.parseFiles();
  }

  async parseFiles(uri?: Uri) {
    // Clear all completions if file po was changed
    if (uri) {
      this.moduleCompletions.clear();
    }

    const uris = uri
      ? [uri]
      : await this.drupalWorkspace.findFiles(this.pattern);

    for (const uri of uris) {
      const moduleUri = await getModuleUri(uri);

      if (!moduleUri) {
        continue;
      }

      const buffer = await workspace.fs.readFile(uri);
      const { translations } = gettextParser.po.parse(buffer.toString());
      const completions: CompletionItem[] =
        this.moduleCompletions.get(moduleUri.fsPath) ?? [];

      for (const context in translations) {
        for (const item in translations[context]) {
          if (item !== '') {
            completions.push({
              label: item,
              kind: CompletionItemKind.Text,
              detail: 'translation',
            });
          }
        }
      }

      this.moduleCompletions.set(moduleUri.fsPath, completions);
    }
  }

  async provideCompletionItems(document: TextDocument, position: Position) {
    const moduleUri = await getModuleUri(document.uri);

    if (moduleUri) {
      const linePrefix = document
        .lineAt(position)
        .text.substring(0, position.character);

      const langPrefixes = prefixes.get(document.languageId) ?? [];

      if (langPrefixes.some((item) => linePrefix.includes(item))) {
        return this.moduleCompletions.get(moduleUri.fsPath) ?? [];
      }
    }

    return [];
  }
}
