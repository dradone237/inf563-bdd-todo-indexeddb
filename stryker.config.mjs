// Test de mutation (StrykerJS), l'équivalent JavaScript de PIT :
// « npm run test:mutation » injecte des fautes dans le code métier, relance les tests
// unitaires sur chaque mutant, et échoue sous 85 % (comme <mutationThreshold>85</mutationThreshold>).
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  vitest: { configFile: 'vitest.config.js' },
  // Cibler le code à risque (règles métier, persistance), pas l'affichage : comme <targetClasses>
  mutate: ['src/js/regles.js', 'src/js/db.js'],
  // Chaque mutant n'est confronté qu'aux tests qui couvrent sa ligne (comme PIT)
  coverageAnalysis: 'perTest',
  reporters: ['html', 'json', 'clear-text', 'progress'],
  htmlReporter: { fileName: 'rapports/mutation/index.html' },
  jsonReporter: { fileName: 'rapports/mutation/mutation.json' },
  thresholds: { high: 90, low: 85, break: 85 },
  tempDirName: '.stryker-tmp',
};
