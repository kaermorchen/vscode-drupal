import { outputChannel } from '../base/output-channel';
import { Command } from './command';

export class ShowOutputChannel extends Command {
  static id = 'drupal.show-output-channel';

  callback() {
    outputChannel.show();
  }
}
