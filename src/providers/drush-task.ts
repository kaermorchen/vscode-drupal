import {
  ShellExecution,
  Task,
  TaskDefinition,
  TaskProvider,
  tasks,
  TaskScope,
  window,
} from 'vscode';
import { execSync } from 'child_process';
import Disposable from '../base/disposable';
import DrupalWorkspace from '../base/drupal-workspace';

export default class DrushTaskProvider
  extends Disposable
  implements TaskProvider
{
  static id = 'drush';

  tasks: Task[] = [];
  drupalWorkspaces: DrupalWorkspace[];

  constructor(drupalWorkspaces: DrupalWorkspace[]) {
    super();

    this.drupalWorkspaces = drupalWorkspaces;

    this.commandLists();

    this.disposables.push(
      tasks.registerTaskProvider(DrushTaskProvider.id, this)
    );
  }

  async commandLists() {
    for (const { workspaceFolder } of this.drupalWorkspaces) {
      try {
        const drush = 'vendor/bin/drush';
        const stdout = execSync(`${drush} list --format=json`, {
          cwd: workspaceFolder.uri.fsPath,
        });

        if (stdout) {
          const json = JSON.parse(stdout.toString());

          for (const item of json.commands) {
            if (item.hidden) {
              continue;
            }

            const definition: TaskDefinition = {
              type: 'drush',
              name: item.name,
              description: item.description,
              arguments: item.definition.arguments,
              options: item.definition.options,
              usage: item.usage[0],
            };

            const task = new Task(
              definition,
              workspaceFolder,
              definition.name,
              'drush',
              // new ShellExecution(`vendor/bin/drush ${definition.name}`)
            );

            this.tasks.push(task);
          }
        }
      } catch {
        // TODO: add error handler
      }
    }
  }

  async getTask(definition: TaskDefinition): Promise<Task> {
    const task = new Task(
      definition,
      TaskScope.Workspace,
      definition.name,
      'drush'
    );
    task.detail = definition.detail;

    const args = [];
    console.log(definition);

    const result = await window.showInputBox({
      title: `drush ${definition.name}`,
    });

    // TODO: add cancel token

    if (result) {
      args.push(result);
    }

    task.execution = new ShellExecution(
      `vendor/bin/drush ${definition.name} ${args.join(' ')}`
    );

    return task;
  }

  async provideTasks() {
    return this.tasks;
  }

  async resolveTask(task: Task) {
    return await this.getTask(task.definition);
  }
}
