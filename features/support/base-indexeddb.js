/*
 * Oracle indépendant de l'application : lit et écrit IndexedDB directement avec l'API du
 * navigateur, sans passer par le code de l'application (src/js/db.js). Un scénario vérifie
 * ainsi ce qui est réellement sauvegardé, pas seulement ce qui est affiché.
 */
export class BaseIndexedDb {
  constructor(monde) {
    this.monde = monde;
  }

  /** @returns {Promise<{ projets: string[], taches: { titre: string, projet: string, terminee: boolean }[] }>} */
  lire() {
    return this.monde.page.evaluate(async () => {
      const db = await new Promise((ok, ko) => {
        const requete = indexedDB.open('todo-inf563');
        requete.onsuccess = () => ok(requete.result);
        requete.onerror = () => ko(requete.error);
      });
      const lireTout = (store) => new Promise((ok, ko) => {
        const requete = db.transaction(store).objectStore(store).getAll();
        requete.onsuccess = () => ok(requete.result);
        requete.onerror = () => ko(requete.error);
      });
      const projets = await lireTout('projets');
      const taches = await lireTout('taches');
      db.close();
      return {
        projets: projets.map((p) => p.nom),
        taches: taches.map((t) => ({
          titre: t.titre,
          projet: (projets.find((p) => p.id === t.projetId) ?? { nom: '(projet introuvable)' }).nom,
          terminee: t.terminee === true,
        })),
      };
    });
  }

  async projets() {
    return (await this.lire()).projets;
  }

  async taches() {
    return (await this.lire()).taches;
  }

  /** Pré-remplit la base (l'application doit avoir été ouverte une fois pour créer le schéma). */
  async inserer(taches) {
    await this.monde.page.evaluate(async (lignes) => {
      const db = await new Promise((ok, ko) => {
        const requete = indexedDB.open('todo-inf563');
        requete.onsuccess = () => ok(requete.result);
        requete.onerror = () => ko(requete.error);
      });
      const tx = db.transaction(['projets', 'taches'], 'readwrite');
      const idsProjets = new Map();
      const date = new Date().toISOString();
      lignes.forEach((ligne, i) => {
        if (!idsProjets.has(ligne.projet)) {
          idsProjets.set(ligne.projet, idsProjets.size + 1);
          tx.objectStore('projets').add({
            id: idsProjets.get(ligne.projet), nom: ligne.projet,
            nomNormalise: ligne.projet.trim().toLocaleLowerCase('fr'), creeLe: date,
          });
        }
        tx.objectStore('taches').add({
          id: i + 1, titre: ligne.titre, projetId: idsProjets.get(ligne.projet),
          terminee: ligne.terminee, creeLe: date, modifieLe: date,
        });
      });
      await new Promise((ok, ko) => {
        tx.oncomplete = ok;
        tx.onabort = () => ko(tx.error);
      });
      db.close();
    }, taches);
  }
}
