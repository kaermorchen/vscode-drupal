import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  languages,
  MarkdownString,
  SnippetString,
  TextDocument,
  Uri,
  workspace,
} from 'vscode';
import { Function as ASTFunction } from 'php-parser';
import getModuleMachineName from '../utils/get-module-machine-name';
import docParser from '../utils/doc-parser';
import phpParser from '../utils/php-parser';
import getName from '../utils/get-name';
import DrupalWorkspaceProviderWithWatcher from '../base/drupal-workspace-provider-with-watcher';

const NODE_COMPLETION_ITEM = {
  function: CompletionItemKind.Function,
} as const;

export default class HookCompletionProvider
  extends DrupalWorkspaceProviderWithWatcher
  implements CompletionItemProvider
{
  static language = 'php';

  completions: CompletionItem[] = [];
  completionFileCache: Map<string, CompletionItem[]> = new Map();

  constructor(
    arg: ConstructorParameters<typeof DrupalWorkspaceProviderWithWatcher>[0]
  ) {
    super(arg);

    this.watcher.onDidChange(this.parseFiles, this, this.disposables);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        {
          language: HookCompletionProvider.language,
          scheme: 'file',
          pattern: this.drupalWorkspace.getRelativePattern('**/*.{module,theme}'),
        },
        this
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
      const tree = phpParser.parseCode(buffer.toString(), uri.fsPath);

      for (const item of tree.children) {
        if (item.kind !== 'function') {
          continue;
        }

        const func: ASTFunction = item as ASTFunction;
        const name = getName(func.name);

        if (/^hook_/.test(name) === false) {
          continue;
        }

        const funcCall = (item.loc?.source ?? name).replace(/\$/g, '\\$');
        const completion: CompletionItem = {
          label: name,
          kind: NODE_COMPLETION_ITEM[item.kind],
          detail: `Implements ${name}`,
          insertText: new SnippetString(
            `/**\n * Implements ${name}().\n */\n${funcCall} {\n\t$0\n}`
          ),
        };

        const lastComment = item.leadingComments?.pop();

        if (lastComment) {
          const args = func.arguments.map((item) =>
            // Replace full import to last part
            item.loc?.source?.replace(/^(\\(\w+))+/, '$2')
          );
          const ast = docParser.parse(lastComment.value);
          const value = [
            '```php',
            '<?php', //TODO: remove when vscode will support php syntax highlighting without this
            `function ${name}(${args.join(', ')}) {}`,
            '```',
            ast.summary,
          ].join('\n');

          completion.documentation = new MarkdownString(value);
        }

        completions.push(completion);
      }

      this.completionFileCache.set(uri.fsPath, completions);
    }

    this.completions = ([] as CompletionItem[]).concat(
      ...this.completionFileCache.values()
    );
  }

  async provideCompletionItems(document: TextDocument) {
    const machineName = await getModuleMachineName(document.uri.path);

    if (!machineName) {
      return this.completions;
    }

    return this.completions.map((item) => {
      const newItem = Object.assign({}, item);
      const searchValue = 'function hook_';
      const replaceValue = `function ${machineName}_`;

      if (newItem.insertText instanceof SnippetString) {
        newItem.insertText = new SnippetString(
          newItem.insertText.value.replace(searchValue, replaceValue)
        );
      }

      if (newItem.documentation instanceof MarkdownString) {
        newItem.documentation = new MarkdownString(
          newItem.documentation.value.replace(searchValue, replaceValue)
        );
      }

      return newItem;
    });
  }
}
