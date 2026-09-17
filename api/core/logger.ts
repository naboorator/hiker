import type { Logger } from "../interface/logger.interface.js";

export const logger: Logger = {
  error(message, context) {
    console.error(message, context);
  },
};
