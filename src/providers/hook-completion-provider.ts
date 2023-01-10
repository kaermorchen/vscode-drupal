import { readFile, access } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  InitializeResult,
  InsertTextFormat,
  TextDocumentPositionParams,
  TextDocuments,
  MarkupContent,
  MarkupKind,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Function as ASTFunction, Identifier } from 'php-parser';
import getModuleMachineName from '../utils/get-module-machine-name';
import { URI } from 'vscode-uri';
import { join } from 'path';
import { constants } from 'fs';
import findFiles from '../utils/find-files';
import docParser from '../utils/doc-parser';
import phpParser from '../utils/php-parser';

const NODE_COMPLETION_ITEM = <const>{
  function: CompletionItemKind.Function,
};

function getName(val: string | Identifier) {
  return typeof val === 'string' ? val : val.name;
}

export default class HookCompletionProvider {
  name = 'hook';
  connection: Connection;
  documents: TextDocuments<TextDocument>;
  apiCompletion: CompletionItem[] = [];
  apiCompletionFileCache: Map<string, CompletionItem[]> = new Map();

  constructor(connection: Connection) {
    this.connection = connection;
    this.connection.onInitialize(this.onInitialize.bind(this));
    this.connection.onInitialized(this.onInitialized.bind(this));
    this.connection.onCompletion(this.onCompletion.bind(this));

    this.documents = new TextDocuments(TextDocument);
    this.documents.listen(this.connection);
  }

  onInitialize(): InitializeResult {
    return {
      capabilities: {
        completionProvider: {
          resolveProvider: false,
        },
        workspace: {
          workspaceFolders: {
            supported: true,
          },
        },
      },
    };
  }

  onInitialized() {
    this.parseApiFiles();
  }

  async parseApiFiles() {
    const workspaceFolders =
      await this.connection.workspace.getWorkspaceFolders();

    if (workspaceFolders === null) {
      return;
    }

    // TODO: read all workspaces?
    const workspacePath = URI.parse(workspaceFolders[0].uri).path;
    const moduleDirs = [
      'web/core',
      'web/modules/contrib',
      'web/modules/custom',
    ];

    for (const path of moduleDirs) {
      const files = await findFiles(join(workspacePath, path), /.api.php$/);

      for (const file of files) {
        try {
          await access(file, constants.R_OK);
          const completions = await this.getFileCompletions(file);

          if (completions.length) {
            this.apiCompletion.push(...completions);
          }
        } catch {}
      }
    }
  }

  async onCompletion(
    textDocumentPosition: TextDocumentPositionParams
  ): Promise<CompletionItem[]> {
    const uri = textDocumentPosition.textDocument.uri.toString();
    const document = this.documents.get(uri);

    if (typeof document === 'undefined' || document.languageId !== 'php') {
      return [];
    }

    const filePath = URI.parse(uri).path;
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

      newItem.insertText = newItem.insertText?.replace(
        searchValue,
        replaceValue
      );

      if (typeof newItem.documentation === 'object') {
        newItem.documentation.value = newItem.documentation.value.replace(
          searchValue,
          replaceValue
        );
      }

      return newItem;
    });

    this.apiCompletionFileCache.set(filePath, apiCompletionWithMachineName);

    return apiCompletionWithMachineName;
  }

  async getFileCompletions(filePath: string) {
    const completions: CompletionItem[] = [];
    const text = await readFile(filePath, 'utf8');
    const tree = phpParser.parseCode(text, filePath);

    tree.children.forEach((item) => {
      switch (item.kind) {
        case 'function': {
          const func: ASTFunction = item as ASTFunction;
          const lastComment = item.leadingComments?.pop();
          const name = getName(func.name);
          let documentation: MarkupContent | undefined;

          if (/^hook_/.test(name) === false) {
            break;
          }

          const kind = NODE_COMPLETION_ITEM[item.kind];
          const funcCall = (item.loc?.source ?? name).replace(/\$/g, '\\$');
          const insertText = `/**\n * Implements ${name}().\n */\n${funcCall} {\n\t$0\n}`;
          const detail = `Implements ${name}`;

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

            documentation = { kind: MarkupKind.Markdown, value };
          }

          completions.push({
            label: name,
            kind,
            detail,
            documentation,
            insertText,
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '-1',
          });
          break;
        }
      }
    });

    return completions;
  }
}
