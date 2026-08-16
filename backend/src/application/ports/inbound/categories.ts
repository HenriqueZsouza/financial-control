import type { Category } from '../../../domain/category/category.js';
export interface ListCategories { execute(): Promise<Category[]> }
