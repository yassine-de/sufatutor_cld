// Phone numbers are the parent's login (KONZEPT.md §9). Supabase needs E.164 (+212612345678).
// Moroccan numbers may be typed in national form; numbers from abroad (diaspora) need the +.

const ARABIC_INDIC_ZERO = 0x0660;

export function normalizePhone(input: string): string | null {
  let s = input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - ARABIC_INDIC_ZERO))
    .replace(/[\s().-]/g, "");

  if (s.startsWith("00")) s = `+${s.slice(2)}`;

  if (s.startsWith("+")) {
    s = s.replace(/^\+2120/, "+212"); // "+212 0612..." is a common slip
    if (s.startsWith("+212")) return /^\+212[67]\d{8}$/.test(s) ? s : null; // mobile only: codes go by SMS
    return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
  }

  const national = s.match(/^0?([67]\d{8})$/);
  return national ? `+212${national[1]}` : null;
}

// Masks the middle of a number for display: +212 6•• ••• 78
export function maskPhone(e164: string): string {
  return e164.length > 6 ? `${e164.slice(0, 4)}•••${e164.slice(-2)}` : e164;
}
