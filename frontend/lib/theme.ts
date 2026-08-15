import { createTheme } from '@mui/material/styles';
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

const fontBody = 'var(--font-body), Inter, system-ui, sans-serif';
const fontDisplay = 'var(--font-display), "Space Grotesk", system-ui, sans-serif';
const fontMono = 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace';

export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: { main: tokens.ink, contrastText: '#FFFFFF' },
      secondary: { main: tokens.inkSoft, contrastText: '#FFFFFF' },
      success: { main: tokens.income, light: tokens.incomeSoft, contrastText: '#FFFFFF' },
      error: { main: tokens.expense, light: tokens.expenseSoft, contrastText: '#FFFFFF' },
      background: { default: tokens.paper, paper: tokens.surface },
      text: { primary: tokens.ink, secondary: tokens.muted },
      divider: tokens.line,
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
        color: tokens.faint,
      },
      caption: { fontFamily: fontMono, fontSize: 12, letterSpacing: '0.02em', color: tokens.muted },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: tokens.paper, color: tokens.ink },
          '::selection': { background: tokens.ink, color: '#FFFFFF' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { minHeight: 42, paddingInline: 18 } },
      },
      MuiButtonBase: {
        styleOverrides: {
          root: {
            '&.Mui-focusVisible': { outline: `2px solid ${tokens.ink}`, outlineOffset: 2 },
          },
        },
      },
      MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
      MuiFormLabel: { styleOverrides: { root: { fontWeight: 600, color: tokens.inkSoft } } },
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
            color: tokens.faint,
            borderBottomColor: tokens.line,
          },
          body: { borderBottomColor: tokens.line, fontSize: 14 },
        },
      },
    },
  },
  ptBR,
  pickersPtBR,
);
