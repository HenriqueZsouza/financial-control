'use client';
import { FormEvent, useState } from 'react';
import { z } from 'zod';
import { Feedback } from '../../../components/Feedback';
import { ApiError, services } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!user) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const raw = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const checked = schema.safeParse(raw);
    if (!checked.success) return setError(checked.error.issues[0].message);
    const data: Record<string, string> = { firstName: checked.data.firstName, lastName: checked.data.lastName, phone: checked.data.phone };
    if (checked.data.password) {
      data.password = checked.data.password;
      data.confirmPassword = checked.data.confirmPassword;
    }
    setPending(true);
    try {
      const result = await services.updateProfile(data);
      setUser(result.user);
      setSuccess('Perfil atualizado com sucesso.');
      (event.target as HTMLFormElement).password.value = '';
      (event.target as HTMLFormElement).confirmPassword.value = '';
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Não foi possível atualizar o perfil.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Conta</span>
          <h1>Meu perfil</h1>
          <p>Mantenha seus dados pessoais atualizados.</p>
        </div>
      </div>
      <form className="form-card" onSubmit={submit}>
        <Feedback error={error} success={success} />
        <div className="fields-two">
          <div className="field">
            <label htmlFor="firstName">Nome</label>
            <input id="firstName" name="firstName" defaultValue={user.firstName} />
          </div>
          <div className="field">
            <label htmlFor="lastName">Sobrenome</label>
            <input id="lastName" name="lastName" defaultValue={user.lastName} />
          </div>
        </div>
        <div className="fields-two">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" value={user.email} disabled readOnly />
          </div>
          <div className="field">
            <label htmlFor="phone">Telefone</label>
            <input id="phone" name="phone" defaultValue={user.phone} />
          </div>
        </div>
        <hr className="form-divider" />
        <p className="hint">Preencha os campos abaixo somente se quiser trocar sua senha.</p>
        <div className="fields-two">
          <div className="field">
            <label htmlFor="password">Nova senha</label>
            <input id="password" name="password" type="password" autoComplete="new-password" />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirmar nova senha</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" />
          </div>
        </div>
        <div className="form-actions">
          <button className="primary" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar perfil'}
          </button>
        </div>
      </form>
    </>
  );
}
