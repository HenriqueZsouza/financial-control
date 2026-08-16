export type PasswordHash = string & { readonly __brand: 'PasswordHash' };

export const passwordHashOf = (value: string): PasswordHash => value as PasswordHash;
