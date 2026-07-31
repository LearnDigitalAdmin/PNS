/**
 * Normalizes a Kenyan phone number to Paystack's expected international
 * format: +254XXXXXXXXX. Accepts local (07..., 01...), bare 254..., or
 * already-international +254... input. Mirrors the normalization logic
 * used across the live MyRegister Cloud Functions so M-Pesa STK pushes
 * behave the same way in every project.
 */
export function formatKenyanPhone(raw: string): string {
  let phone = raw.replace(/[\s-]/g, '');

  if (phone.startsWith('+254')) {
    return phone;
  }
  if (phone.startsWith('254')) {
    return '+' + phone;
  }
  if (phone.startsWith('0')) {
    return '+254' + phone.substring(1);
  }
  if (phone.startsWith('7') || phone.startsWith('1')) {
    return '+254' + phone;
  }
  if (phone.startsWith('+')) {
    // Has a + but not +254 — best effort, strip whatever country code was
    // guessed and force 254 since this platform only serves Kenya.
    return '+254' + phone.replace(/^\+\d{0,3}/, '');
  }
  // Unrecognized shape — return as-is so Paystack's own validation surfaces
  // the problem instead of us silently mangling it further.
  return phone;
}
