'use client';

import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { z } from 'zod';
import { AuthLayout } from '../../components/AuthLayout';
import { Feedback } from '../../components/Feedback';
import { ApiError, services } from '../../lib/api';

const schema = z
  .object({
    firstName: z.string().min(1, 'Informe seu nome.'),
    lastName: z.string().min(1, 'Informe seu sobrenome.'),
    email: z.string().email('Informe um email válido.'),
    phone: z.string().min(8, 'Informe um telefone válido.'),
    password: z.string().min(8, 'A senha deve ter 8 caracteres ou mais.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem.' });

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const raw = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const check = schema.safeParse(raw);
    if (!check.success) return setError(check.error.issues[0].message);
    setPending(true);
    try {
      await services.register(check.data);
      router.replace('/login?registered=1');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Não foi possível criar sua conta.');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      headline="Comece pelo que importa para você."
      support="Seu histórico fica separado e acessível somente na sua conta."
      footer="Dados financeiros organizados, sem complicação."
    >
      <Stack component="form" onSubmit={submit} spacing={2.5}>
        <div>
          <Typography variant="h1" component="h2" sx={{ mb: 1 }}>
            Crie sua conta
          </Typography>
          <Typography color="text.secondary">Preencha os dados abaixo para começar.</Typography>
        </div>
        <Feedback error={error} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField name="firstName" label="Nome" />
          <TextField name="lastName" label="Sobrenome" />
        </Stack>
        <TextField name="email" label="Email" type="email" />
        <TextField name="phone" label="Telefone" inputMode="tel" placeholder="(11) 99999-9999" />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField name="password" label="Senha" type="password" autoComplete="new-password" />
          <TextField name="confirmPassword" label="Confirmar senha" type="password" autoComplete="new-password" />
        </Stack>
        <Button type="submit" variant="contained" disabled={pending} size="large">
          {pending ? 'Criando…' : 'Criar conta'}
        </Button>
        <Typography color="text.secondary" textAlign="center">
          Já possui conta?{' '}
          <Link component={NextLink} href="/login" underline="always" color="inherit" fontWeight={600}>
            Entrar
          </Link>
        </Typography>
      </Stack>
    </AuthLayout>
  );
}
