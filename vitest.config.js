import { defineConfig } from 'vitest/config';

// Tests unitaires (Vitest) et couverture de code (Istanbul), l'équivalent JavaScript de
// JUnit 5 + JaCoCo : « npm run test:couverture » échoue sous les seuils (quality gate).
export default defineConfig({
  test: {
    include: ['tests/unitaires/**/*.test.js'],
    environment: 'node',
    coverage: {
      provider: 'istanbul',
      include: ['src/js/regles.js', 'src/js/db.js'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'rapports/couverture-unitaire',
      thresholds: { branches: 80, lines: 80, functions: 80, statements: 80 },
    },
  },
});
