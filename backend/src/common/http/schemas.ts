import { z } from 'zod';

export const uuid = (label: string) => z.uuid({ error: `${label} must be a valid UUID` });

/** Firestore auto-ids are 20 chars; accept any reasonable document id. */
export const messageId = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'messageId has an invalid format');

export const messageText = z
  .string({ error: 'text is required' })
  .trim()
  .min(1, 'text cannot be empty')
  .max(4000, 'text cannot exceed 4000 characters');

export const chatParams = z.object({ chatId: uuid('chatId') });

export const messageParams = chatParams.extend({ messageId });
