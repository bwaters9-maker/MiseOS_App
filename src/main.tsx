import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from "./App.tsx";
import { APP_NAME, APP_SHORT_DESC } from './lib/appParams';
import './index.css';

// Errors only — no performance tracing (tracesSampleRate unset) and no
// session replay (replayIntegration never added). A DSN is not a secret,
// but it still comes from .env rather than being hardcoded.
//
// Production builds only. A DSN in .env is inlined into the dev bundle
// too, so without this gate every local crash would burn free-tier
// quota. Either condition failing skips init entirely and leaves every
// Sentry call downstream an inert no-op.
//
// MODE, not PROD: .env carries NODE_ENV=development (server.ts requires
// it), and Vite derives PROD/DEV from process.env.NODE_ENV — so PROD is
// false even under `npm run build` in this repo, and gating on it would
// disable Sentry in production. MODE is set by the Vite command itself:
// 'production' for `vite build`, 'development' for the dev middleware.
const isProdBuild = import.meta.env.MODE === 'production';
const sentryDsn = isProdBuild ? import.meta.env.VITE_SENTRY_DSN : undefined;
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
