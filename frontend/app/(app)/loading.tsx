'use client';

import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function AppLoading() {
  return (
    <Stack alignItems="center" sx={{ py: 10, gap: 2 }}>
      <CircularProgress size={28} />
      <Typography variant="caption">Carregando…</Typography>
    </Stack>
  );
}
