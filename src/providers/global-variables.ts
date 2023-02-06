import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  languages,
  MarkdownString,
  Uri,
  workspace,
} from 'vscode';
import { Global } from 'php-parser';
import docParser from '../utils/doc-parser';
import phpParser from '../utils/php-parser';
import DrupalWorkspaceProviderWithWatcher from '../base/drupal-workspace-provider-with-watcher';

export default class GlobalVariablesCompletionProvider
  extends DrupalWorkspaceProviderWithWatcher
  implements CompletionItemProvider
{
  static language = 'php';

  completions: CompletionItem[] = [];

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProviderWithWatcher>[0]) {
    super(arg);

    this.watcher.onDidChange(this.parseFiles, this, this.disposables);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        {
          language: GlobalVariablesCompletionProvider.language,
          scheme: 'file',
          pattern: this.drupalWorkspace.getRelativePattern('**'),
        },
        this
      )
    );

    this.parseFiles();
  }

  async parseFiles(uri?: Uri) {
    const uris = uri
      ? [uri]
      : await this.drupalWorkspace.findFiles(this.pattern);

    this.completions = [];

    for (const uri of uris) {
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

        this.completions.push(completion);
      }
    }
  }

  async provideCompletionItems() {
    return this.completions;
  }
}
