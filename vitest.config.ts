import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * The `@/*` alias is declared here rather than through vite-tsconfig-paths:
 * that plugin is ESM-only, and this config is loaded as CJS, so requiring it
 * fails at startup. One alias is not worth a dependency.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      /**
       * Measured: the framework-free modules, where a unit test is the right
       * tool, plus the boot path, which runs against a throwaway database.
       * Left out: the query layer, the simulator, the route helpers and the
       * request-scoped session reader — they only mean anything against a
       * running server, which is what the e2e suite puts them in front of.
       */
      include: ['src/lib/**/*.ts', 'src/db/bootstrap.ts'],
      exclude: [
        'src/lib/api/**',
        'src/lib/auth/index.ts',
        'src/lib/demo/pools.ts',
        'src/lib/env.ts',
        'src/lib/events/simulator.ts',
        'src/lib/events/types.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
})
