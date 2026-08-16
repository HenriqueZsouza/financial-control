'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { tokens } from '../lib/theme';

export function AuthLayout({
  headline,
  support,
  footer,
  children,
}: {
  headline: string;
  support: string;
  footer: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(320px, 1fr) minmax(420px, 1fr)' },
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 4, md: 8 },
          bgcolor: tokens.ink,
          color: tokens.paper,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 5,
          minHeight: { xs: 240, md: '100vh' },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 'auto -30% -45% auto',
            width: 520,
            height: 520,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 0 0 60px rgba(255,255,255,0.03), 0 0 0 140px rgba(255,255,255,0.02)',
            display: { xs: 'none', md: 'block' },
          },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative' }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '9px',
              bgcolor: '#fff',
              color: tokens.ink,
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font-display), "Space Grotesk", sans-serif',
              fontWeight: 700,
            }}
          >
            $
          </Box>
          <Typography sx={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif', fontWeight: 600, color: '#fff' }}>
            Financial Control
          </Typography>
        </Stack>
        <Box sx={{ position: 'relative' }}>
          <Typography
            component="h1"
            sx={{
              m: 0,
              maxWidth: '12ch',
              fontFamily: 'var(--font-display), "Space Grotesk", sans-serif',
              fontSize: { xs: 38, md: 56 },
              fontWeight: 600,
              lineHeight: 1.02,
              letterSpacing: '-0.035em',
              color: '#fff',
            }}
          >
            {headline}
          </Typography>
          <Typography sx={{ mt: 2, maxWidth: '44ch', color: '#AEB8C2', lineHeight: 1.65 }}>{support}</Typography>
        </Box>
        <Typography variant="caption" sx={{ position: 'relative', color: '#7F8B96', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {footer}
        </Typography>
      </Box>
      <Stack alignItems="center" justifyContent="center" sx={{ p: { xs: 3, md: 6 } }}>
        <Box sx={{ width: 'min(100%, 400px)' }}>{children}</Box>
      </Stack>
    </Box>
  );
}
