// JWT token utilities (RS256)
import { createSign, createVerify, randomBytes } from 'crypto';

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = require('crypto').generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { privateKey, publicKey };
}

export function signToken(payload: object, privateKey: string, expiresIn: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = parseDuration(expiresIn);
  const body = { ...payload, iat: now, exp: now + exp };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedBody = base64url(JSON.stringify(body));
  const sign = createSign('RSA-SHA256');
  sign.update(`${encodedHeader}.${encodedBody}`);
  sign.end();
  const signature = sign.sign(privateKey, 'base64').replace(/[+/=]/g, m => ({ '+': '-', '/': '_', '=': '' })[m] ?? m);
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

export function verifyToken(token: string, publicKey: string): object {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) throw new Error('Invalid token format');
  const verify = createVerify('RSA-SHA256');
  verify.update(`${headerB64}.${payloadB64}`);
  verify.end();
  const signature = Buffer.from(signatureB64.replace(/[-_]/g, m => ({ '-': '+', '_': '/' })[m] ?? m), 'base64');
  if (!verify.verify(publicKey, signature)) throw new Error('Invalid signature');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('jwt expired');
  return payload;
}

export function createRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return require('crypto').createHash('sha256').update(token).digest('hex');
}

function parseDuration(s: string): number {
  const m = s.match(/^(-?)(\d+)([smhd])$/);
  if (!m) throw new Error('Invalid duration');
  const neg = m[1] ?? '';
  const num = m[2] ?? '0';
  const unit = m[3] ?? 's';
  const mult: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return (neg === '-' ? -1 : 1) * parseInt(num) * (mult[unit] ?? 1);
}

function base64url(input: string): string {
  return Buffer.from(input).toString('base64').replace(/[+/=]/g, m => ({ '+': '-', '/': '_', '=': '' })[m] ?? m);
}