import type { NextFunction, Request, Response } from 'express';
import type { GetCurrentUser, LoginUser, RegisterUser } from '../../../../application/ports/inbound/auth.js';
import { loginSchema, registerSchema } from '../dto/auth-dto.js';
export class AuthController {
  constructor(private readonly registerUser: RegisterUser, private readonly loginUser: LoginUser, private readonly getCurrentUser: GetCurrentUser) {}
  register = async (req: Request, res: Response, next: NextFunction) => { try { const { confirmPassword: _confirm, ...input } = registerSchema.parse(req.body); res.status(201).json({ user: await this.registerUser.execute(input) }); } catch (error) { next(error); } };
  login = async (req: Request, res: Response, next: NextFunction) => { try { res.json(await this.loginUser.execute(loginSchema.parse(req.body))); } catch (error) { next(error); } };
  me = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ user: await this.getCurrentUser.execute(req.userId!) }); } catch (error) { next(error); } };
}
