import {
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  TextDocuments,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export default class PHPCSDiagnosticsProvider {
  documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
  connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;

    this.documents.listen(this.connection);
    this.documents.onDidChangeContent((event) => {
      this.validate(event.document);
    });
  }

  private validate(document: TextDocument): void {
    const text = document.getText();
    const pattern = /\b[A-Z]{2,}\b/g;
    let m: RegExpExecArray | null;

    const diagnostics: Diagnostic[] = [];
    while ((m = pattern.exec(text))) {
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Warning,
        range: {
          start: document.positionAt(m.index),
          end: document.positionAt(m.index + m[0].length),
        },
        message: `${m[0]} is all uppercase.`,
        source: 'ex',
      };

      diagnostics.push(diagnostic);
    }

    this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
  }
}
