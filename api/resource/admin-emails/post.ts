import { randomUUID } from "node:crypto";
import type { Router } from "express";
import { requireAdministrator } from "../../core/auth.js";
import { deliverEmailSafely } from "../../core/email/email-delivery.js";
import { emailService } from "../../core/email/email.service.js";
import { textToHtml } from "../../core/email/text-to-html.js";
import { HttpError } from "../../core/http-error.js";
import { rateLimit } from "../../core/rate-limit.js";

const testEmailRateLimit = rateLimit(10, 15 * 60_000);

export function registerAdminEmailPostRoutes(router: Router): void {
  router.post(
    "/admin/emails/send-test-email",
    testEmailRateLimit,
    async (request, response) => {
      requireAdministrator(response);
      const input = testEmailInput(request.body);
      const sent = await deliverEmailSafely(emailService, {
        to: input.email,
        subject: input.subject,
        text: input.body,
        html: textToHtml(input.body),
        idempotencyKey: `admin-test-email:${randomUUID()}`,
      });
      if (!sent) throw new HttpError(502, "The test email could not be sent");
      response.status(204).send();
    },
  );
}

function testEmailInput(value: unknown): {
  email: string;
  subject: string;
  body: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError(400, "A JSON object is required");
  const payload = value as Record<string, unknown>;
  const email =
    typeof payload["email"] === "string"
      ? payload["email"].trim().toLowerCase()
      : "";
  const subject =
    typeof payload["subject"] === "string" ? payload["subject"].trim() : "";
  const body =
    typeof payload["body"] === "string" ? payload["body"].trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(400, "Valid email is required");
  if (!subject || subject.length > 200)
    throw new HttpError(
      400,
      "Subject is required and must not exceed 200 characters",
    );
  if (!body || body.length > 10_000)
    throw new HttpError(
      400,
      "Body is required and must not exceed 10000 characters",
    );
  return { email, subject, body };
}
