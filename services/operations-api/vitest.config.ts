import { defineConfig } from 'vitest/config';

// esbuild does not emit decorator metadata, so Nest providers must use
// explicit @Inject(Token) in constructors when running under vitest.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
