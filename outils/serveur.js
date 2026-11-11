/*
 * Serveur HTTP statique (node:http) : IndexedDB exige une vraie origine http://.
 *   - « npm start » sert src/ sur http://127.0.0.1:8080 pour utiliser l'application à la main ;
 *   - les scénarios BDD le démarrent sur un port libre. Avec la couverture activée, il
 *     instrumente à la volée les fichiers JavaScript servis (Istanbul), comme l'agent JaCoCo
 *     instrumente le bytecode pendant les tests.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RACINE = fileURLToPath(new URL('../src/', import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

/**
 * @param {{ port?: number, instrumenter?: (code: string, chemin: string) => string }} [options]
 * @returns {Promise<{ url: string, arreter: () => Promise<void> }>}
 */
export async function demarrerServeur({ port = 0, instrumenter } = {}) {
  const serveur = createServer(async (requete, reponse) => {
    const chemin = decodeURIComponent(new URL(requete.url, 'http://localhost').pathname);
    const fichier = resolve(RACINE, `.${chemin.endsWith('/') ? `${chemin}index.html` : chemin}`);
    if (!fichier.startsWith(RACINE)) {
      reponse.writeHead(403).end();
      return;
    }
    try {
      const contenu = await readFile(fichier);
      const extension = extname(fichier);
      const corps = instrumenter && extension === '.js' ? instrumenter(contenu.toString('utf8'), fichier) : contenu;
      reponse.writeHead(200, { 'Content-Type': TYPES[extension] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      reponse.end(corps);
    } catch {
      reponse.writeHead(404).end();
    }
  });
  await new Promise((pret) => serveur.listen(port, '127.0.0.1', pret));
  return {
    url: `http://127.0.0.1:${serveur.address().port}/`,
    arreter: () => new Promise((arrete) => {
      serveur.closeAllConnections();
      serveur.close(arrete);
    }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { url } = await demarrerServeur({ port: Number(process.env.PORT ?? 8080) });
  console.log(`Application To-Do : ${url}  (Ctrl+C pour arrêter)`);
}
