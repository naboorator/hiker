import assert from "node:assert/strict";
import { test } from "node:test";
import { deliverEmailSafely } from "../core/email/email-delivery.js";
import type { EmailService } from "../core/email/email-service.interface.js";
import { IdempotentEmailService } from "../core/email/idempotent-email.service.js";
import { renderEmail } from "../core/email/email-template.js";
import type { EmailMessage } from "../interface/email-message.interface.js";

const message: EmailMessage = {
  to: "walker@example.com",
  subject: "Test",
  html: "<p>Test</p>",
  text: "Test",
  idempotencyKey: "test:1",
};

test("successful email delivery returns true", async () => {
  const service: EmailService = { send: async () => undefined };
  assert.equal(await deliverEmailSafely(service, message), true);
});

test("provider failure is contained and returns false", async () => {
  const service: EmailService = {
    send: async () => {
      throw new Error("provider unavailable");
    },
  };
  assert.equal(await deliverEmailSafely(service, message), false);
});

test("duplicate idempotency key is sent only once", async () => {
  let sends = 0;
  const service = new IdempotentEmailService({
    send: async () => {
      sends += 1;
    },
  });
  await Promise.all([service.send(message), service.send(message)]);
  await service.send(message);
  assert.equal(sends, 1);
});

test("localized template escapes user HTML", async () => {
  const rendered = await renderEmail(
    "registration-success",
    "si",
    message.to,
    "welcome:1",
    {
      name: "<script>alert(1)</script>",
      loginUrl: "https://example.com/login",
    },
  );
  assert.match(rendered.subject, /Dobrodošli/);
  assert.doesNotMatch(rendered.html, /<script>/);
  assert.match(rendered.html, /&lt;script&gt;/);
});
