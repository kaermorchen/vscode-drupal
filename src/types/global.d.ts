import { CompletionItem } from 'vscode';

declare module 'doc-parser' {
  interface Doc {
    kind: 'doc';
    summary: string;
    body?: Block[];
  }

  type blockType = 'return' | 'param' | 'throws' | 'deprecated';

  interface Block {
    kind: blockType;
    description?: string;
    type?: unknown;
  }

  export default class DocParser {
    parse(text: string): Doc;
  }
}

interface CompletionItemWithCallback extends CompletionItem {
  callback: string;
}
