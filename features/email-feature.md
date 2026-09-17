# Email feature proposal

## Goal

Send a transactional welcome email after a user successfully registers. This is
currently a future feature and is not yet implemented.

## Recommended providers

- Production: Resend through its HTTP/Node.js API.
- Local development: Mailpit running in Docker with a browser inbox for safely
  inspecting messages.
- Application code must depend on an internal `EmailService` interface instead
  of a provider-specific implementation. This allows Resend to be replaced
  without changing registration logic.

## Proposed API structure

    api/
      core/email/
        email-service.interface.ts
        resend-email.service.ts
        mailpit-email.service.ts
      email/templates/
        registration-success.html
        registration-success.txt

The provider selection and provider construction should remain outside endpoint
handlers. The registration handler should call one provider-independent email
service method.

## Configuration

Use environment variables and never commit API keys:

    EMAIL_PROVIDER=resend
    EMAIL_FROM=My Hike <hello@myhike.example>
    RESEND_API_KEY=...

For local development, add Mailpit to `docker-compose.yml` and configure its
SMTP host and port through environment variables.

## Sending domain

Production email must be sent from a domain owned by the application. Configure
and verify SPF and DKIM records with the provider. DMARC is also recommended.
Prefer a dedicated sending subdomain to isolate email reputation.

## Registration flow

1. Validate the registration request.
2. Hash the password and commit the user and default settings to MariaDB.
3. After the database transaction succeeds, request the welcome email.
4. Use an idempotency key based on the registration/user ID to avoid duplicate
   messages when a request is retried.
5. Log sending failures through `LogWrapper` or the API logging abstraction.

Registration must not be rolled back only because the email provider is
temporarily unavailable. The account remains successfully created.

## Delivery reliability

The initial implementation may send directly after registration. Before relying
on email for critical account operations, add an `email_outbox` table and a
worker that retries failed messages with backoff. Store message status, attempt
count, last error, creation time, and sent time.

Provider webhooks can later update delivery, bounce, and complaint status.
Webhook signatures must be verified before accepting an event.

## Welcome message

Provide both HTML and plain-text versions. The message should:

- confirm successful registration;
- greet the user by registered name;
- link to the application login page;
- explain that the address is not a reply/support channel when applicable;
- use the My Hike branding and remain readable without images.

User-facing email text should support the same languages as the frontend. Store
the selected language with the user or pass it as part of the registration
context before localized templates are introduced.

## Email confirmation

New accounts are stored with `email_confirmed = 0`. Registration creates a
cryptographically random, single-use confirmation token, stores only its
SHA-256 hash, and emails a frontend link in the user's selected language. The
link expires after 24 hours. The frontend exchanges it through
`POST /api/auth/confirm-email`; only then is login allowed. A rate-limited
`POST /api/auth/resend-confirmation` endpoint replaces outstanding tokens and
always returns a generic response to prevent account discovery. Existing users
are marked confirmed by migration `006_add_email_confirmation.sql`.

## Security and operational requirements

- Keep provider credentials only in environment/secrets storage.
- Escape all user-provided values inserted into HTML templates.
- Rate-limit registration and resend operations.
- Do not log passwords, access tokens, email tokens, or provider API keys.
- Avoid exposing whether arbitrary email addresses exist outside appropriate
  authenticated flows.
- Update `api/openapi.yaml` whenever email-related API endpoints are introduced.

## Definition of done for the first implementation

- Mailpit is available through Docker for local testing.
- A provider-independent `EmailService` exists.
- Resend and local Mailpit implementations are configurable.
- Registration queues or sends one localized welcome message after commit.
- Email failure is logged and does not remove the registered account.
- Automated tests cover success, provider failure, and duplicate-request
  behavior.
- `api/.env.example`, API documentation, and `api/openapi.yaml` are updated.

## References

- Resend Node.js: https://resend.com/nodejs
- Resend send-email API: https://resend.com/docs/api-reference/emails/send-email
- Resend domain configuration: https://resend.com/docs/dashboard/domains/introduction
