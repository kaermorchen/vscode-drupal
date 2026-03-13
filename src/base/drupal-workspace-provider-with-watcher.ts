import { FileSystemWatcher, RelativePattern, workspace } from "vscode";
import {
  DrupalWorkspaceProvider,
  DrupalWorkspaceProviderParam,
} from "./drupal-workspace-provider";

export type DrupalWorkspaceProviderWithWatcherParam =
  DrupalWorkspaceProviderParam & {
    include: string;
  };

export class DrupalWorkspaceProviderWithWatcher extends DrupalWorkspaceProvider {
  watcher: FileSystemWatcher;
  pattern: RelativePattern;

  constructor(arg: DrupalWorkspaceProviderWithWatcherParam) {
    super(arg);

    this.pattern = arg.drupalWorkspace.getRelativePattern(arg.include);
    this.watcher = workspace.createFileSystemWatcher(this.pattern);

    this.disposables.push(this.watcher);
  }
}
