export type StrengthLabel = 'Weak' | 'Medium' | 'Strong';

export interface PasswordStrength {
  score: number; // 0..4
  label: StrengthLabel;
  valid: boolean; // meets the minimum (>= 6 chars) to be allowed to continue
}

// Basic passwords (>= 6 chars) are allowed; strength is only a recommendation.
export function getPasswordStrength(pw: string): PasswordStrength {
  let raw = 0;
  if (pw.length >= 6) raw++;
  if (pw.length >= 10) raw++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) raw++;
  if (/\d/.test(pw)) raw++;
  if (/[^A-Za-z0-9]/.test(pw)) raw++;

  const score = Math.min(raw, 4);
  let label: StrengthLabel = 'Weak';
  if (score >= 4) label = 'Strong';
  else if (score >= 2) label = 'Medium';

  return { score, label, valid: pw.length >= 6 };
}
