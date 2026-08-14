import type { ListCategories } from '../../ports/inbound/categories.js';
import type { CategoryRepository } from '../../ports/outbound/category-repository.js';
export class ListCategoriesUseCase implements ListCategories {
  constructor(private readonly categories: CategoryRepository) {}
  execute() { return this.categories.list(); }
}
