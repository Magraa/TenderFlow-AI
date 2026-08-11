import { PasswordAuthSettings, Settings } from '@/types';

const HASH_ALGORITHM = 'SHA-256';
const KEY_ALGORITHM = 'PBKDF2';
const KEY_LENGTH = 256;
const DEFAULT_ITERATIONS = 210_000;
const SALT_BYTES = 16;

export const SITE_PASSWORD_SESSION_KEY = 'tender-automation-password-session';

function getSubtleCrypto(): SubtleCrypto {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Secure password checks require browser crypto support.');
  }
  return window.crypto.subtle;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function deriveHash(password: string, salt: string, iterations: number): Promise<string> {
  const crypto = getSubtleCrypto();
  const encodedPassword = new TextEncoder().encode(password);
  const saltBytes = base64ToBytes(salt);
  const saltBuffer = saltBytes.buffer.slice(
    saltBytes.byteOffset,
    saltBytes.byteOffset + saltBytes.byteLength
  ) as ArrayBuffer;
  const keyMaterial = await crypto.importKey('raw', encodedPassword, KEY_ALGORITHM, false, ['deriveBits']);
  const derivedBits = await crypto.deriveBits(
    {
      name: KEY_ALGORITHM,
      hash: HASH_ALGORITHM,
      salt: saltBuffer,
      iterations,
    },
    keyMaterial,
    KEY_LENGTH
  );
  return bytesToBase64(new Uint8Array(derivedBits));
}

export function hasSitePassword(settings: Settings | null | undefined): boolean {
  const auth = settings?.passwordAuth;
  return Boolean(auth?.enabled && auth.passwordHash && auth.salt && auth.iterations);
}

export function validateNewPassword(password: string): string {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Use letters and numbers.';
  }
  return '';
}

export async function createPasswordAuthSettings(password: string): Promise<PasswordAuthSettings> {
  const saltBytes = new Uint8Array(SALT_BYTES);
  window.crypto.getRandomValues(saltBytes);
  const salt = bytesToBase64(saltBytes);
  return {
    enabled: true,
    passwordHash: await deriveHash(password, salt, DEFAULT_ITERATIONS),
    salt,
    iterations: DEFAULT_ITERATIONS,
    updatedAt: new Date().toISOString(),
  };
}

export async function verifySitePassword(password: string, auth: PasswordAuthSettings): Promise<boolean> {
  if (!auth.enabled || !auth.passwordHash || !auth.salt || !auth.iterations) return false;
  const hash = await deriveHash(password, auth.salt, auth.iterations);
  return timingSafeEqual(hash, auth.passwordHash);
}
