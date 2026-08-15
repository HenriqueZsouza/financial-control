import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { money } from '../lib/format';
import { tokens } from '../lib/theme';

type Tone = 'income' | 'expense' | 'auto' | 'plain';

export function Amount({
  cents,
  visible,
  tone = 'plain',
  sign,
  sx,
}: {
  cents: number;
  visible: boolean;
  tone?: Tone;
  sign?: '+' | '−';
  sx?: SxProps<Theme>;
}) {
  const resolved = tone === 'auto' ? (cents >= 0 ? 'income' : 'expense') : tone;
  const color =
    resolved === 'income' ? tokens.income : resolved === 'expense' ? tokens.expense : tokens.ink;
  const body = sign ? `${sign} ${money(Math.abs(cents))}` : money(cents);

  return (
    <Box
      component="span"
      aria-hidden={!visible}
      aria-label={visible ? undefined : 'Valor oculto'}
      sx={{
        fontFamily: 'var(--font-display), "Space Grotesk", system-ui, sans-serif',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        color,
        filter: visible ? 'none' : 'blur(8px)',
        userSelect: visible ? 'auto' : 'none',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'filter 0.25s ease',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        ...((sx ?? {}) as object),
      }}
    >
      {body}
    </Box>
  );
}
