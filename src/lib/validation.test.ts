import { describe, expect, it } from 'vitest';
import {
  displayAuthorName,
  hasErrors,
  TESTIMONIAL_MAX,
  TESTIMONIAL_MIN,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhone,
  validateTestimonial,
} from './validation';

describe('validateEmail', () => {
  it('rejects empty and malformed addresses', () => {
    expect(validateEmail('')).toBeTruthy();
    expect(validateEmail('not-an-email')).toBeTruthy();
    expect(validateEmail('a@b')).toBeTruthy();
  });

  it('accepts ordinary addresses', () => {
    expect(validateEmail('seeker@example.com')).toBeNull();
    expect(validateEmail('  name.surname@example.co.in  ')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('requires the minimum length', () => {
    expect(validatePassword('')).toBeTruthy();
    expect(validatePassword('short')).toBeTruthy();
    expect(validatePassword('longenough')).toBeNull();
  });
});

describe('validateFullName and validatePhone', () => {
  it('requires a real name', () => {
    expect(validateFullName('')).toBeTruthy();
    expect(validateFullName('A')).toBeTruthy();
    expect(validateFullName('Ananya Rao')).toBeNull();
  });

  it('allows an empty phone but rejects nonsense', () => {
    expect(validatePhone('')).toBeNull();
    expect(validatePhone('abc')).toBeTruthy();
    expect(validatePhone('+91 98765 43210')).toBeNull();
  });
});

describe('validateTestimonial', () => {
  it('requires a rating from 1 to 5', () => {
    const errors = validateTestimonial({ rating: 0, content: 'x'.repeat(40) });
    expect(errors.rating).toBeTruthy();
    expect(validateTestimonial({ rating: 5, content: 'x'.repeat(40) })).toEqual({});
  });

  it('enforces the content length window', () => {
    const short = validateTestimonial({ rating: 5, content: 'too short' });
    expect(short.content).toBeTruthy();

    const long = validateTestimonial({ rating: 5, content: 'x'.repeat(TESTIMONIAL_MAX + 1) });
    expect(long.content).toBeTruthy();

    const ok = validateTestimonial({ rating: 4, content: 'x'.repeat(TESTIMONIAL_MIN) });
    expect(hasErrors(ok)).toBe(false);
  });
});

describe('displayAuthorName', () => {
  it('publishes a first name only', () => {
    expect(displayAuthorName('Ananya Rao', 'ananya@example.com')).toBe('Ananya');
    expect(displayAuthorName('', 'seeker.name@example.com')).toBe('Seeker');
    expect(displayAuthorName('', '')).toBe('A seeker');
  });
});
