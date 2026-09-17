import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Router } from "express";
import { createAccessToken } from "../../core/auth.js";
import {
  database,
  isDuplicateEntry,
  withTransaction,
} from "../../core/database.js";
import { HttpError } from "../../core/http-error.js";
import type {
  PublicUser,
  User,
  UserStatus,
} from "../../interface/user.interface.js";
import { toSqlDateTime } from "../../core/sql-date.js";
import { emailService } from "../../core/email/email.service.js";
import { deliverTemplatedEmailSafely } from "../../core/email/email-delivery.js";
import { emailLanguage } from "../../core/email/email-template.js";
import type { EmailLanguage } from "../../interface/email-language.type.js";
import { rateLimit } from "../../core/rate-limit.js";

const passwordResetExpiryMinutes = 30;
const emailConfirmationExpiryHours = 24;
const frontendUrl = process.env["FRONTEND_URL"] ?? "http://localhost:4200";
const registrationRateLimit = rateLimit(10, 15 * 60_000);
const passwordResetRateLimit = rateLimit(5, 15 * 60_000);
const confirmationRateLimit = rateLimit(3, 30 * 60_000);

export function registerAuthPostRoutes(router: Router): void {
  router.post(
    "/auth/register",
    registrationRateLimit,
    async (request, response) => {
      const { name, email, password, repeatPassword } = credentials(
        request.body,
        true,
      );
      const language = requestLanguage(request.body);
      if (password !== repeatPassword)
        throw new HttpError(400, "Passwords do not match");
      const normalizedEmail = email.toLowerCase();
      const confirmationToken = randomBytes(32).toString("base64url");
      const confirmationTokenId = randomUUID();
      const confirmationExpiresAt = new Date(
        Date.now() + emailConfirmationExpiryHours * 60 * 60_000,
      );
      const created: User = {
        id: randomUUID(),
        name,
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(password, 12),
        role: "normal_user",
        status: "active",
        createdAt: new Date().toISOString(),
      };
      try {
        await withTransaction(async (connection) => {
          await connection.query(
            `INSERT INTO users
               (id, name, email, password_hash, role, language, email_confirmed, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
            [
              created.id,
              created.name,
              created.email,
              created.passwordHash,
              created.role,
              language,
              toSqlDateTime(created.createdAt),
            ],
          );
          await connection.query(
            "INSERT INTO settings (user_id, app_name, owner_name) VALUES (?, ?, ?)",
            [created.id, "My hike log", created.name],
          );
          await connection.query(
            `INSERT INTO email_confirmation_tokens
               (id, user_id, token_hash, expires_at, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [
              confirmationTokenId,
              created.id,
              hashToken(confirmationToken),
              toSqlDateTime(confirmationExpiresAt.toISOString()),
            ],
          );
        });
      } catch (error) {
        if (isDuplicateEntry(error))
          throw new HttpError(
            409,
            "A user is already registered with this email",
          );
        throw error;
      }
      const user = created;
      await deliverTemplatedEmailSafely(
        emailService,
        "confirm-registration",
        language,
        created.email,
        `confirm-registration:${confirmationTokenId}`,
        {
          name: created.name,
          confirmationUrl: `${frontendUrl}/confirm-email?token=${encodeURIComponent(confirmationToken)}`,
          expiryHours: String(emailConfirmationExpiryHours),
        },
      );
      const { id, name: registeredName, email: registeredEmail, role } = user;
      response.status(201).json({
        user: { id, name: registeredName, email: registeredEmail, role },
      });
    },
  );

  router.post("/auth/login", async (request, response) => {
    const { email, password } = credentials(request.body, false);
    const [user] = await database.query<
      {
        id: string;
        name: string;
        email: string;
        passwordHash: string;
        role: User["role"];
        status: UserStatus;
        emailConfirmed: number;
        createdAt: string;
      }[]
    >(
      `SELECT id, name, email, password_hash AS passwordHash, role, status,
              email_confirmed AS emailConfirmed,
              CAST(created_at AS CHAR) AS createdAt
         FROM users WHERE email = ?`,
      [email.toLowerCase()],
    );
    if (
      !user ||
      user.status === "deleted" ||
      !(await bcrypt.compare(password, user.passwordHash))
    )
      throw new HttpError(401, "Invalid email or password");
    if (user.status === "blocked")
      throw new HttpError(403, "Your account is blocked");
    if (!user.emailConfirmed)
      throw new HttpError(
        403,
        "Email address has not been confirmed",
        "EMAIL_NOT_CONFIRMED",
      );
    response.json(authResponse(user));
  });

  router.post("/auth/confirm-email", async (request, response) => {
    const token = stringValue(objectBody(request.body), "token");
    if (!token) throw new HttpError(400, "Confirmation token is required");
    const confirmed = await withTransaction(async (connection) => {
      const [record] = await connection.query<{ id: string; userId: string }[]>(
        `SELECT t.id, t.user_id AS userId
           FROM email_confirmation_tokens t
           JOIN users u ON u.id = t.user_id
          WHERE t.token_hash = ? AND t.used_at IS NULL
            AND t.expires_at > NOW() AND u.status = 'active'
          FOR UPDATE`,
        [hashToken(token)],
      );
      if (!record) return false;
      await connection.query(
        "UPDATE users SET email_confirmed = 1, email_confirmed_at = NOW() WHERE id = ?",
        [record.userId],
      );
      await connection.query(
        "UPDATE email_confirmation_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
        [record.userId],
      );
      return true;
    });
    if (!confirmed)
      throw new HttpError(400, "Confirmation token is invalid or expired");
    response.status(204).send();
  });

  router.post(
    "/auth/resend-confirmation",
    confirmationRateLimit,
    async (request, response) => {
      const body = objectBody(request.body);
      const email = stringValue(body, "email").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new HttpError(400, "Valid email is required");
      const [user] = await database.query<
        {
          id: string;
          name: string;
          email: string;
          language: EmailLanguage;
        }[]
      >(
        `SELECT id, name, email, language FROM users
          WHERE email = ? AND status = 'active' AND email_confirmed = 0`,
        [email],
      );
      if (user) {
        const token = randomBytes(32).toString("base64url");
        const tokenId = randomUUID();
        const expiresAt = new Date(
          Date.now() + emailConfirmationExpiryHours * 60 * 60_000,
        );
        await withTransaction(async (connection) => {
          await connection.query(
            "UPDATE email_confirmation_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
            [user.id],
          );
          await connection.query(
            `INSERT INTO email_confirmation_tokens
               (id, user_id, token_hash, expires_at, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [
              tokenId,
              user.id,
              hashToken(token),
              toSqlDateTime(expiresAt.toISOString()),
            ],
          );
        });
        const language =
          body["language"] === undefined
            ? emailLanguage(user.language)
            : emailLanguage(body["language"]);
        await deliverTemplatedEmailSafely(
          emailService,
          "confirm-registration",
          language,
          user.email,
          `confirm-registration:${tokenId}`,
          {
            name: user.name,
            confirmationUrl: `${frontendUrl}/confirm-email?token=${encodeURIComponent(token)}`,
            expiryHours: String(emailConfirmationExpiryHours),
          },
        );
      }
      response.status(202).json({
        message:
          "If this account requires confirmation, a new email has been sent",
      });
    },
  );

  router.post(
    "/auth/forgot-password",
    passwordResetRateLimit,
    async (request, response) => {
      const body = objectBody(request.body);
      const email = stringValue(body, "email").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new HttpError(400, "Valid email is required");
      const requestedLanguage = body["language"];
      const [user] = await database.query<
        {
          id: string;
          name: string;
          email: string;
          language: EmailLanguage;
        }[]
      >(
        `SELECT id, name, email, language FROM users
        WHERE email = ? AND status = 'active'`,
        [email],
      );
      if (user) {
        const token = randomBytes(32).toString("base64url");
        const tokenHash = hashToken(token);
        const tokenId = randomUUID();
        const expiresAt = new Date(
          Date.now() + passwordResetExpiryMinutes * 60_000,
        );
        await withTransaction(async (connection) => {
          await connection.query(
            "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
            [user.id],
          );
          await connection.query(
            `INSERT INTO password_reset_tokens
             (id, user_id, token_hash, expires_at, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
            [
              tokenId,
              user.id,
              tokenHash,
              toSqlDateTime(expiresAt.toISOString()),
            ],
          );
        });
        const language =
          requestedLanguage === undefined
            ? emailLanguage(user.language)
            : emailLanguage(requestedLanguage);
        await deliverTemplatedEmailSafely(
          emailService,
          "password-reset",
          language,
          user.email,
          `password-reset:${tokenId}`,
          {
            name: user.name,
            resetUrl: `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`,
            expiryMinutes: String(passwordResetExpiryMinutes),
          },
        );
      }
      response.status(202).json({
        message:
          "If an active account uses this email, password reset instructions have been sent",
      });
    },
  );

  router.post("/auth/reset-password", async (request, response) => {
    const body = objectBody(request.body);
    const token = stringValue(body, "token");
    const password = stringValue(body, "password");
    const repeatPassword = stringValue(body, "repeatPassword");
    if (!token) throw new HttpError(400, "Reset token is required");
    if (password.length < 8)
      throw new HttpError(400, "Password must contain at least 8 characters");
    if (password !== repeatPassword)
      throw new HttpError(400, "Passwords do not match");
    const passwordHash = await bcrypt.hash(password, 12);
    const changed = await withTransaction(async (connection) => {
      const [record] = await connection.query<{ id: string; userId: string }[]>(
        `SELECT t.id, t.user_id AS userId
           FROM password_reset_tokens t
           JOIN users u ON u.id = t.user_id
          WHERE t.token_hash = ? AND t.used_at IS NULL
            AND t.expires_at > NOW() AND u.status = 'active'
          FOR UPDATE`,
        [hashToken(token)],
      );
      if (!record) return false;
      await connection.query(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [passwordHash, record.userId],
      );
      await connection.query(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
        [record.userId],
      );
      return true;
    });
    if (!changed) throw new HttpError(400, "Reset token is invalid or expired");
    response.status(204).send();
  });
}

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError(400, "A JSON object is required");
  return value as Record<string, unknown>;
}

function stringValue(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? body[key] : "";
}

function requestLanguage(value: unknown): EmailLanguage {
  return emailLanguage(objectBody(value)["language"]);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function credentials(value: unknown, registration: boolean) {
  const body = objectBody(value);
  const name = typeof body["name"] === "string" ? body["name"].trim() : "";
  const email = typeof body["email"] === "string" ? body["email"].trim() : "";
  const password = typeof body["password"] === "string" ? body["password"] : "";
  const repeatPassword =
    typeof body["repeatPassword"] === "string" ? body["repeatPassword"] : "";
  if (registration && !name) throw new HttpError(400, "Name is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(400, "Valid email is required");
  if (password.length < 8)
    throw new HttpError(400, "Password must contain at least 8 characters");
  return { name, email, password, repeatPassword };
}

function authResponse(user: User): { token: string; user: PublicUser } {
  const { id, name, email, role } = user;
  return {
    token: createAccessToken(id, role),
    user: { id, name, email, role },
  };
}
