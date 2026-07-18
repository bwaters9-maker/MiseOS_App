import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App.tsx";
import { APP_NAME, APP_SHORT_DESC } from './lib/appParams';
import './index.css';

document.title = `${APP_NAME} - ${APP_SHORT_DESC}`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);