import type { CategoryRepository } from '../../../application/ports/outbound/category-repository.js';
import type { Category } from '../../../domain/category/category.js';
import { prisma } from './prisma-client.js';
export class PrismaCategoryRepository implements CategoryRepository {
  list(): Promise<Category[]> { return prisma.category.findMany({ orderBy: { name: 'asc' } }); }
  async exists(id: number) { return Boolean(await prisma.category.findUnique({ where: { id }, select: { id: true } })); }
}
