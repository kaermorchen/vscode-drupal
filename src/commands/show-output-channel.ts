import { logger } from "../utils/logger";
import { Command } from "./command";

export class ShowOutputChannel extends Command {
  static id = "drupal.show-output-channel";

  callback() {
    logger.openOutput();
  }
}
