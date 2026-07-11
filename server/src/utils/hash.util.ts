import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text string (password, OTP, etc.) using bcrypt.
 * Cost factor 12 — secure but not excessively slow on modern hardware.
 */
export async function hashValue(value: string): Promise<string> {
  return bcrypt.hash(value, SALT_ROUNDS);
}

/**
 * Compare a plain-text value against a bcrypt hash.
 * Returns true if they match.
 */
export async function compareValue(plainValue: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainValue, hash);
}

/**
 * Generate a cryptographically random numeric OTP of the given length.
 */
export function generateOtp(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

/**
 * Generate a hash of an OTP for secure storage.
 * Returns { otp, hash } — store the hash, send the otp.
 */
export async function generateAndHashOtp(length: number = 6): Promise<{ otp: string; hash: string }> {
  const otp = generateOtp(length);
  const hash = await hashValue(otp);
  return { otp, hash };
}
