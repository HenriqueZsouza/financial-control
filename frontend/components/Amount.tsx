import { money } from '../lib/format';

type Tone = 'income' | 'expense' | 'auto' | 'plain';

export function Amount({
  cents,
  visible,
  tone = 'plain',
  sign,
  className = '',
}: {
  cents: number;
  visible: boolean;
  tone?: Tone;
  sign?: '+' | '−';
  className?: string;
}) {
  const resolved = tone === 'auto' ? (cents >= 0 ? 'income' : 'expense') : tone;
  const toneClass = resolved === 'income' ? 'income' : resolved === 'expense' ? 'expense' : '';
  const body = sign ? `${sign} ${money(Math.abs(cents))}` : money(cents);
  return (
    <span
      className={`amount-value ${toneClass} ${visible ? '' : 'is-private'} ${className}`.trim()}
      aria-hidden={!visible}
    >
      {body}
    </span>
  );
}
