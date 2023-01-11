import { readFile, access } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  TextDocument,
  Position,
  ExtensionContext,
  workspace,
  SnippetString,
} from 'vscode';
import { join } from 'path';
import { constants } from 'fs';
import { Class as ASTClass, Method, Namespace } from 'php-parser';
import phpParser from '../utils/php-parser';
import docParser from '../utils/doc-parser';
import Provider from './provider';
import getName from '../utils/get-name';

const astFileCache = new Map<string, ASTClass>();

const twigFunctions: TwigSnippet[] = [
  {
    label: 'render_var',
    insertText: '{{ render_var(${1:any}) }}',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::renderVar`,
  },
  {
    label: 'url',
    insertText: '{{ url(${1:name}) }}',
    detail: `function (Drupal)`,
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
    insertText: new SnippetString(item.insertText),
  })
);

const twigFilters: TwigSnippet[] = [
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
    insertText: new SnippetString(item.insertText),
  })
);

export default class TwigCompletionProvider extends Provider {
  static language = 'twig';

  functionCompletion: CompletionItem[] = [];
  filterCompletion: CompletionItem[] = [];

  constructor(context: ExtensionContext) {
    super(context);

    this.parseFiles();
  }

  async provideCompletionItems(document: TextDocument, position: Position) {
    if (
      typeof document === 'undefined' ||
      document.languageId !== TwigCompletionProvider.language
    ) {
      return [];
    }

    let apiCompletion = [...this.functionCompletion];
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);

    if (/\|\s*/.test(linePrefix)) {
      apiCompletion = apiCompletion.concat(this.filterCompletion);
    }

    return apiCompletion;
  }

  async getWorkspacePath(): Promise<string | undefined> {
    const workspaceFolders = workspace.workspaceFolders;

    if (typeof workspaceFolders === 'undefined') {
      return;
    }

    // TODO: which workspaces is current?
    return workspaceFolders[0].uri.path;
  }

  async parseFiles() {
    for (const item of twigFunctions) {
      const completionItem = await this.createCompletionItem(item);

      if (completionItem) {
        this.functionCompletion.push(completionItem);
      }
    }

    for (const item of twigFilters) {
      const completionItem = await this.createCompletionItem(item);

      if (completionItem) {
        this.filterCompletion.push(completionItem);
      }
    }
  }

  async createCompletionItem(
    item: TwigSnippet
  ): Promise<CompletionItem | undefined> {
    const workspacePath = await this.getWorkspacePath();

    if (!workspacePath) {
      return;
    }

    const [namespace, fnName] = item.callback.split('::');
    const parts = namespace.split('\\');
    const file = `${join(workspacePath, 'web', 'core', 'lib', ...parts)}.php`;

    try {
      await access(file, constants.R_OK);

      const completionItem: CompletionItem = Object.assign({}, item, {
        kind: CompletionItemKind.Function,
      });

      const docblock = await this.getDocblock(file, fnName);

      if (docblock) {
        completionItem.documentation = docblock;
      }

      return completionItem;
    } catch {}
  }

  async getDocblock(
    filePath: string,
    fnName: string
  ): Promise<string | undefined> {
    let astClass = astFileCache.get(filePath);

    if (!astClass) {
      const text = await readFile(filePath, 'utf8');
      const tree = phpParser.parseCode(text, filePath);

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
