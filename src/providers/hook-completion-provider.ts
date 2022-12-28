import { readFile, access, readdir } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  InitializeResult,
  InitializeParams,
  InsertTextFormat,
  TextDocumentPositionParams,
  TextDocuments,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Engine, Function as ASTFunction, Identifier } from 'php-parser';
import DocParser from 'doc-parser';
import getModuleMachineName from '../utils/get-module-machine-name';
import { URI } from 'vscode-uri';
import { join } from 'path';
import { constants } from 'fs';

const NODE_COMPLETION_ITEM = <const>{
  function: CompletionItemKind.Function,
};

const phpParser = new Engine({
  parser: {
    extractTokens: true,
    extractDoc: true,
  },
  ast: {
    withPositions: true,
    withSource: true,
  },
  lexer: {
    all_tokens: true,
  },
});

const docParser = new DocParser();

function getName(val: string | Identifier) {
  return typeof val === 'string' ? val : val.name;
}

export default class HookCompletionProvider {
  name = 'hook';
  connection: Connection;
  documents: TextDocuments<TextDocument>;
  apiCompletion: CompletionItem[] = [];

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

    const workspacePath = URI.parse(workspaceFolders[0].uri).path;
    const moduleDirs = [
      'web/core/modules',
      'web/modules/contrib',
      'web/modules/custom',
    ];

    for (const path of moduleDirs) {
      const modules = await readdir(path);

      for (const dir of modules) {
        const apiFilePath = join(workspacePath, path, dir, `${dir}.api.php`);

        try {
          await access(apiFilePath, constants.R_OK);
          const completions = await this.getFileCompletions(apiFilePath);

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
    const machineName = await getModuleMachineName(filePath);

    if (!machineName) {
      return this.apiCompletion;
    }

    const apiCompletionWithMachineName = this.apiCompletion.map((item) => {
      const newItem = Object.assign({}, item);

      newItem.insertText = newItem.insertText?.replace(
        /function hook_/,
        `function ${machineName}_`
      );

      return newItem;
    });

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
          let documentation;

          if (/^hook_/.test(name) === false) {
            break;
          }

          if (lastComment) {
            const ast = docParser.parse(lastComment.value);
            // TODO: add colors
            documentation = ast.summary;
          }

          const args = func.arguments.map((item) =>
            // Replace full import to last part
            item.loc?.source?.replace(/^(\\(\w+))+/, '$2')
          );
          const kind = NODE_COMPLETION_ITEM[item.kind];
          const funcName = (item.loc?.source ?? name).replace(/\$/g, '\\$');
          const insertText = `/**\n * Implements ${name}().\n */\n${funcName} {\n\t$0\n}`;
          const detail = `${funcName}(${args.join(', ')})`;

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
