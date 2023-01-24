import { readFile, access } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  ExtensionContext,
  Position,
  ShellExecution,
  Task,
  TaskDefinition,
  TaskGroup,
  TaskProvider,
  tasks,
  TaskScope,
  TextDocument,
  Uri,
  window,
  workspace,
} from 'vscode';
import { basename, join } from 'path';
import { constants } from 'fs';
import Provider from './provider';
import { parse } from 'yaml';
import { outputChannel } from './output-channel';
import { exec, execSync, spawn } from 'child_process';

export default class DrushTaskProvider extends Provider implements TaskProvider {
  static id = 'drush';
  private tasks: Task[] | undefined;

  async provideTasks(): Promise<Task[]> {
    if (this.tasks !== undefined) {
      return this.tasks;
    }

    const workspaceFolders = workspace.workspaceFolders;
    const result: Task[] = [];

    if (!workspaceFolders || workspaceFolders.length === 0) {
      return result;
    }

    for (const workspaceFolder of workspaceFolders) {
      const folderString = workspaceFolder.uri.fsPath;

      if (!folderString) {
        continue;
      }

      const workspacePath = workspaceFolder.uri.fsPath;

      try {
        const drush = `php vendor/bin/drush`;
        const stdout = execSync(`${drush} list --format=json`, { cwd: workspacePath });

        if (stdout) {
          const json = JSON.parse(stdout.toString());

          for (const item of json.commands) {
            if (item.hidden) {
              continue;
            }

            const kind: TaskDefinition = {
              type: 'drush',
              task: item.name,
              detail: item.description,
              arguments: item.definition.arguments,
              options: item.definition.options,
            };

            const task = await this.getTask(kind);

            result.push(task);
          }
        }
      } catch {
        // TODO: add error handler
      }
    }

    this.tasks = result;

    return this.tasks;
  }

  async resolveTask(task: Task): Promise<Task | undefined> {
    if (!task) {
      return undefined;
    }

    return await this.getTask(task.definition);
  }

  async getTask(item: TaskDefinition): Promise<Task> {
    const workspaceFolders = workspace.workspaceFolders;

    const task = new Task(item, workspaceFolders![0], item.task, 'drush');

    task.detail = item.detail;
    task.execution = new ShellExecution(`php vendor/bin/drush ${item.task}`);

    return task;
  }
}
