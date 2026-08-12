export function Feedback({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null;
  return (
    <div className={`alert ${error ? 'alert-error' : 'alert-success'}`} role="alert">
      <span>{error ?? success}</span>
    </div>
  );
}
