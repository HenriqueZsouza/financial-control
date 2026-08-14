import type { UserPublic } from '../../../domain/user/user.js';

export interface RegisterUserInput { firstName: string; lastName: string; email: string; phone: string; password: string }
export interface LoginUserInput { email: string; password: string }
export interface UpdateCurrentUserInput { firstName?: string; lastName?: string; phone?: string; password?: string }
export interface RegisterUser { execute(input: RegisterUserInput): Promise<UserPublic> }
export interface LoginUser { execute(input: LoginUserInput): Promise<{ token: string; user: UserPublic }> }
export interface GetCurrentUser { execute(userId: number): Promise<UserPublic> }
export interface UpdateCurrentUser { execute(userId: number, input: UpdateCurrentUserInput): Promise<UserPublic> }
