'use client';

import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { FormEvent, useState } from 'react';
import { z } from 'zod';
import { Feedback } from '../../../components/Feedback';
import { PageHeader } from '../../../components/PageHeader';
import { ApiError, services } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useFeedback } from '../../../lib/feedback';

const schema = z
  .object({
    firstName: z.string().min(1, 'Informe seu nome.'),
    lastName: z.string().min(1, 'Informe seu sobrenome.'),
    phone: z.string().min(8, 'Informe um telefone válido.'),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .refine((data) => !data.password || data.password.length >= 8, {
    path: ['password'],
    message: 'A nova senha deve ter ao menos 8 caracteres.',
  })
  .refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem.' });

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { notify } = useFeedback();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!user) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const checked = schema.safeParse(raw);
    if (!checked.success) return setError(checked.error.issues[0].message);
    const data: Record<string, string> = {
      firstName: checked.data.firstName,
      lastName: checked.data.lastName,
      phone: checked.data.phone,
    };
    if (checked.data.password) {
      data.password = checked.data.password;
      data.confirmPassword = checked.data.confirmPassword;
    }
    setPending(true);
    try {
      const result = await services.updateProfile(data);
      setUser(result.user);
      (form.elements.namedItem('password') as HTMLInputElement).value = '';
      (form.elements.namedItem('confirmPassword') as HTMLInputElement).value = '';
      notify('Perfil atualizado.');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Não foi possível atualizar o perfil.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Conta" title="Meu perfil" description="Mantenha seus dados pessoais atualizados." />
      <Paper
        component="form"
        onSubmit={submit}
        sx={{ maxWidth: 720, p: 3.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Feedback error={error} />
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField name="firstName" label="Nome" defaultValue={user.firstName} />
            <TextField name="lastName" label="Sobrenome" defaultValue={user.lastName} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField name="email" label="Email" value={user.email} disabled />
            <TextField name="phone" label="Telefone" defaultValue={user.phone} />
          </Stack>
          <Divider />
          <Typography color="text.secondary" variant="body2">
            Preencha os campos abaixo somente se quiser trocar sua senha.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField name="password" label="Nova senha" type="password" autoComplete="new-password" />
            <TextField name="confirmPassword" label="Confirmar nova senha" type="password" autoComplete="new-password" />
          </Stack>
          <Stack direction="row" justifyContent="flex-end">
            <Button type="submit" variant="contained" disabled={pending}>
              {pending ? 'Salvando…' : 'Salvar perfil'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </>
  );
}
