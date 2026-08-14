import { randomUUID } from 'node:crypto';
import type { Clock, IdGenerator } from '../../../application/ports/outbound/security.js';
export class SystemClock implements Clock { now() { return new Date(); } }
export class UuidGenerator implements IdGenerator { generate() { return randomUUID(); } }
