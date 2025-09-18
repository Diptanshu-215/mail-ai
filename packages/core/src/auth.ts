import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getEnv } from './env';

interface JWTPayload {
  sub: string; // user id
  email: string;
  iat?: number;
  exp?: number;
}

export function signUserToken(user: { id: string; email: string }) {
  const env = getEnv();
  return jwt.sign({ sub: user.id, email: user.email } as JWTPayload, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyUserToken(token: string): JWTPayload | null {
  const env = getEnv();
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Placeholder symmetric encryption for provider tokens (NOT production secure)
// In production use a proper KMS or libsodium sealed boxes.
export function encryptToken(raw: string, secret?: string) {
  const env = getEnv();
  const key = crypto.createHash('sha256').update(secret || env.SESSION_SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptToken(encB64: string, secret?: string) {
  const env = getEnv();
  try {
    const buf = Buffer.from(encB64, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const key = crypto.createHash('sha256').update(secret || env.SESSION_SECRET).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}
