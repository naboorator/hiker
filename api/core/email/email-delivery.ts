import type { EmailMessage } from "../../interface/email-message.interface.js";
import type { EmailService } from "./email-service.interface.js";
import type { EmailLanguage } from "../../interface/email-language.type.js";
import { renderEmail } from "./email-template.js";
import { logger } from "../logger.js";

export async function deliverEmailSafely(
  service: EmailService,
  message: EmailMessage,
): Promise<boolean> {
  try {
    await service.send(message);
    return true;
  } catch (error) {
    logger.error("Email delivery failed", {
      idempotencyKey: message.idempotencyKey,
      error:
        error instanceof Error ? error.message : "Unknown email provider error",
    });
    return false;
  }
}

export async function deliverTemplatedEmailSafely(
  service: EmailService,
  template: "registration-success" | "password-reset",
  language: EmailLanguage,
  to: string,
  idempotencyKey: string,
  variables: Record<string, string>,
): Promise<boolean> {
  try {
    const message = await renderEmail(
      template,
      language,
      to,
      idempotencyKey,
      variables,
    );
    return deliverEmailSafely(service, message);
  } catch (error) {
    logger.error("Email template rendering failed", {
      idempotencyKey,
      error: error instanceof Error ? error.message : "Unknown template error",
    });
    return false;
  }
}
