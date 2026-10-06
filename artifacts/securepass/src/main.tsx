import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

createRoot(document.getElementById('root')!, {
  // Do not send error objects to the console; exceptions can contain user input.
  onCaughtError: () => {},
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
