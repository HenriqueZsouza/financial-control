'use client';
import Alert from '@mui/material/Alert';
export function Feedback({ error, success }: { error?: string | null; success?: string | null }) { if (!error && !success) return null; return <div className="alert"><Alert severity={error ? 'error' : 'success'}>{error ?? success}</Alert></div>; }
