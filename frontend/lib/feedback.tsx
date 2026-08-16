'use client';

import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Severity = 'success' | 'error' | 'warning' | 'info';
type FeedbackContextValue = { notify: (message: string, severity?: Severity) => void };

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({ open: false, message: '', severity: 'success' as Severity });
  const notify = useCallback((message: string, severity: Severity = 'success') => {
    setState({ open: true, message, severity });
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={4000}
        onClose={() => setState((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={state.severity}
          variant="filled"
          onClose={() => setState((current) => ({ ...current, open: false }))}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback deve ser usado dentro de FeedbackProvider');
  return context;
}
