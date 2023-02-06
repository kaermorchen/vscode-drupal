import { FileSystemWatcher, RelativePattern, workspace } from 'vscode';
import DrupalWorkspaceProvider from './drupal-workspace-provider';

export default class DrupalWorkspaceProviderWithWatcher extends DrupalWorkspaceProvider {
  watcher: FileSystemWatcher;
  pattern: RelativePattern;

  constructor(
    arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0] & {
      pattern: RelativePattern;
    }
  ) {
    super(arg);

    this.pattern = arg.pattern;
    this.watcher = workspace.createFileSystemWatcher(this.pattern);
    this.disposables.push(this.watcher);
  }
}
