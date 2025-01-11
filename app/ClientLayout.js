'use client';

import { ThemeProvider } from './contexts/ThemeContext';

export default function ClientLayout({ children }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
} 