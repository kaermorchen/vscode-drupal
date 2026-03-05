import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  languages,
  MarkdownString,
  workspace,
} from "vscode";
import { Global } from "php-parser";
import { parsePHPDocSummary } from "../utils/doc-parser";
import phpParser from "../utils/php-parser";
import { DrupalWorkspaceProviderWithWatcher } from "../base/drupal-workspace-provider-with-watcher";

export class GlobalVariablesCompletionProvider
  extends DrupalWorkspaceProviderWithWatcher
  implements CompletionItemProvider
{
  static language = "php";

  completions: CompletionItem[] | undefined;

  constructor(
    arg: ConstructorParameters<typeof DrupalWorkspaceProviderWithWatcher>[0],
  ) {
    super(arg);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        {
          language: GlobalVariablesCompletionProvider.language,
          scheme: "file",
          pattern: this.drupalWorkspace.getRelativePattern("**"),
        },
        this,
      ),
    );
  }

  async parseFile() {
    const uri = await this.drupalWorkspace.findFile(this.pattern);

    if (!uri) {
      return;
    }

    const completions = [];
    const buffer = await workspace.fs.readFile(uri);
    const tree = phpParser.parseCode(buffer.toString(), uri.fsPath);

    for (const item of tree.children) {
      if (item.kind !== "global") {
        continue;
      }

      const variable = (item as Global).items[0];

      if (typeof variable.name !== "string") {
        continue;
      }

      const name = variable.name;
      const completion: CompletionItem = {
        label: `$${name}`,
        kind: CompletionItemKind.Variable,
        detail: "global variable",
      };

      const lastComment = item.leadingComments?.pop();

      if (lastComment) {
        const summary = parsePHPDocSummary(lastComment.value);

        if (summary) {
          completion.documentation = new MarkdownString(summary);
        }
      }

      completions.push(completion);
    }

    this.completions = completions;
  }

  async provideCompletionItems() {
    if (this.completions !== undefined) {
      return this.completions;
    }

    await this.parseFile();

    return this.completions;
  }
}
