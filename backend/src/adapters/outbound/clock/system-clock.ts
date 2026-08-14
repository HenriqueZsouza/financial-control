import type { Clock } from '../../../application/ports/outbound/security.js';
export class SystemClock implements Clock { now() { return new Date(); } }
