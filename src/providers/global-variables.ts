import { readFile, access } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  ExtensionContext,
  MarkdownString,
  TextDocument,
} from 'vscode';
import { Global } from 'php-parser';
import { join } from 'path';
import { constants } from 'fs';
import docParser from '../utils/doc-parser';
import phpParser from '../utils/php-parser';
import Provider from './provider';

export default class GlobalVariablesCompletionProvider extends Provider {
  static language = 'php';

  apiCompletion: CompletionItem[] = [];

  constructor(context: ExtensionContext) {
    super(context);

    this.parseApiFiles();
  }

  async parseApiFiles() {
    const workspacePath = await this.getWorkspacePath();

    if (!workspacePath) {
      return;
    }

    const apiFiles = [join(workspacePath, 'web/core/globals.api.php')];

    for (const file of apiFiles) {
      try {
        await access(file, constants.R_OK);
        this.apiCompletion = await this.getFileCompletions(file);
      } catch (e) {
        console.error(e);
      }
    }
  }

  async provideCompletionItems(document: TextDocument) {
    if (
      typeof document === 'undefined' ||
      document.languageId !== GlobalVariablesCompletionProvider.language
    ) {
      return [];
    }

    return this.apiCompletion;
  }

  async getFileCompletions(filePath: string): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];
    const text = await readFile(filePath, 'utf8');
    const tree = phpParser.parseCode(text, filePath);

    for (const item of tree.children) {
      if (item.kind !== 'global') {
        continue;
      }

      const variable = (item as Global).items[0];

      if (typeof variable.name !== 'string') {
        continue;
      }

      const name = variable.name;
      const completion: CompletionItem = {
        label: `$${name}`,
        kind: CompletionItemKind.Variable,
        detail: 'global variable'
      };

      const lastComment = item.leadingComments?.pop();

      if (lastComment) {
        const ast = docParser.parse(lastComment.value);

        completion.documentation = new MarkdownString(ast.summary);
      }

      completions.push(completion);
    }

    return completions;
  }
}
