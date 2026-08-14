export interface PasswordHasher { hash(value: string): Promise<string>; compare(value: string, hash: string): Promise<boolean> }
export interface TokenIssuer { sign(userId: string): string; verify(token: string): string }
export interface Clock { now(): Date }
export interface IdGenerator { generate(): string }
