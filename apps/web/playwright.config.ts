import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    // Dummy values: the e2e test only checks where the sign-in redirect points.
    env: {
      VITE_ENTRA_TENANT_ID: '00000000-0000-0000-0000-000000000000',
      VITE_ENTRA_CLIENT_ID: '00000000-0000-0000-0000-000000000001',
      VITE_API_SCOPE: 'api://onboarding/access',
      VITE_API_BASE_URL: 'https://api.example.test',
    },
  },
});
