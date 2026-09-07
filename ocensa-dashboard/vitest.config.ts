import { defineConfig } from 'vitest/config';

// El runner de `@angular/build:unit-test` (Vitest 4) crashea en Windows al lanzar en paralelo
// los ~25 spec con el pool de workers por hilos ("Worker exited unexpectedly"). El pool de
// procesos (`forks`) es estable. Sólo afecta a la ejecución local de tests.
export default defineConfig({
  test: {
    pool: 'forks',
  },
});
