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
  ['php', ['$this->t(', ' t(', 'TranslatableMarkup(']],
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

      switch (document.languageId) {
        case 'twig':
          return this.twigCompletionItems(document, position, completions);
        case 'php':
          return this.phpCompletionItems(document, position, completions);
        case 'javascript':
          return this.jsCompletionItems(document, position, completions);
      }

      return completions;
    }
  }

  phpCompletionItems(
    document: TextDocument,
    position: Position,
    completions: CompletionItem[] | undefined
  ): CompletionItem[] | undefined {
    const range = this.getWordRange(document, position);
    const rangeWithQuotationMark = this.getRangeWithNextCharacters(range, 2);
    const quotationMark = this.getQuotationMark(document, range);

    return completions?.map((item) => {
      const label =
        typeof item.label === 'string' ? item.label : item.label.label;
      const variables = this.getTranslateArgVariables(label);
      const tArgs = variables
        ? `, [${variables.map((item, i) => `"${item}": $${i + 1}`).join(', ')}]`
        : '';
      item.insertText = new SnippetString(
        `${item.label}${quotationMark}${tArgs})$0`
      );
      item.range = {
        inserting: rangeWithQuotationMark,
        replacing: rangeWithQuotationMark,
      };

      return item;
    });
  }

  twigCompletionItems(
    document: TextDocument,
    position: Position,
    completions: CompletionItem[] | undefined
  ): CompletionItem[] | undefined {
    const range = this.getWordRange(document, position);
    const rangeWithQuotationMark = this.getRangeWithNextCharacters(range);
    const quotationMark = this.getQuotationMark(document, range);

    return completions?.map((item) => {
      const label =
        typeof item.label === 'string' ? item.label : item.label.label;
      const variables = this.getTranslateArgVariables(label);
      const tArgs = variables
        ? `({${variables.map((item, i) => `"${item}": $${i + 1}`).join(', ')}})`
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

  jsCompletionItems(
    document: TextDocument,
    position: Position,
    completions: CompletionItem[] | undefined
  ): CompletionItem[] | undefined {
    const range = this.getWordRange(document, position);
    const rangeWithQuotationMark = this.getRangeWithNextCharacters(range, 2);
    const quotationMark = this.getQuotationMark(document, range);

    return completions?.map((item) => {
      const label =
        typeof item.label === 'string' ? item.label : item.label.label;
      const variables = this.getTranslateArgVariables(label);
      const tArgs = variables
        ? `, {${variables.map((item, i) => `'${item}': $${i + 1}`).join(', ')}}`
        : '';

      item.insertText = new SnippetString(
        `${item.label}${quotationMark}${tArgs})$0`
      );
      item.range = {
        inserting: rangeWithQuotationMark,
        replacing: rangeWithQuotationMark,
      };

      return item;
    });
  }

  getWordRange(document: TextDocument, position: Position): Range {
    return (
      document.getWordRangeAtPosition(position) ?? new Range(position, position)
    );
  }

  getRangeWithNextCharacters(range: Range, characterDelta = 1): Range {
    return new Range(range.start, range.end.translate({ characterDelta }));
  }

  getQuotationMark(document: TextDocument, range: Range): string {
    return document.getText(
      new Range(range.start.translate({ characterDelta: -1 }), range.start)
    );
  }

  getTranslateArgVariables(label: string): string[] | null {
    return label.match(/[@%:]\w+/g);
  }
}
