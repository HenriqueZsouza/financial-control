'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { icons, EyeIcon, EyeOffIcon } from '../../components/icons';

const groups: { label: string; links: { href: string; icon: keyof typeof icons; label: string }[] }[] = [
  { label: 'Visão', links: [{ href: '/', icon: 'home', label: 'Início' }] },
  {
    label: 'Movimentações',
    links: [
      { href: '/lancamentos/novo', icon: 'plus', label: 'Cadastrar lançamento' },
      { href: '/lancamentos', icon: 'list', label: 'Lançamentos' },
      { href: '/relatorios', icon: 'chart', label: 'Relatório geral' },
    ],
  },
  {
    label: 'Em breve',
    links: [
      { href: '/cartao-credito', icon: 'card', label: 'Cartão de crédito' },
      { href: '/contas-a-pagar', icon: 'clock', label: 'Contas a pagar' },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, valuesVisible, setValuesVisible } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);
  if (loading || !user) return <div className="loading">Carregando sua conta…</div>;
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  const isActive = (href: string) =>
    pathname === href ||
    (href === '/lancamentos' && pathname.startsWith('/lancamentos/') && pathname !== '/lancamentos/novo');

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">$</span> Financial Control
        </div>
        <nav className="nav">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label eyebrow">{group.label}</span>
              {group.links.map((link) => {
                const Icon = icons[link.icon];
                return (
                  <Link key={link.href} href={link.href} className={isActive(link.href) ? 'active' : ''}>
                    <Icon />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <p className="sidebar-note">Os valores ficam ocultos por padrão a cada sessão. Use o olho para revelá-los.</p>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="icon-btn"
            aria-pressed={valuesVisible}
            aria-label={valuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
            title={valuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
            onClick={() => setValuesVisible(!valuesVisible)}
          >
            {valuesVisible ? <EyeIcon /> : <EyeOffIcon />}
          </button>
          <span className="topbar-divider" />
          <div className="user-menu">
            <div className="avatar">{initials}</div>
            <Link className="top-link" href="/perfil">
              Perfil
            </Link>
            <button
              className="logout"
              onClick={() => {
                logout();
                router.replace('/login');
              }}
            >
              Sair
            </button>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
