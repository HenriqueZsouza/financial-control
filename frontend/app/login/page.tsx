'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { z } from 'zod';
import { useAuth } from '../../lib/auth';
import { ApiError } from '../../lib/api';
import { Feedback } from '../../components/Feedback';

const schema = z.object({ email: z.string().email('Informe um email válido.'), password: z.string().min(1, 'Informe sua senha.') });
export default function LoginPage() {
  const router = useRouter(); const { login } = useAuth();
  const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false); const [registered, setRegistered] = useState(false);
  useEffect(() => setRegistered(new URLSearchParams(window.location.search).has('registered')), []);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(null); const raw = Object.fromEntries(new FormData(event.currentTarget)); const check = schema.safeParse(raw); if (!check.success) return setError(check.error.issues[0].message); setPending(true); try { await login(check.data.email, check.data.password); router.replace('/'); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Não foi possível entrar agora.'); } finally { setPending(false); } }
  return <main className="auth-page"><aside className="auth-aside"><div className="brand"><span className="brand-mark">$</span> Financial Control</div><div><h1>Uma visão mais tranquila do seu dinheiro.</h1><p>Organize entradas, despesas e metas do dia a dia em um único lugar.</p></div><small>Controle financeiro familiar · v1 local</small></aside><section className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><h2>Boas-vindas</h2><p>Entre para acompanhar sua vida financeira.</p><Feedback error={error} success={registered ? 'Cadastro realizado. Agora, entre com seus dados.' : null} /><div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="voce@email.com" /></div><div className="field"><label htmlFor="password">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Sua senha" /></div><button className="primary" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}</button><p className="form-foot">Ainda não tem uma conta? <Link className="link" href="/cadastro">Crie sua conta</Link></p></form></section></main>;
}
