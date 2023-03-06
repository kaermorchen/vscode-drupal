import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  DocumentFilter,
  languages,
  Position,
  Range,
  TextDocument,
  Uri,
  workspace,
  SnippetString,
} from 'vscode';
import gettextParser from 'gettext-parser';
import DrupalWorkspaceProviderWithWatcher from '../base/drupal-workspace-provider-with-watcher';
import getModuleUri from '../utils/get-module-uri';

const prefixes: Map<string, string[]> = new Map([
  ['php', ['$this->t(', ' t(', 'formatPlural(', 'TranslatableMarkup(']],
  ['javascript', ['Drupal.t(']],
  ['yaml', ['_title: ', 'title: ']],
  ['twig', ['{{', '{%']],
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
    {
      language: 'yaml',
      scheme: 'file',
      pattern: this.drupalWorkspace.getRelativePattern(
        '**/*.{routing,links.menu,links.task,links.action,links.contextual}.yml'
      ),
    },
    {
      language: 'twig',
      scheme: 'file',
      pattern: this.drupalWorkspace.getRelativePattern('**'),
    },
  ];

  constructor(
    arg: ConstructorParameters<typeof DrupalWorkspaceProviderWithWatcher>[0]
  ) {
    super(arg);

    this.watcher.onDidChange(this.parseFiles, this, this.disposables);

    this.disposables.push(
      languages.registerCompletionItemProvider(this.selectors, this, '"', "'")
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

      if (!langPrefixes.some((item) => linePrefix.includes(item))) {
        return;
      }

      const completions = this.moduleCompletions.get(moduleUri.fsPath);

      if (document.languageId === 'twig') {
        const range =
          document.getWordRangeAtPosition(position) ??
          new Range(position, position);
        const rangeWithQuotationMark = new Range(
          range.start,
          range.end.translate({ characterDelta: 1 })
        );
        const quotationMark = document.getText(
          new Range(range.start.translate({ characterDelta: -1 }), range.start)
        );

        return completions?.map((item) => {
          const label =
            typeof item.label === 'string' ? item.label : item.label.label;
          const variables = label.match(/[@%:]\w+/g);
          const tArgs = variables
            ? `({${variables
                .map((item, i) => `"${item}": $${i + 1}`)
                .join(', ')}})`
            : '';
          item.insertText = new SnippetString(
            `${item.label}${quotationMark}|t${tArgs}`
          );
          item.range = {
            inserting: rangeWithQuotationMark,
            replacing: rangeWithQuotationMark,
          };

          return item;
        });
      }

      return completions;
    }
  }
}
