'use client';

import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { z } from 'zod';
import { AuthLayout } from '../../components/AuthLayout';
import { Feedback } from '../../components/Feedback';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';

const schema = z.object({
  email: z.string().email('Informe um email válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const registered = searchParams.has('registered');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const check = schema.safeParse(raw);
    if (!check.success) return setError(check.error.issues[0].message);
    setPending(true);
    try {
      await login(check.data.email, check.data.password);
      router.replace('/');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Não foi possível entrar agora.');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      headline="Uma visão mais tranquila do seu dinheiro."
      support="Organize entradas, despesas e metas do dia a dia em um único lugar."
      footer="Controle financeiro familiar · v1 local"
    >
      <Stack component="form" onSubmit={submit} spacing={2.5}>
        <div>
          <Typography variant="h1" component="h2" sx={{ mb: 1 }}>
            Boas-vindas
          </Typography>
          <Typography color="text.secondary">Entre para acompanhar sua vida financeira.</Typography>
        </div>
        <Feedback error={error} success={registered ? 'Cadastro realizado. Agora, entre com seus dados.' : null} />
        <TextField name="email" label="Email" type="email" autoComplete="email" placeholder="voce@email.com" />
        <TextField name="password" label="Senha" type="password" autoComplete="current-password" placeholder="Sua senha" />
        <Button type="submit" variant="contained" disabled={pending} size="large">
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
        <Typography color="text.secondary" textAlign="center">
          Ainda não tem uma conta?{' '}
          <Link component={NextLink} href="/cadastro" underline="always" color="inherit" fontWeight={600}>
            Crie sua conta
          </Link>
        </Typography>
      </Stack>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
