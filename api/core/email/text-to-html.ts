export function textToHtml(value: string): string {
  const escaped = value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character,
  );
  return `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escaped}</div>`;
}
