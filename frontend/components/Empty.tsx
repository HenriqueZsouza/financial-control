import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function Empty({ children = 'Nenhum dado encontrado para este período.' }: { children?: React.ReactNode }) {
  return (
    <Stack alignItems="center" sx={{ py: 6, px: 2, textAlign: 'center' }}>
      <Typography color="text.secondary">{children}</Typography>
    </Stack>
  );
}
