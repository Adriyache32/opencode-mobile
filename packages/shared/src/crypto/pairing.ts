// Pairing code crypto utilities
import bcrypt from 'bcrypt';

export function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashPairingCode(code: string): { hash: string; salt: string } {
  const salt = bcrypt.genSaltSync(12);
  const hash = bcrypt.hashSync(code, salt);
  return { hash, salt };
}

export function verifyPairingCode(code: string, hash: string): boolean {
  return bcrypt.compareSync(code, hash);
}