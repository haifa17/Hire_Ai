/**
 * Password rules, mirroring the backend DTOs (register, reset-password,
 * change-password): at least 8 characters with an uppercase letter, a
 * lowercase letter, a digit and a special character.
 */
export const MIN_PASSWORD_LENGTH = 8;

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

export function isStrongPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH && PASSWORD_PATTERN.test(password);
}
