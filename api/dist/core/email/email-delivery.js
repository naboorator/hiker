import { renderEmail } from "./email-template.js";
import { logger } from "../logger.js";
export async function deliverEmailSafely(service, message) {
    try {
        await service.send(message);
        return true;
    }
    catch (error) {
        logger.error("Email delivery failed", {
            idempotencyKey: message.idempotencyKey,
            error: error instanceof Error ? error.message : "Unknown email provider error",
        });
        return false;
    }
}
export async function deliverTemplatedEmailSafely(service, template, language, to, idempotencyKey, variables) {
    try {
        const message = await renderEmail(template, language, to, idempotencyKey, variables);
        return deliverEmailSafely(service, message);
    }
    catch (error) {
        logger.error("Email template rendering failed", {
            idempotencyKey,
            error: error instanceof Error ? error.message : "Unknown template error",
        });
        return false;
    }
}
