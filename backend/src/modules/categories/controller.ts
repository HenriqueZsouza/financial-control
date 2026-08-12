import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../shared/prisma';
export async function list(_req: Request, res: Response, next: NextFunction) {
  try { return res.json(await prisma.category.findMany({ orderBy: { name: 'asc' } })); }
  catch (error) { return next(error); }
}
