import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

export function Feedback({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null;
  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
    </Stack>
  );
}
