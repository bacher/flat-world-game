import React from 'react';
import ReactDOM from 'react-dom/client';

import './app/index.scss';
import { App } from './app/components/App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
