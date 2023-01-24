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
    return this.getTasks();
  }

  resolveTask(_task: Task): Task | undefined {
    // TODO: write resolveTask
    return undefined;
  }

  async getTasks(): Promise<Task[]> {
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
              type: 'drush'
            };

            const execution = new ShellExecution(`${drush} ${item.name}`);

            const task = new Task(
              kind,
              workspaceFolder,
              item.name,
              'Drush',
              execution
            );

            task.detail = item.description;

            result.push(task);
          }
        }
      } catch (err: any) {
        if (err.stderr) {
          outputChannel.appendLine(err.stderr);
        }

        if (err.stdout) {
          outputChannel.appendLine(err.stdout);
        }

        outputChannel.appendLine('Drush get tasks failed.');
        outputChannel.show(true);
      }
    }

    this.tasks = result;

    return result;
  }
}
