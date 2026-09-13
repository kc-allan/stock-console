import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
// Served from this app's own origin rather than a font CDN: one less host to reach on a
// patchy connection, and cached after the first visit.
import '@fontsource-variable/red-hat-text';
import '@fontsource-variable/red-hat-mono';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './features/auth/AuthProvider';
import { createQueryClient } from './lib/queryClient';
import { parseDelay, setSimulatedDelay } from './lib/simulatedDelay';

setSimulatedDelay(parseDelay(new URLSearchParams(window.location.search).get('delay')));

const queryClient = createQueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
