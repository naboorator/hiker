import bcrypt from "bcryptjs";
import type { Router } from "express";
import { authenticatedUserId } from "../../core/auth.js";
import { database } from "../../core/database.js";
import { HttpError } from "../../core/http-error.js";

export function registerAccountPutRoutes(router: Router): void {
  router.put("/account/password", async (request, response) => {
    const userId = authenticatedUserId(response);
    const { currentPassword, newPassword, repeatPassword } = passwordInput(
      request.body,
    );
    if (newPassword !== repeatPassword)
      throw new HttpError(400, "New passwords do not match");
    if (currentPassword === newPassword)
      throw new HttpError(
        400,
        "New password must be different from the current password",
      );

    const [user] = await database.query<{ passwordHash: string }[]>(
      "SELECT password_hash AS passwordHash FROM users WHERE id = ? AND status = 'active'",
      [userId],
    );
    if (!user) throw new HttpError(404, "User not found");
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new HttpError(400, "Current password is incorrect");
    }

    await database.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      await bcrypt.hash(newPassword, 12),
      userId,
    ]);
    response.status(204).send();
  });
}

function passwordInput(value: unknown): {
  currentPassword: string;
  newPassword: string;
  repeatPassword: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "A JSON object is required");
  }
  const body = value as Record<string, unknown>;
  const currentPassword =
    typeof body["currentPassword"] === "string" ? body["currentPassword"] : "";
  const newPassword =
    typeof body["newPassword"] === "string" ? body["newPassword"] : "";
  const repeatPassword =
    typeof body["repeatPassword"] === "string" ? body["repeatPassword"] : "";
  if (!currentPassword)
    throw new HttpError(400, "Current password is required");
  if (newPassword.length < 8)
    throw new HttpError(400, "New password must contain at least 8 characters");
  return { currentPassword, newPassword, repeatPassword };
}
