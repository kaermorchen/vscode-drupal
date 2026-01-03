import { CompletionItem } from 'vscode';

export interface CompletionItemWithCallback extends CompletionItem {
  callback: string;
}

export type Tail<T extends any[]> = T extends [head: any, ...tail: infer Tail_]
  ? Tail_
  : never;
