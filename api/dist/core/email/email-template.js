import { readFile } from "node:fs/promises";
const subjects = {
    en: {
        "registration-success": "Welcome to My Hike",
        "password-reset": "Reset your My Hike password",
    },
    si: {
        "registration-success": "Dobrodošli v My Hike",
        "password-reset": "Ponastavite geslo za My Hike",
    },
};
export function emailLanguage(value) {
    return value === "si" ? "si" : "en";
}
export async function renderEmail(template, language, to, idempotencyKey, variables) {
    const directory = new URL(`../../email/templates/${language}/`, import.meta.url);
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
function replaceVariables(template, variables, escapeHtmlValues) {
    return template.replace(/{{([a-zA-Z]+)}}/g, (_match, key) => {
        const value = variables[key] ?? "";
        return escapeHtmlValues ? escapeHtml(value) : value;
    });
}
function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
