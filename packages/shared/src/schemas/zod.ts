// Zod schemas
import { z } from 'zod';

// Auth schemas
export const PairingStartResponseSchema = z.object({
  pairingCode: z.string().length(6),
  expiresAt: z.string().datetime(),
  challengeId: z.string().uuid()
});

export const PairingVerifyRequestSchema = z.object({
  code: z.string().length(6),
  deviceInfo: z.object({
    platform: z.string(),
    userAgent: z.string(),
    appVersion: z.string()
  })
});

export const DeviceInfoSchema = z.object({
  platform: z.string(),
  userAgent: z.string(),
  appVersion: z.string()
});

// API schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string().datetime()
});

export const DeviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  platform: z.string().nullable(),
  userAgent: z.string().nullable(),
  permissions: z.array(z.string()),
  isActive: z.boolean(),
  lastSeenAt: z.string().datetime().nullable(),
  pairedAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable()
});

export const SessionSchema = z.object({
  id: z.string().uuid(),
  opencodeSessionId: z.string(),
  title: z.string().nullable(),
  status: z.enum(['active', 'archived', 'error']),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable()
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  metadata: z.object({
    agent: z.string().optional(),
    model: z.string().optional(),
    tokens: z.object({ input: z.number(), output: z.number() }).optional(),
    tools: z.array(z.object({
      name: z.string(),
      input: z.unknown(),
      output: z.unknown().optional(),
      error: z.string().optional(),
      durationMs: z.number().optional()
    })).optional(),
    error: z.string().optional()
  }).nullable(),
  opencodeMessageId: z.string().nullable(),
  createdAt: z.string().datetime()
});

// Inferred types (suffixed to avoid collisions with hand-written types in types/)
export type PairingStartResponseParsed = z.infer<typeof PairingStartResponseSchema>;
export type PairingVerifyRequestParsed = z.infer<typeof PairingVerifyRequestSchema>;
export type DeviceInfoParsed = z.infer<typeof DeviceInfoSchema>;
export type UserParsed = z.infer<typeof UserSchema>;
export type DeviceParsed = z.infer<typeof DeviceSchema>;
export type SessionParsed = z.infer<typeof SessionSchema>;
export type MessageParsed = z.infer<typeof MessageSchema>;