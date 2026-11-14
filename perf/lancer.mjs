// « npm run perf » : montée en charge (k6) et profilage de la machine (Glances), puis rapport.
//   1. sert l'application sur http://127.0.0.1:8080 ;
//   2. lance Glances, qui enregistre chaque seconde le processeur, la RAM, le swap et le disque ;
//   3. lance k6 (perf/charge.js) avec son tableau de bord web en direct ;
//   4. arrête Glances et le serveur, puis écrit perf/resultats/profil.html.
// Options : --essai (profil court, ~1 min). Variables : K6_BIN, GLANCES_BIN (chemins des outils),
// K6_WEB_DASHBOARD_OPEN=false (ne pas ouvrir le tableau de bord dans le navigateur).
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { demarrerServeur } from '../outils/serveur.js';
import { construireRapport } from './rapport.mjs';

const DOSSIER = 'perf/resultats';
const essai = process.argv.includes('--essai');
const K6 = process.env.K6_BIN || 'k6';
const GLANCES = process.env.GLANCES_BIN || 'glances';
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));

await mkdir(DOSSIER, { recursive: true });
await rm(`${DOSSIER}/glances.csv`, { force: true }); // Glances refuse d'ajouter à un fichier d'en-tête différent

const serveur = await demarrerServeur({ port: 8080 });
console.log(`Application servie sur ${serveur.url}`);

const glances = spawn(GLANCES, ['--quiet', '--time', '1', '--export', 'csv', '--export-csv-file', `${DOSSIER}/glances.csv`,
  '--disable-plugin', 'all', '--enable-plugin', 'cpu,mem,memswap,load,diskio,core'], { stdio: 'ignore' });
glances.on('error', (e) => { console.error(`Glances introuvable (${e.message}) : pip install glances, ou GLANCES_BIN`); process.exit(1); });
console.log('Glances enregistre la machine chaque seconde…');
await pause(4000); // quelques mesures de référence avant la charge

let debut = Date.now();
const k6 = spawn(K6, ['run', 'perf/charge.js', '--summary-export', `${DOSSIER}/resume-k6.json`,
  '--summary-trend-stats', 'avg,min,med,max,p(90),p(95),p(99)'], {
  stdio: ['inherit', 'inherit', 'pipe'],
  env: {
    BASE_URL: serveur.url, ESSAI: essai ? '1' : '0',
    K6_WEB_DASHBOARD: 'true', K6_WEB_DASHBOARD_EXPORT: `${DOSSIER}/tableau-de-bord-k6.html`, K6_WEB_DASHBOARD_OPEN: 'true',
    ...process.env,
  },
});
k6.on('error', (e) => { console.error(`k6 introuvable (${e.message}) : installez k6, ou K6_BIN`); glances.kill(); process.exit(1); });
k6.stderr.on('data', (morceau) => {
  const texte = morceau.toString();
  const repere = texte.match(/DEBUT_TEST=(\d+)/);
  if (repere) debut = Number(repere[1]);
  process.stderr.write(texte);
});
const code = await new Promise((fin) => k6.on('close', fin));

await pause(5000); // retour au calme, toujours mesuré
glances.kill();
await serveur.arreter();
await writeFile(`${DOSSIER}/chronologie.json`, JSON.stringify({ debut, essai, codeK6: code }, null, 1));

const rapport = await construireRapport(DOSSIER);
console.log(`\nRapport de profilage : ${rapport}`);
console.log(`Tableau de bord k6   : ${DOSSIER}/tableau-de-bord-k6.html`);
process.exitCode = code;
