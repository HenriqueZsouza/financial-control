export type Email = string & { readonly __brand: 'Email' };

export function emailOf(value: string): Email {
  return value.trim().toLowerCase() as Email;
}
