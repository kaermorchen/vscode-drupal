import Disposable from '../providers/disposable';
import { FileSystemWatcher, workspace, WorkspaceConfiguration } from 'vscode';
import DrupalWorkspace from './drupal-workspace';
import { DrupalWorkspaceProviderConstructorArguments } from '../types';

export default class DrupalWorkspaceProvider extends Disposable {
  drupalWorkspace: DrupalWorkspace;
  watcher: FileSystemWatcher;
  pattern: string;

  constructor(arg: {
    drupalWorkspace: DrupalWorkspace;
    pattern: string;
    disposables?: Disposable[];
    watcher?: FileSystemWatcher;
  }) {
    super();

    this.drupalWorkspace = arg.drupalWorkspace;
    this.pattern = arg.pattern;

    if (arg.watcher) {
      this.watcher = arg.watcher;
    } else {
      this.watcher = workspace.createFileSystemWatcher(
        this.drupalWorkspace.getRelativePattern(this.pattern)
      );
      this.disposables.push(this.watcher);
    }

    if (arg.disposables) {
      arg.disposables.push(this);
    } else {
      this.drupalWorkspace.disposables.push(this);
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
