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
import {
  DrupalWorkspaceProviderConstructorArguments,
  FirstParam,
} from '../types';
import Relatively from '../mixins/relatively';
import Disposable from './disposable';
import Watcher from '../mixins/watcher';

const Mix = Watcher(Relatively(Disposable));

export default class GlobalVariablesCompletionProvider
  extends Mix
  implements CompletionItemProvider
{
  static language = 'php';

  completion: CompletionItem[] = [];

  constructor(arg: FirstParam<typeof Mix>) {
    super(arg);

    if (this.watcher) {
      this.watcher.onDidChange(this.parseFiles, this, this.disposables);
    }

    this.disposables.push(
      languages.registerCompletionItemProvider(
        GlobalVariablesCompletionProvider.language,
        this
      )
    );

    this.parseFiles();
  }

  async parseFiles() {
    this.completion = [];

    const result = await this.findFile(this.pattern);

    if (result) {
      this.getFileCompletions(result);
    }
  }

  async provideCompletionItems(document: TextDocument) {
    return this.drupalWorkspace.isCurrentWorkspace(document.uri)
      ? this.completion
      : [];
  }

  async getFileCompletions(uri: Uri) {
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

      this.completion.push(completion);
    }
  }
}
