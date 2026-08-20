import { defineConfig } from 'vitest/config';

/**
 * Component suites share Angular/PrimeNG global state. Serial execution avoids
 * worker teardown races and keeps the CI signal deterministic on small runners.
 */
export default defineConfig({
  test: {
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    hookTimeout: 15_000,
    teardownTimeout: 15_000,
  },
});
