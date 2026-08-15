'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { tokens } from '../lib/theme';
import { PageHeader } from './PageHeader';

export function ComingSoon({
  eyebrow = 'Em breve',
  title,
  description,
  icon,
  body,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  body: string;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <Paper
        sx={{
          maxWidth: 560,
          p: { xs: 5, sm: 7 },
          textAlign: 'center',
          border: '1px dashed',
          borderColor: tokens.lineStrong,
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            width: 60,
            height: 60,
            mx: 'auto',
            mb: 2.25,
            borderRadius: '14px',
            bgcolor: tokens.surface2,
            color: tokens.inkSoft,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {icon}
        </Box>
        <Typography variant="h2" sx={{ mb: 1 }}>
          Em construção
        </Typography>
        <Typography color="text.secondary">{body}</Typography>
      </Paper>
    </>
  );
}
