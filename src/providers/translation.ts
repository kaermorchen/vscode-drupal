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
import gettextParser from 'gettext-parser';
import DrupalWorkspaceProviderWithWatcher from '../base/drupal-workspace-provider-with-watcher';
import getModuleUri from '../utils/get-module-uri';

const prefixes = ['t(', 'formatPlural(', 'TranslatableMarkup('];

export default class TranslationProvider
  extends DrupalWorkspaceProviderWithWatcher
  implements CompletionItemProvider
{
  static language = 'php';

  moduleCompletions: Map<string, CompletionItem[]> = new Map();

  constructor(
    arg: ConstructorParameters<typeof DrupalWorkspaceProviderWithWatcher>[0]
  ) {
    super(arg);

    this.watcher.onDidChange(this.parseFiles, this, this.disposables);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        {
          language: TranslationProvider.language,
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

      if (!prefixes.some((item) => linePrefix.includes(item))) {
        return [];
      }

      return this.moduleCompletions.get(moduleUri.fsPath) ?? [];
    }

    return [];
  }
}
