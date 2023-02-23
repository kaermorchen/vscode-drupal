import {
  CompletionItemKind,
  TextDocument,
  Position,
  workspace,
  SnippetString,
  CompletionItemProvider,
  Uri,
  languages,
} from 'vscode';
import { Class as ASTClass, Method, Namespace } from 'php-parser';
import phpParser from '../utils/php-parser';
import docParser from '../utils/doc-parser';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import getName from '../utils/get-name';
import { CompletionItemWithCallback } from '../types';

const astFileCache = new Map<string, ASTClass>();

const twigFunctions: CompletionItemWithCallback[] = [
  {
    label: 'render_var',
    insertText: '{{ render_var(${1:any}) }}',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::renderVar`,
  },
  {
    label: 'url',
    insertText: '{{ url(${1:name}) }}',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::getUrl`,
  },
  {
    label: 'path',
    insertText: "{{ path('${1:name}') }}",
    callback: `\\Drupal\\Core\\Template\\TwigExtension::getPath`,
  },
  {
    label: 'link',
    insertText: '{{ link(${1:text}, ${1:uri}) }}',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::getLink`,
  },
  {
    label: 'file_url',
    insertText: '{{ file_url(${1:path}) }}',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::getFileUrl`,
  },
  {
    label: 'attach_library',
    insertText: "{{ attach_library('${1:library}') }}",
    callback: `\\Drupal\\Core\\Template\\TwigExtension::attachLibrary`,
  },
  {
    label: 'active_theme_path',
    insertText: '{{ active_theme_path() }}',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::getActiveThemePath`,
  },
  {
    label: 'active_theme',
    insertText: '{{ active_theme() }}',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::getActiveTheme`,
  },
  {
    label: 'create_attribute',
    insertText: '{{ create_attribute(${1:attributes}) }}',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::createAttribute`,
  },
  {
    label: 'dump',
    insertText: '{{ dump(${1:any}) }}',
    callback: `\\Drupal\\Core\\Template\\DebugExtension::dump`,
  },
].map((item) =>
  Object.assign(item, {
    detail: `function (Drupal)`,
    kind: CompletionItemKind.Function,
    insertText: new SnippetString(item.insertText),
  })
);

const twigFilters: CompletionItemWithCallback[] = [
  {
    label: 'placeholder',
    insertText: 'placeholder',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::escapePlaceholder`,
  },
  {
    label: 'drupal_escape',
    insertText: 'drupal_escape',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::escapeFilter`,
  },
  {
    label: 'safe_join',
    insertText: 'safe_join',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::safeJoin`,
  },
  {
    label: 'without',
    insertText: 'without',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::withoutFilter`,
  },
  {
    label: 'clean_class',
    insertText: 'clean_class',
    callback: `\\Drupal\\Component\\Utility\\Html::getClass`,
  },
  {
    label: 'clean_id',
    insertText: 'clean_id',
    callback: `\\Drupal\\Component\\Utility\\Html::getId`,
  },
  {
    label: 'render',
    insertText: 'render',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::renderVar`,
  },
  {
    label: 'format_date',
    insertText: 'format_date',
    callback: `\\Drupal\\Core\\Datetime\\DateFormatterInterface::format`,
  },
  {
    label: 'add_suggestion',
    insertText: 'add_suggestion',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::suggestThemeHook`,
  },
].map((item) =>
  Object.assign(item, {
    detail: `filter (Drupal)`,
    kind: CompletionItemKind.Function,
    insertText: new SnippetString(item.insertText),
  })
);

const twigAll = twigFunctions.concat(twigFilters);

export default class TwigCompletionProvider
  extends DrupalWorkspaceProvider
  implements CompletionItemProvider
{
  static language = 'twig';

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        {
          language: TwigCompletionProvider.language,
          scheme: 'file',
          pattern: this.drupalWorkspace.getRelativePattern('**'),
        },
        this
      )
    );
  }

  provideCompletionItems(document: TextDocument, position: Position) {
    if (!this.drupalWorkspace.hasFile(document.uri)) {
      return [];
    }

    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);

    if (/\|\s*/.test(linePrefix)) {
      return twigAll;
    } else {
      return twigFunctions;
    }
  }

  async resolveCompletionItem(
    item: CompletionItemWithCallback
  ): Promise<CompletionItemWithCallback> {
    const [namespace, fnName] = item.callback.split('::');
    const parts = namespace.concat('.php').split('\\');
    const uri = Uri.joinPath(
      this.drupalWorkspace.workspaceFolder.uri,
      'web',
      'core',
      'lib',
      ...parts
    );
    const docblock = await this.getDocblock(uri, fnName);

    if (docblock) {
      item.documentation = docblock;
    }

    return item;
  }

  async getDocblock(uri: Uri, fnName: string): Promise<string | undefined> {
    const filePath = uri.fsPath;
    let astClass = astFileCache.get(filePath);

    if (!astClass) {
      const buffer = await workspace.fs.readFile(uri);
      const tree = phpParser.parseCode(buffer.toString(), filePath);

      astClass = (tree.children[0] as Namespace).children.pop() as ASTClass;
      astFileCache.set(filePath, astClass);
    }

    for (const item of astClass.body) {
      switch (item.kind) {
        case 'method': {
          const func: Method = item as Method;
          const name = getName(func.name);

          if (name !== fnName) {
            break;
          }

          const lastComment = item.leadingComments?.pop();

          if (lastComment) {
            const ast = docParser.parse(lastComment.value);

            return ast.summary;
          }

          return;
        }
      }
    }
  }
}
