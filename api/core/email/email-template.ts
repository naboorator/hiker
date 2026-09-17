import { readFile } from "node:fs/promises";
import type { EmailLanguage } from "../../interface/email-language.type.js";
import type { EmailMessage } from "../../interface/email-message.interface.js";

type TemplateName =
  "registration-success" | "password-reset" | "confirm-registration";

const subjects: Record<EmailLanguage, Record<TemplateName, string>> = {
  en: {
    "registration-success": "Welcome to My Hike",
    "password-reset": "Reset your My Hike password",
    "confirm-registration": "Confirm your My Hike registration",
  },
  si: {
    "registration-success": "Dobrodošli v My Hike",
    "password-reset": "Ponastavite geslo za My Hike",
    "confirm-registration": "Potrdite registracijo v My Hike",
  },
};

export function emailLanguage(value: unknown): EmailLanguage {
  return value === "si" ? "si" : "en";
}

export async function renderEmail(
  template: TemplateName,
  language: EmailLanguage,
  to: string,
  idempotencyKey: string,
  variables: Record<string, string>,
): Promise<EmailMessage> {
  const directory = new URL(
    `../../email/templates/${language}/`,
    import.meta.url,
  );
  const [htmlTemplate, textTemplate] = await Promise.all([
    readFile(new URL(`${template}.html`, directory), "utf8"),
    readFile(new URL(`${template}.txt`, directory), "utf8"),
  ]);
  return {
    to,
    subject: subjects[language][template],
    html: replaceVariables(htmlTemplate, variables, true),
    text: replaceVariables(textTemplate, variables, false),
    idempotencyKey,
  };
}

function replaceVariables(
  template: string,
  variables: Record<string, string>,
  escapeHtmlValues: boolean,
): string {
  return template.replace(/{{([a-zA-Z]+)}}/g, (_match, key: string) => {
    const value = variables[key] ?? "";
    return escapeHtmlValues ? escapeHtml(value) : value;
  });
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character,
  );
}
