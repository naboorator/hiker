import { IdempotentEmailService } from "./idempotent-email.service.js";
import { MailpitEmailService } from "./mailpit-email.service.js";
import { ResendEmailService } from "./resend-email.service.js";
class DisabledEmailService {
    async send() { }
}
function createEmailService() {
    const provider = process.env["EMAIL_PROVIDER"] ?? "disabled";
    const from = process.env["EMAIL_FROM"] ?? "My Hike <hello@myhike.local>";
    if (provider === "resend") {
        const apiKey = process.env["RESEND_API_KEY"];
        if (!apiKey)
            throw new Error("RESEND_API_KEY is required for the Resend email provider");
        return new IdempotentEmailService(new ResendEmailService(apiKey, from));
    }
    if (provider === "mailpit") {
        return new IdempotentEmailService(new MailpitEmailService(process.env["SMTP_HOST"] ?? "localhost", Number(process.env["SMTP_PORT"] ?? 1025), from));
    }
    if (provider !== "disabled")
        throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
    return new DisabledEmailService();
}
export const emailService = createEmailService();
