import { readFile, access } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  ExtensionContext,
  MarkdownString,
  SnippetString,
  TextDocument,
  workspace,
} from 'vscode';
import { Function as ASTFunction } from 'php-parser';
import getModuleMachineName from '../utils/get-module-machine-name';
import { join } from 'path';
import { constants } from 'fs';
import docParser from '../utils/doc-parser';
import phpParser from '../utils/php-parser';
import Provider from './provider';
import findApiFiles from '../utils/find-api-files';
import getName from '../utils/get-name';

const NODE_COMPLETION_ITEM = <const>{
  function: CompletionItemKind.Function,
};

export default class HookCompletionProvider extends Provider {
  static language = 'php';

  apiCompletion: CompletionItem[] = [];
  apiCompletionFileCache: Map<string, CompletionItem[]> = new Map();

  constructor(context: ExtensionContext) {
    super(context);

    this.parseApiFiles();
  }

  async getWorkspacePath(): Promise<string | undefined> {
    const workspaceFolders = workspace.workspaceFolders;

    if (typeof workspaceFolders === 'undefined') {
      return;
    }

    // TODO: which workspaces is current?
    return workspaceFolders[0].uri.path;
  }

  async parseApiFiles() {
    const workspacePath = await this.getWorkspacePath();

    if (!workspacePath) {
      return;
    }

    const apiFiles = [join(workspacePath, 'web/core/core.api.php')];
    const moduleDirs = [
      'web/core/modules',
      'web/modules/contrib',
      'web/modules/custom',
    ];

    for (const moduleDir of moduleDirs) {
      const moduleDirPath = join(workspacePath, moduleDir);
      const files = await findApiFiles(moduleDirPath);

      apiFiles.push(...files);
    }

    for (const file of apiFiles) {
      try {
        await access(file, constants.R_OK);
        const completions = await this.getFileCompletions(file);

        if (completions.length) {
          this.apiCompletion.push(...completions);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  async provideCompletionItems(document: TextDocument) {
    if (
      typeof document === 'undefined' ||
      document.languageId !== HookCompletionProvider.language
    ) {
      return [];
    }

    const filePath = document.uri.path;
    const cache = this.apiCompletionFileCache.get(filePath);

    if (cache) {
      return cache;
    }

    const machineName = await getModuleMachineName(filePath);

    if (!machineName) {
      return this.apiCompletion;
    }

    const apiCompletionWithMachineName = this.apiCompletion.map((item) => {
      const newItem = Object.assign({}, item);
      const searchValue = 'function hook_';
      const replaceValue = `function ${machineName}_`;

      if (newItem.insertText instanceof SnippetString) {
        newItem.insertText = new SnippetString(newItem.insertText.value.replace(
          searchValue,
          replaceValue
        ));
      }

      if (newItem.documentation instanceof MarkdownString) {
        newItem.documentation = new MarkdownString(newItem.documentation.value.replace(
          searchValue,
          replaceValue
        ));
      }

      return newItem;
    });

    this.apiCompletionFileCache.set(filePath, apiCompletionWithMachineName);

    return apiCompletionWithMachineName;
  }

  async getFileCompletions(filePath: string): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];
    const text = await readFile(filePath, 'utf8');
    const tree = phpParser.parseCode(text, filePath);

    tree.children.forEach((item) => {
      switch (item.kind) {
        case 'function': {
          const func: ASTFunction = item as ASTFunction;
          const lastComment = item.leadingComments?.pop();
          const name = getName(func.name);

          if (/^hook_/.test(name) === false) {
            break;
          }

          const funcCall = (item.loc?.source ?? name).replace(/\$/g, '\\$');
          const completion: CompletionItem = {
            label: name,
            kind: NODE_COMPLETION_ITEM[item.kind],
            detail: `Implements ${name}`,
            insertText: new SnippetString(`/**\n * Implements ${name}().\n */\n${funcCall} {\n\t$0\n}`),
          };

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

          break;
        }
      }
    });

    return completions;
  }
}
