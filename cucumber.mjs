// Configuration de Cucumber-js : « npm run test:bdd » exécute toutes les features.
// Le profil « couverture » (npm run test:bdd:couverture) mesure en plus le code exécuté.
const commun = {
  paths: ['features/**/*.feature'],
  import: ['features/support/**/*.js', 'features/step_definitions/**/*.js'],
  format: [
    'pretty',
    'html:rapports/cucumber/cucumber.html',
    'junit:rapports/cucumber/cucumber.xml',
  ],
};

export default commun;

export const couverture = { ...commun, worldParameters: { couverture: true } };
