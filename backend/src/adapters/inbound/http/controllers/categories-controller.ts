import type { NextFunction, Request, Response } from 'express';
import type { ListCategories } from '../../../../application/ports/inbound/categories.js';
export class CategoriesController {
  constructor(private readonly listCategories: ListCategories) {}
  list = async (_req: Request, res: Response, next: NextFunction) => { try { res.json(await this.listCategories.execute()); } catch (error) { next(error); } };
}
