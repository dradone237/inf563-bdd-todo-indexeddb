// Test de montée en charge (k6) de l'application To-Do : charge croissante par paliers (cours, séance 12).
//
// L'application n'a pas de serveur métier : le serveur ne fait que servir 5 fichiers statiques, et tout le
// travail (règles, IndexedDB) se fait dans le navigateur. Deux scénarios en parallèle :
//   - « http » : de nombreux utilisateurs ouvrent l'application (les requêtes d'un navigateur, sans l'exécuter) ;
//   - « navigateur » : de vrais navigateurs (module k6/browser) créent un projet, ajoutent et cochent des
//     tâches, puis rechargent la page : c'est la charge réelle de l'application, côté client.
// Pendant ce temps, Glances enregistre le processeur, la RAM, le swap et le disque de la machine.
import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { browser } from 'k6/browser';

const PROFIL = JSON.parse(open('./paliers.json'));
const ESSAI = __ENV.ESSAI === '1';
const REPOS = ESSAI ? PROFIL.essai.repos : PROFIL.repos;
const DEMI = ESSAI ? PROFIL.essai.demiEtape : PROFIL.demiEtape;
const DESCENTE = ESSAI ? PROFIL.essai.descente : PROFIL.descente;
const BASE = (__ENV.BASE_URL || 'http://127.0.0.1:8080/').replace(/\/?$/, '/');
const FICHIERS = ['css/style.css', 'js/app.js', 'js/db.js', 'js/regles.js'];

function etapes(cle) {
  const liste = [{ duration: `${REPOS}s`, target: 0 }];
  for (const palier of PROFIL.paliers) {
    liste.push({ duration: `${DEMI}s`, target: palier[cle] }, { duration: `${DEMI}s`, target: palier[cle] });
  }
  liste.push({ duration: `${DESCENTE}s`, target: 0 });
  return liste;
}

/** Numéro du palier dont on est sur le plateau, sinon « transition » (repos, montées, descente). */
function palierCourant() {
  const t = exec.instance.currentTestRunDuration / 1000;
  for (let k = 1; k <= PROFIL.paliers.length; k++) {
    const debut = REPOS + (2 * k - 1) * DEMI;
    if (t >= debut && t < debut + DEMI) return String(k);
  }
  return 'transition';
}

// Seuils : les SLO du cours pour le scénario http, et des sous-métriques par palier pour l'analyse.
const seuils = {
  http_req_duration: ['p(95)<300', 'p(99)<800'],
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.99'],
  browser_web_vital_lcp: ['p(75)<2500'],
};
PROFIL.paliers.forEach((_, i) => {
  const k = i + 1;
  seuils[`http_req_duration{palier:${k}}`] = ['p(95)<300'];
  seuils[`http_reqs{palier:${k}}`] = ['count>0'];
  seuils[`iterations{scenario:http,palier:${k}}`] = ['count>0'];
  seuils[`iteration_duration{scenario:http,palier:${k}}`] = ['avg>0'];
  seuils[`iteration_duration{scenario:navigateur,palier:${k}}`] = ['avg>0'];
});

export const options = {
  scenarios: {
    http: { executor: 'ramping-vus', exec: 'ouvrirApplication', startVUs: 0, stages: etapes('http'), gracefulRampDown: '5s' },
    navigateur: {
      executor: 'ramping-vus', exec: 'utiliserApplication', startVUs: 0, stages: etapes('navigateurs'), gracefulRampDown: '20s',
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: seuils,
};

export function setup() {
  console.log(`DEBUT_TEST=${Date.now()}`);
}

/** Ce que fait un navigateur à l'ouverture : la page, puis ses 4 ressources. */
export function ouvrirApplication() {
  exec.vu.metrics.tags.palier = palierCourant();
  const page = http.get(`${BASE}index.html`);
  check(page, { 'index.html : 200': (r) => r.status === 200 });
  const ressources = http.batch(FICHIERS.map((f) => ['GET', BASE + f]));
  check(ressources, { 'ressources : 200': (rs) => rs.every((r) => r.status === 200) });
  sleep(1); // temps de réflexion de l'utilisateur
}

/** Un vrai parcours dans Chrome : projet, 3 tâches, une cochée, rechargement. Chaque page = une base IndexedDB neuve. */
export async function utiliserApplication() {
  exec.vu.metrics.tags.palier = palierCourant();
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE}index.html`);
    await page.locator('body[data-pret="true"]').waitFor();
    await page.locator('#nom-projet').fill(`Projet ${exec.vu.idInTest}-${exec.vu.iterationInScenario}`);
    await page.locator('#form-projet button[type="submit"]').click();
    await page.locator('#projet-tache option[value="1"]').waitFor({ state: 'attached' });
    const titres = ['Réviser le chapitre 4', 'Payer la facture ENEO', 'Appeler le plombier'];
    for (const [i, titre] of titres.entries()) {
      await page.locator('#titre-tache').fill(titre);
      await page.locator('#projet-tache').selectOption('1');
      await page.locator('#form-tache button[type="submit"]').click();
      // Comme un vrai utilisateur : attendre que la tâche apparaisse (l'application vide le champ après l'écriture)
      await page.waitForFunction((n) => document.querySelectorAll('#liste-taches li').length === n, {}, i + 1);
    }
    // click() et non check() : l'application redessine la liste après l'écriture dans IndexedDB, la case
    // cliquée est remplacée ; la fin de l'action est le compteur mis à jour (comme dans les scénarios BDD)
    await page.locator('#liste-taches li:first-child input[type="checkbox"]').click();
    await page.waitForFunction(() => document.getElementById('compteur').textContent === '3 tâches, dont 1 terminée');
    check(await page.locator('#compteur').textContent(), { 'compteur : 3 tâches, dont 1 terminée': (t) => t === '3 tâches, dont 1 terminée' });
    await page.reload();
    await page.locator('body[data-pret="true"]').waitFor();
    check(await page.locator('#compteur').textContent(), { 'IndexedDB : données conservées après rechargement': (t) => t === '3 tâches, dont 1 terminée' });
  } finally {
    await page.close();
  }
  sleep(1);
}
