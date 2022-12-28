import { readFile } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  InitializeResult,
  InsertTextFormat,
  TextDocumentPositionParams,
  TextDocuments,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Engine, Function as ASTFunction, Identifier } from 'php-parser';
import DocParser from 'doc-parser';
import getModuleMachineName from '../utils/get-module-machine-name';
import { URI } from 'vscode-uri';

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
  documents!: TextDocuments<TextDocument>;

  constructor(connection: Connection) {
    this.connection = connection;
    this.connection.onInitialize(this.onInitialize.bind(this));
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
      },
    };
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
      return [];
    }

    const file =
      '/root/projects/drupal-test-project/web/core/modules/update/update.api.php';

    return await this.getFileCompletions(file, machineName);
  }

  async getFileCompletions(filePath: string, machineName: string) {
    const completions: CompletionItem[] = [];
    const text = await readFile(filePath, 'utf8');
    const tree = await phpParser.parseCode(text, filePath);

    tree.children.forEach((item) => {
      switch (item.kind) {
        case 'function': {
          const func: ASTFunction = item as ASTFunction;
          const lastComment = item.leadingComments?.pop();

          if (!lastComment) {
            return;
          }

          const ast = docParser.parse(lastComment.value);
          const hookName = getName(func.name);
          const name = getName(func.name);
          const args = func.arguments.map((item) =>
            // Replace full import to last part
            item.loc?.source?.replace(/^(\\(\w+))+/, '$2')
          );
          const kind = NODE_COMPLETION_ITEM[item.kind];
          const detail = `${name}(${args.join(', ')})`;
          const documentation = ast.summary;
          let funcName = item.loc?.source;
          if (funcName) {
            funcName = funcName
              .replace(/\$/g, '\\$')
              .replace(/ hook_/, ` ${machineName}_`);
          }
          const insertText = `/**\n * Implements ${hookName}().\n */\n${funcName} {\n\t$0\n}`;

          completions.push({
            label: name,
            kind,
            detail,
            documentation,
            insertText,
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '-1',
            // filterText: 'dummy',
            // preselect: true,
          });
          break;
        }
      }
    });

    return completions;
  }
}
