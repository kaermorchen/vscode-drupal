import { readFile, access } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  ExtensionContext,
  languages,
  MarkdownString,
  TextDocument,
  Uri,
  workspace,
} from 'vscode';
import { Global } from 'php-parser';
import { join } from 'path';
import { constants } from 'fs';
import docParser from '../utils/doc-parser';
import phpParser from '../utils/php-parser';
import Provider from './provider';
import DrupalWorkspace from '../base/drupal-workspace';

export default class GlobalVariablesCompletionProvider
  extends Provider
  implements CompletionItemProvider
{
  static language = 'php';

  apiCompletion: CompletionItem[] = [];
  drupalWorkspace: DrupalWorkspace;

  constructor(drupalWorkspace: DrupalWorkspace) {
    super();

    this.drupalWorkspace = drupalWorkspace;

    this.drupalWorkspace.disposables.push(
      languages.registerCompletionItemProvider(
        GlobalVariablesCompletionProvider.language,
        this
      )
    );

    this.parseApiFiles();
  }

  async parseApiFiles() {
    const result = await this.drupalWorkspace.findFile(
      'web/core/globals.api.php'
    );

    if (result) {
      this.apiCompletion = await this.getFileCompletions(result);
    }
  }

  async provideCompletionItems(document: TextDocument) {
    return this.drupalWorkspace.workspaceFolder ===
      workspace.getWorkspaceFolder(document.uri)
      ? this.apiCompletion
      : [];
  }

  async getFileCompletions(uri: Uri): Promise<CompletionItem[]> {
    const filePath = uri.fsPath;
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
        detail: 'global variable',
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
