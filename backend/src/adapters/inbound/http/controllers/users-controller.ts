import type { NextFunction, Request, Response } from 'express';
import type { UpdateCurrentUser } from '../../../../application/ports/inbound/auth.js';
import { updateUserSchema } from '../dto/auth-dto.js';
export class UsersController {
  constructor(private readonly updateCurrentUser: UpdateCurrentUser) {}
  updateMe = async (req: Request, res: Response, next: NextFunction) => { try { const { confirmPassword: _confirm, ...input } = updateUserSchema.parse(req.body); res.json({ user: await this.updateCurrentUser.execute(req.userId!, input) }); } catch (error) { next(error); } };
}
