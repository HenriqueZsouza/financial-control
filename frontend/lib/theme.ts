import { createTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import { ptBR } from '@mui/material/locale';
import { ptBR as pickersPtBR } from '@mui/x-date-pickers/locales';

/** Tese visual: a cor saturada só aparece no dinheiro. O resto é tinta sobre papel. */
export const tokens = {
  paper: '#EEF1F4',
  surface: '#FFFFFF',
  surface2: '#F6F8F9',
  ink: '#14181F',
  inkSoft: '#384049',
  muted: '#6B7280',
  faint: '#9AA1AC',
  line: '#E6E9ED',
  lineStrong: '#D7DCE1',
  income: '#157F52',
  incomeSoft: '#E7F3EC',
  expense: '#C4353A',
  expenseSoft: '#FBECEB',
  categoryRamp: ['#8F2B2F', '#B0353A', '#C4353A', '#D1584F', '#DD7A6D', '#E69C8F', '#EFC0B5', '#F6DDD7'],
} as const;

const darkTokens = {
  paper: '#11161D',
  surface: '#1A212B',
  surface2: '#222B36',
  ink: '#E8EDF3',
  inkSoft: '#C2CAD4',
  muted: '#98A3B3',
  faint: '#778394',
  line: '#2B3542',
  lineStrong: '#3A4655',
} as const;

const fontBody = 'var(--font-body), Inter, system-ui, sans-serif';
const fontDisplay = 'var(--font-display), "Space Grotesk", system-ui, sans-serif';
const fontMono = 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace';

export function createAppTheme(mode: PaletteMode) {
  const palette = mode === 'dark' ? darkTokens : tokens;

  return createTheme(
    {
    palette: {
      mode,
      primary: { main: palette.ink, contrastText: mode === 'dark' ? '#11161D' : '#FFFFFF' },
      secondary: { main: palette.inkSoft, contrastText: mode === 'dark' ? '#11161D' : '#FFFFFF' },
      success: { main: tokens.income, light: tokens.incomeSoft, contrastText: '#FFFFFF' },
      error: { main: tokens.expense, light: tokens.expenseSoft, contrastText: '#FFFFFF' },
      background: { default: palette.paper, paper: palette.surface },
      text: { primary: palette.ink, secondary: palette.muted },
      divider: palette.line,
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: fontBody,
      h1: { fontFamily: fontDisplay, fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.15 },
      h2: { fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' },
      h3: { fontFamily: fontDisplay, fontSize: 15, fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none', fontSize: 14 },
      overline: {
        fontFamily: fontMono,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.14em',
        lineHeight: 1.4,
        color: palette.faint,
      },
      caption: { fontFamily: fontMono, fontSize: 12, letterSpacing: '0.02em', color: palette.muted },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: palette.paper, color: palette.ink },
          '::selection': { background: palette.ink, color: mode === 'dark' ? '#11161D' : '#FFFFFF' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { minHeight: 42, paddingInline: 18 } },
      },
      MuiButtonBase: {
        styleOverrides: {
          root: {
            '&.Mui-focusVisible': { outline: `2px solid ${palette.ink}`, outlineOffset: 2 },
          },
        },
      },
      MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
      MuiFormLabel: { styleOverrides: { root: { fontWeight: 600, color: palette.inkSoft } } },
      MuiPaper: { defaultProps: { elevation: 0 } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontFamily: fontMono,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: palette.faint,
            borderBottomColor: palette.line,
          },
          body: { borderBottomColor: palette.line, fontSize: 14 },
        },
      },
    },
    },
    ptBR,
    pickersPtBR,
  );
}
