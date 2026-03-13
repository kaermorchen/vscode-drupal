import { Disposable } from "./disposable";
import { workspace, WorkspaceConfiguration } from "vscode";
import { DrupalWorkspace } from "./drupal-workspace";
import { logger } from "../utils/logger";

export type DrupalWorkspaceProviderParam = {
  drupalWorkspace: DrupalWorkspace;
};

export class DrupalWorkspaceProvider extends Disposable {
  drupalWorkspace: DrupalWorkspace;

  constructor(arg: DrupalWorkspaceProviderParam) {
    super();

    this.drupalWorkspace = arg.drupalWorkspace;
  }

  get name(): string {
    throw new Error("Getter name not implemented.");
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

  logInfo(message: string, ...args: unknown[]) {
    logger.info(`${this.name}: ${message}`, ...args);
  }

  logError(message: string | Error) {
    logger.error(`${this.name}: ${message}`);
  }
}
