import { FileSystemWatcher, RelativePattern, workspace } from "vscode";
import {
  DrupalWorkspaceProvider,
  DrupalWorkspaceProviderParam,
} from "./drupal-workspace-provider";

export type DrupalWorkspaceProviderWithWatcherParam =
  DrupalWorkspaceProviderParam & {
    pattern: RelativePattern;
  };

export class DrupalWorkspaceProviderWithWatcher extends DrupalWorkspaceProvider {
  watcher: FileSystemWatcher;
  pattern: RelativePattern;

  constructor(arg: DrupalWorkspaceProviderWithWatcherParam) {
    super(arg);

    this.pattern = arg.pattern;
    this.watcher = workspace.createFileSystemWatcher(this.pattern);

    this.disposables.push(this.watcher);
  }
}
