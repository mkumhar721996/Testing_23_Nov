import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { configureApi } from './api/client';
import { createMsalAuthClient } from './auth/msalAuthClient';
import './index.css';

const client = createMsalAuthClient();
configureApi(client);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App client={client} />
    </BrowserRouter>
  </StrictMode>,
);
