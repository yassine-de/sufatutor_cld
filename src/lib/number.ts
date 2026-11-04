// Parses a number typed by a person: Arabic-Indic digits, decimal comma or Arabic decimal mark.
export function parseNumber(input: string): number | null {
  const latin = input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace("٫", ".")
    .replace(",", ".")
    .trim();
  return /^-?\d+(\.\d+)?$/.test(latin) ? Number(latin) : null;
}
