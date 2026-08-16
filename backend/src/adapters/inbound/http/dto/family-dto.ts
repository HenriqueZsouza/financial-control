import { z } from 'zod';
export const inviteFamilySchema = z.object({ email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()) });
export const familyIdSchema = z.coerce.number().int().positive();
export const notificationQuerySchema = z.object({ unreadOnly: z.enum(['true', 'false']).optional() });
