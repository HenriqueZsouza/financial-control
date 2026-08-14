import type { Category } from '../../../domain/category/category.js';

export interface CategoryRepository {
  list(): Promise<Category[]>;
  exists(id: string): Promise<boolean>;
}
