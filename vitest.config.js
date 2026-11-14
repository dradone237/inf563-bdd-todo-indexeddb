import { defineConfig } from 'vitest/config';

// Tests unitaires (Vitest) et couverture de code (Istanbul), l'équivalent JavaScript de
// JUnit 5 + JaCoCo : « npm run test:couverture » échoue sous les seuils (quality gate).
// Mise à jour du projet - Novembre 2026
export default defineConfig({
  test: {
    include: ['tests/unitaires/**/*.test.js'],
    environment: 'node',
    coverage: {
      provider: 'istanbul',
      include: ['src/js/regles.js', 'src/js/db.js'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'rapports/couverture-unitaire',
      // Code critique : 100 % atteint (objectif du TP), le seuil interdit toute régression.
      // La gate générale du cours (80 % de branches) s'applique à toute l'application,
      // mesurée sur les scénarios BDD (.nycrc.json).
      thresholds: { branches: 100, lines: 100, functions: 100, statements: 100 },
    },
  },
});
