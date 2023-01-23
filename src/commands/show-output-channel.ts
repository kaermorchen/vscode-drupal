import { outputChannel } from "../providers/output-channel";
import BaseCommand from "./base"

export default class ShowOutputChannel extends BaseCommand {
  static id = 'drupal.show-output-channel';

  callback() {
    outputChannel.show();
  }
}
