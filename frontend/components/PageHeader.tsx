import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'flex-end' }}
      spacing={2}
      sx={{ mb: 3.5 }}
    >
      <Box>
        <Typography variant="overline">{eyebrow}</Typography>
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        {description ? (
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: '60ch' }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {action ? <Box sx={{ flex: 'none' }}>{action}</Box> : null}
    </Stack>
  );
}
