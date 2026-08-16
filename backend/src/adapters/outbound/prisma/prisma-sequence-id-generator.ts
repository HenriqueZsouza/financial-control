import type { IdGenerator } from '../../../application/ports/outbound/security.js';
import { prisma } from './prisma-client.js';

export class PrismaSequenceIdGenerator implements IdGenerator {
  async generate() {
    const [row] = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('installment_group_id_seq')`;
    return Number(row.nextval);
  }
}
