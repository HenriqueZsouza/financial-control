'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={reset}>
          Tentar de novo
        </Button>
      }
    >
      {error.message || 'Não foi possível carregar esta página.'}
    </Alert>
  );
}
