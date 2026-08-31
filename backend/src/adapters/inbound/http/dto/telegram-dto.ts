import { z } from 'zod';

const identifier = z.union([z.string(), z.number(), z.bigint()]).transform((value) => String(value));
export const telegramWebhookSchema = z.object({
  update_id: identifier,
  message: z.object({
    message_id: z.number().int().optional(),
    text: z.string().max(4096).optional(),
    chat: z.object({ id: identifier, type: z.string() }),
    from: z.object({ id: identifier, username: z.string().max(64).optional(), first_name: z.string().max(128).optional(), is_bot: z.boolean().optional() }).optional(),
  }).optional(),
  callback_query: z.object({
    id: z.string().min(1).max(128), data: z.string().max(128).optional(),
    from: z.object({ id: identifier, username: z.string().max(64).optional(), first_name: z.string().max(128).optional(), is_bot: z.boolean().optional() }),
    message: z.object({ chat: z.object({ id: identifier, type: z.string() }) }).optional(),
  }).optional(),
}).passthrough();
