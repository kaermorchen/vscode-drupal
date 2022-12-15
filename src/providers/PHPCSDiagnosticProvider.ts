import {
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  TextDocuments,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export default class PHPCSDiagnosticProvider {
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
    const uri = document.uri;
    const diagnostics = this.getDiagnostics(document);

    this.connection.sendDiagnostics({ uri, diagnostics });
  }

  private getDiagnostics(document: TextDocument): Diagnostic[] {
    const text = document.getText();
    const diagnostics: Diagnostic[] = [];
    const pattern = /\b[A-Z]{2,}\b/g;
    let m: RegExpExecArray | null;

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

    return diagnostics;
  }
}
