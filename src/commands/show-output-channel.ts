import { outputChannel } from '../base/output-channel';
import Command from './command';

export default class ShowOutputChannel extends Command {
  static id = 'drupal.show-output-channel';

  callback() {
    outputChannel.show();
  }
}
