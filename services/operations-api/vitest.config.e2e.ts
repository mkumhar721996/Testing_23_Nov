import { defineConfig } from 'vitest/config';

// See vitest.config.ts: use explicit @Inject(Token) for constructor injection.
export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
  },
});
