import Disposable from '../providers/disposable';
import { FileSystemWatcher, workspace, WorkspaceConfiguration } from 'vscode';
import DrupalWorkspace from './drupal-workspace';
import { DrupalWorkspaceProviderConstructorArguments } from '../types';

export default class DrupalWorkspaceProvider extends Disposable {
  drupalWorkspace: DrupalWorkspace;
  watcher: FileSystemWatcher;
  pattern: string;

  constructor(args: DrupalWorkspaceProviderConstructorArguments) {
    super();

    this.drupalWorkspace = args.drupalWorkspace;
    this.pattern = args.pattern;

    if (args.watcher) {
      this.watcher = args.watcher;
    } else {
      this.watcher = workspace.createFileSystemWatcher(
        this.drupalWorkspace.getRelativePattern(this.pattern)
      );
      this.disposables.push(this.watcher);
    }

    if (args.disposables) {
      args.disposables.push(this);
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
