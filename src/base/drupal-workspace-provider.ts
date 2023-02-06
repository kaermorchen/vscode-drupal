import Disposable from './disposable';
import {
  FileSystemWatcher,
  RelativePattern,
  workspace,
  WorkspaceConfiguration,
} from 'vscode';
import DrupalWorkspace from './drupal-workspace';

export default class DrupalWorkspaceProvider extends Disposable {
  drupalWorkspace: DrupalWorkspace;
  watcher: FileSystemWatcher;
  pattern: RelativePattern;

  constructor(arg: {
    drupalWorkspace: DrupalWorkspace;
    pattern: RelativePattern;
    watcher?: FileSystemWatcher;
  }) {
    super();

    this.drupalWorkspace = arg.drupalWorkspace;
    this.pattern = arg.pattern;

    if (arg.watcher) {
      this.watcher = arg.watcher;
    } else {
      this.watcher = workspace.createFileSystemWatcher(this.pattern);
      this.disposables.push(this.watcher);
    }
  }

  get name(): string {
    throw new Error('Getter name not implemented.');
  }

  get config(): WorkspaceConfiguration {
    return workspace.getConfiguration(this.configName);
  }

  get configName(): string {
    return `drupal.${this.name}`;
  }

  get source() {
    return `Drupal: ${this.name}`;
  }
}
