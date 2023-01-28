import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  languages,
  MarkdownString,
  TextDocument,
  Uri,
  workspace,
} from 'vscode';
import { Global } from 'php-parser';
import docParser from '../utils/doc-parser';
import phpParser from '../utils/php-parser';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import { DrupalWorkspaceProviderConstructorArguments } from '../types';

export default class GlobalVariablesCompletionProvider
  extends DrupalWorkspaceProvider
  implements CompletionItemProvider
{
  static language = 'php';

  completion: CompletionItem[] = [];

  constructor(args: DrupalWorkspaceProviderConstructorArguments) {
    super(args);

    this.watcher.onDidChange(this.parseFiles, this, this.disposables);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        GlobalVariablesCompletionProvider.language,
        this
      )
    );

    this.parseFiles();
  }

  async parseFiles() {
    const result = await this.drupalWorkspace.findFile(this.pattern);

    if (result) {
      this.completion = await this.getFileCompletions(result);
    }
  }

  async provideCompletionItems(document: TextDocument) {
    return this.drupalWorkspace.workspaceFolder ===
      workspace.getWorkspaceFolder(document.uri)
      ? this.completion
      : [];
  }

  async getFileCompletions(uri: Uri): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];
    const buffer = await workspace.fs.readFile(uri);
    const tree = phpParser.parseCode(buffer.toString(), uri.fsPath);

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
