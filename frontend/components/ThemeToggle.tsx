'use client';

import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useColorMode } from '../lib/color-mode';

export function ThemeToggle() {
  const { mode, toggleColorMode } = useColorMode();
  const isDark = mode === 'dark';
  const label = isDark ? 'Usar tema claro' : 'Usar tema escuro';

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={toggleColorMode}>
        {isDark ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}
