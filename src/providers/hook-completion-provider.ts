import { readFile } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  InitializeResult,
  TextDocumentPositionParams,
  TextDocuments,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Engine, Function as ASTFunction } from 'php-parser';
import DocParser from 'doc-parser';

const phpParser = new Engine({
  parser: {
    extractTokens: true,
    extractDoc: true,
  },
  ast: {
    withPositions: true,
    withSource: true,
  },
});

const docParser = new DocParser();

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
    const document = this.documents.get(
      textDocumentPosition.textDocument.uri.toString()
    );

    if (typeof document === 'undefined' || document.languageId !== 'php') {
      return [];
    }

    const file =
      '/root/projects/drupal-test-project/web/core/modules/tour/tour.api.php';

    return await this.getFileCompletions(file);
  }

  async getFileCompletions(filePath: string) {
    const text = await readFile(filePath, 'utf8');
    const tree = await phpParser.parseCode(text, filePath);

    const completions: CompletionItem[] = [];

    tree.children.forEach((item) => {
      switch (item.kind) {
        case 'function': {
          const func: ASTFunction = item as ASTFunction;
          const lastComment = item.leadingComments?.pop();

          if (!lastComment) {
            return;
          }

          const ast = docParser.parse(lastComment.value);
          const label =
            typeof func.name === 'string' ? func.name : func.name.name;

          completions.push({
            label,
            kind: CompletionItemKind.Function,
            documentation: ast.summary,
          });
          break;
        }
      }
    });

    return completions;
  }
}
