'use client';

import type { PaletteMode } from '@mui/material';
import { createContext, useContext } from 'react';

type ColorModeContextValue = {
  mode: PaletteMode;
  toggleColorMode: () => void;
};

export const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode() {
  const context = useContext(ColorModeContext);

  if (!context) {
    throw new Error('useColorMode deve ser usado dentro de Providers.');
  }

  return context;
}
