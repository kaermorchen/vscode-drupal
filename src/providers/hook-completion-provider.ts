import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  InitializeResult,
  TextDocumentPositionParams,
  TextDocuments,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

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

  onCompletion(
    textDocumentPosition: TextDocumentPositionParams
  ): CompletionItem[] {
    const document = this.documents.get(
      textDocumentPosition.textDocument.uri.toString()
    );

    if (typeof document === 'undefined' || document?.languageId !== 'php') {
      return [];
    }

    return [];
  }
}
