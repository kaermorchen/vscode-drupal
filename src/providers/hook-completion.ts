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
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import getName from '../utils/get-name';
import { DrupalWorkspaceProviderConstructorArguments } from '../types';

const NODE_COMPLETION_ITEM = {
  function: CompletionItemKind.Function,
} as const;

export default class HookCompletionProvider
  extends DrupalWorkspaceProvider
  implements CompletionItemProvider
{
  static language = 'php';

  completions: CompletionItem[] = [];
  completionFileCache: Map<string, CompletionItem[]> = new Map();

  constructor(args: DrupalWorkspaceProviderConstructorArguments) {
    super(args);

    this.watcher.onDidChange(this.parseFiles, this, this.disposables);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        HookCompletionProvider.language,
        this
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

  async provideCompletionItems(document: TextDocument) {
    if (
      this.drupalWorkspace.workspaceFolder !==
      workspace.getWorkspaceFolder(document.uri)
    ) {
      return [];
    }

    const filePath = document.uri.path;
    const cache = this.completionFileCache.get(filePath);

    if (cache) {
      return cache;
    }

    const machineName = await getModuleMachineName(filePath);

    if (!machineName) {
      return this.completions;
    }

    const apiCompletionWithMachineName = this.completions.map((item) => {
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

    this.completionFileCache.set(filePath, apiCompletionWithMachineName);

    return apiCompletionWithMachineName;
  }

  async extractFileCompletions(uri: Uri) {
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

      this.completions.push(completion);
    }
  }
}
