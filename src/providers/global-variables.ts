import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  FileSystemWatcher,
  languages,
  MarkdownString,
  TextDocument,
  Uri,
  workspace,
} from 'vscode';
import { Global } from 'php-parser';
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
  watcher: FileSystemWatcher;

  constructor(drupalWorkspace: DrupalWorkspace) {
    super();

    this.drupalWorkspace = drupalWorkspace;
    this.watcher = workspace.createFileSystemWatcher(
      this.drupalWorkspace.getRelativePattern('web/core/globals.api.php')
    );

    this.watcher.onDidChange(this.parseApiFiles, this, this.disposables);

    this.drupalWorkspace.disposables.push(
      languages.registerCompletionItemProvider(
        GlobalVariablesCompletionProvider.language,
        this
      ),
      this.watcher
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
