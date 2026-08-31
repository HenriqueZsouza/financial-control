export interface PasswordHasher { hash(value: string): Promise<string>; compare(value: string, hash: string): Promise<boolean> }
export interface TokenIssuer { sign(userId: number): string; verify(token: string): number }
export interface Clock { now(): Date }
export interface IdGenerator { generate(): Promise<number> }
export interface SecretGenerator { generate(): string; hash(value: string): string; }
