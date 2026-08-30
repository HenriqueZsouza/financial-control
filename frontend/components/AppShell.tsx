'use client';

import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import FamilyRestroomOutlinedIcon from '@mui/icons-material/FamilyRestroomOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import Badge from '@mui/material/Badge';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useQuery } from '@tanstack/react-query';
import { services } from '../lib/api';
import { queryKeys } from '../lib/query-keys';
import { tokens } from '../lib/theme';

const DRAWER_WIDTH = 264;

const groups: {
  label: string;
  links: { href: string; label: string; icon: typeof HomeOutlinedIcon }[];
}[] = [
    { label: 'Visão', links: [{ href: '/', label: 'Início', icon: HomeOutlinedIcon }] },
    {
      label: 'Movimentações',
      links: [
        { href: '/lancamentos/novo', label: 'Cadastrar lançamento', icon: AddCircleOutlineIcon },
        { href: '/lancamentos', label: 'Lançamentos', icon: ReceiptLongOutlinedIcon },
        { href: '/relatorios', label: 'Relatório geral', icon: AssessmentOutlinedIcon },
        { href: '/cartao-credito', label: 'Cartão de crédito', icon: CreditCardOutlinedIcon },
        { href: '/contas-a-pagar', label: 'Contas a pagar', icon: ScheduleOutlinedIcon },
      ],
    },
    { label: 'Conta', links: [{ href: '/familia', label: 'Família', icon: FamilyRestroomOutlinedIcon }] },
  ];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, valuesVisible, setValuesVisible } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: notificationData } = useQuery({ queryKey: queryKeys.notifications, queryFn: services.notifications, staleTime: 30_000, refetchOnWindowFocus: true, enabled: Boolean(user) });
  const { data: pendingInvites } = useQuery({ queryKey: queryKeys.familyInvites, queryFn: services.receivedInvites, staleTime: 30_000, refetchOnWindowFocus: true, enabled: Boolean(user) });
  const pendingInviteCount = pendingInvites?.invites.length ?? 0;

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '100vh', gap: 2 }}>
        <CircularProgress size={28} />
        <Typography variant="caption">Carregando sua conta…</Typography>
      </Stack>
    );
  }

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  const isActive = (href: string) =>
    pathname === href ||
    (href === '/lancamentos' && pathname.startsWith('/lancamentos/') && pathname !== '/lancamentos/novo');

  const drawer = (
    <Stack sx={{ height: '100%', p: 2, gap: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '9px',
            bgcolor: tokens.ink,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-display), "Space Grotesk", sans-serif',
            fontWeight: 700,
          }}
        >
          $
        </Box>
        <Typography sx={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif', fontWeight: 600 }}>
          Financial Control
        </Typography>
      </Stack>
      <Box component="nav" sx={{ flex: 1 }}>
        {groups.map((group) => (
          <List
            key={group.label}
            subheader={
              <Typography variant="overline" sx={{ px: 1.5 }}>
                {group.label}
              </Typography>
            }
            sx={{ mb: 1 }}
          >
            {group.links.map((link) => {
              const Icon = link.icon;
              const selected = isActive(link.href);
              return (
                <ListItemButton
                  key={link.href}
                  component={NextLink}
                  href={link.href}
                  selected={selected}
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.25,
                    '&.Mui-selected': { bgcolor: tokens.ink, color: '#fff', '&:hover': { bgcolor: '#000' } },
                    '&.Mui-selected .MuiListItemIcon-root': { color: '#fff' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: selected ? '#fff' : 'text.secondary' }}>
                    {link.href === '/familia' && pendingInviteCount > 0 ? (
                      <Badge badgeContent={pendingInviteCount} color="error" max={99}>
                        <Icon fontSize="small" />
                      </Badge>
                    ) : (
                      <Icon fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText primary={link.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
                </ListItemButton>
              );
            })}
          </List>
        ))}
      </Box>
    </Stack>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' },
        }}
      >
        {drawer}
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="inherit"
          sx={{
            bgcolor: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(8px)',
            boxShadow: 'none',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ justifyContent: 'flex-end', gap: 0.5, minHeight: 68 }}>
            {isMobile ? (
              <IconButton aria-label="Abrir menu" onClick={() => setMobileOpen(true)} sx={{ mr: 'auto' }}>
                <MenuIcon />
              </IconButton>
            ) : null}
            <Tooltip title={valuesVisible ? 'Ocultar valores' : 'Mostrar valores'}>
              <IconButton
                aria-pressed={valuesVisible}
                aria-label={valuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
                onClick={() => setValuesVisible(!valuesVisible)}
              >
                {valuesVisible ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Notificações">
              <IconButton component={NextLink} href="/notificacoes" aria-label="Notificações">
                <Badge badgeContent={notificationData?.notifications.unreadCount ?? 0} color="error">
                  <NotificationsOutlinedIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5 }} />
            <Avatar sx={{ width: 36, height: 36, bgcolor: tokens.ink, fontSize: 12, fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
              {initials}
            </Avatar>
            <ButtonLink href="/perfil">Perfil</ButtonLink>
            <Button
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
            >
              Sair
            </Button>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: { xs: 2.5, md: 5 }, maxWidth: 1360, width: '100%' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Typography
      component={NextLink}
      href={href}
      sx={{
        px: 1.25,
        py: 1,
        color: 'text.secondary',
        fontSize: 14,
        fontWeight: 500,
        borderRadius: 1,
        '&:hover': { color: 'text.primary', bgcolor: tokens.surface2 },
      }}
    >
      {children}
    </Typography>
  );
}
