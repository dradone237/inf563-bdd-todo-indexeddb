/*
 * Couverture de code des scénarios BDD (profil « couverture ») :
 *   1. le serveur instrumente les fichiers JavaScript servis au navigateur (Istanbul) ;
 *   2. avant de quitter chaque page, on lit window.__coverage__ ;
 *   3. à la fin, la couverture fusionnée est écrite dans .nyc_output/, d'où
 *      « nyc report » produit le rapport et « nyc check-coverage » applique les seuils.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import libCouverture from 'istanbul-lib-coverage';
import libInstrumentation from 'istanbul-lib-instrument';

const DOSSIER = '.nyc_output';
const instrumenteur = libInstrumentation.createInstrumenter({ esModules: true, coverageVariable: '__coverage__' });
const deja = new Map();
const carte = libCouverture.createCoverageMap({});

export function instrumenter(code, chemin) {
  if (!deja.has(chemin)) deja.set(chemin, instrumenteur.instrumentSync(code, chemin));
  return deja.get(chemin);
}

export function ajouter(couverture) {
  if (couverture) carte.merge(couverture);
}

export async function reinitialiser() {
  await rm(DOSSIER, { recursive: true, force: true });
}

export async function enregistrer() {
  await mkdir(DOSSIER, { recursive: true });
  await writeFile(`${DOSSIER}/scenarios-bdd.json`, JSON.stringify(carte.toJSON()));
}
