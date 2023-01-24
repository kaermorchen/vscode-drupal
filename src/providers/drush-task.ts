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
    return undefined;
  }

  // getTasks(): Task[] {
  //   if (this.tasks !== undefined) {
  //     return this.tasks;
  //   }

  //   const result: Task[] = [];
  //   const workspaceFolders = workspace.workspaceFolders;

  //   if (!workspaceFolders || workspaceFolders.length === 0) {
  //     return result;
  //   }

  //   const workspacePath = workspaceFolders[0].uri.fsPath;

  //   const spawnOptions = {
  //     cwd: workspacePath,
  //     encoding: 'utf8',
  //     timeout: 1000 * 60 * 1, // 1 minute
  //   };
  //   const args = [
  //     join(workspacePath, 'vendor/bin/drush'),
  //     'help',
  //   ];

  //   const execution = new ShellExecution('php', args, spawnOptions)

  //   result.push(
  //     new Task(taskDefinition, TaskScope.Workspace, `drush help`, DrushTaskProvider.id, execution),
  //   );

  //   return result;
  // }
  // }

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
        const stdout = await execSync(`${drush} list --format=json`, { cwd: workspacePath });

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

    return result;
  }
}
