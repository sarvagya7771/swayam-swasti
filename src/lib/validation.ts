/** Pure form-validation helpers (unit tested in `validation.test.ts`). */

export const TESTIMONIAL_MIN = 20;
export const TESTIMONIAL_MAX = 1200;
export const PASSWORD_MIN = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Email is required.';
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Password is required.';
  if (value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (value.length > 200) return 'Password is too long.';
  return null;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

export function passwordStrength(value: string): PasswordStrength {
  if (!value) return { score: 0, label: 'Empty' };
  let score = 0;
  if (value.length >= PASSWORD_MIN) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const labels = ['Too short', 'Weak', 'Fair', 'Strong', 'Excellent'] as const;
  return { score: capped, label: labels[capped] };
}

export function validateFullName(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Please tell us your name.';
  if (name.length < 2) return 'Name is too short.';
  if (name.length > 80) return 'Name is too long.';
  return null;
}

/** Phone is optional; when provided it must look like a real number. */
export function validatePhone(value: string): string | null {
  const phone = value.trim();
  if (!phone) return null;
  if (!/^[+]?[\d\s()-]{7,20}$/.test(phone)) return 'Enter a valid phone number.';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return 'Enter a valid phone number.';
  return null;
}

export interface TestimonialInput {
  rating: number;
  content: string;
}

export type FieldErrors = Record<string, string>;

export function validateTestimonial(input: TestimonialInput): FieldErrors {
  const errors: FieldErrors = {};
  const content = input.content.trim();

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.rating = 'Choose a rating from 1 to 5 stars.';
  }
  if (!content) {
    errors.content = 'Please share a few words about your experience.';
  } else if (content.length < TESTIMONIAL_MIN) {
    errors.content = `Please write at least ${TESTIMONIAL_MIN} characters.`;
  } else if (content.length > TESTIMONIAL_MAX) {
    errors.content = `Please keep it under ${TESTIMONIAL_MAX} characters.`;
  }
  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Public testimonials show a first name only — never the full identity of
 * the customer who wrote them.
 */
export function displayAuthorName(fullName: string, email: string): string {
  const name = fullName.trim();
  if (name) {
    const first = name.split(/\s+/)[0];
    return first.length > 0 ? first : 'A seeker';
  }
  const handle = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  if (handle) {
    const first = handle.split(/\s+/)[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  }
  return 'A seeker';
}
