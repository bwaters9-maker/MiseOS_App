import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from "./App.tsx";
import { APP_NAME, APP_SHORT_DESC } from './lib/appParams';
import './index.css';

// Errors only — no performance tracing (tracesSampleRate unset) and no
// session replay (replayIntegration never added). A DSN is not a secret,
// but it still comes from .env rather than being hardcoded. Unset is the
// local-dev default: init is skipped entirely and every Sentry call
// downstream is an inert no-op.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
  });
}

document.title = `${APP_NAME} - ${APP_SHORT_DESC}`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
