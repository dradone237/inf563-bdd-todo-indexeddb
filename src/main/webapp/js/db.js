/*
 * Accès à IndexedDB : toute la persistance de l'application passe par ce module.
 *
 * Base "todo-inf563", version 1
 *   projets : { id (auto), nom, nomNormalise (index unique), creeLe }
 *   taches  : { id (auto), titre, projetId (index), terminee, creeLe, modifieLe }
 */
const TodoDb = (() => {
  const NOM_BASE = 'todo-inf563';
  const VERSION = 1;

  const normaliser = (texte) => texte.trim().toLocaleLowerCase('fr');
  const maintenant = () => new Date().toISOString();

  function resultat(requete) {
    return new Promise((resoudre, rejeter) => {
      requete.onsuccess = () => resoudre(requete.result);
      requete.onerror = () => rejeter(requete.error);
    });
  }

  function terminee(transaction) {
    return new Promise((resoudre, rejeter) => {
      transaction.oncomplete = () => resoudre();
      transaction.onerror = () => rejeter(transaction.error);
      transaction.onabort = () => rejeter(transaction.error || new Error('Transaction annulée'));
    });
  }

  function creerSchema(db) {
    const projets = db.createObjectStore('projets', { keyPath: 'id', autoIncrement: true });
    projets.createIndex('nomNormalise', 'nomNormalise', { unique: true });
    const taches = db.createObjectStore('taches', { keyPath: 'id', autoIncrement: true });
    taches.createIndex('projetId', 'projetId');
  }

  async function ouvrir() {
    const ouverture = indexedDB.open(NOM_BASE, VERSION);
    ouverture.onupgradeneeded = () => creerSchema(ouverture.result);
    const db = await resultat(ouverture);

    const lireTout = (store) => resultat(db.transaction(store).objectStore(store).getAll());

    return {
      listerProjets: () => lireTout('projets'),
      listerTaches: () => lireTout('taches'),

      /** Rejette avec une ConstraintError si un projet de même nom (casse ignorée) existe. */
      async ajouterProjet(nom) {
        const tx = db.transaction('projets', 'readwrite');
        const ajout = tx.objectStore('projets').add({ nom, nomNormalise: normaliser(nom), creeLe: maintenant() });
        await terminee(tx);
        return ajout.result;
      },

      /** Supprime le projet et toutes ses tâches dans une seule transaction (tout ou rien). */
      async supprimerProjet(id) {
        const tx = db.transaction(['projets', 'taches'], 'readwrite');
        tx.objectStore('projets').delete(id);
        const curseur = tx.objectStore('taches').index('projetId').openCursor(IDBKeyRange.only(id));
        curseur.onsuccess = () => {
          if (curseur.result) {
            curseur.result.delete();
            curseur.result.continue();
          }
        };
        await terminee(tx);
      },

      async ajouterTache({ titre, projetId }) {
        const tx = db.transaction('taches', 'readwrite');
        const date = maintenant();
        const ajout = tx.objectStore('taches').add({ titre, projetId, terminee: false, creeLe: date, modifieLe: date });
        await terminee(tx);
        return ajout.result;
      },

      async modifierTache(id, modifications) {
        const tx = db.transaction('taches', 'readwrite');
        const store = tx.objectStore('taches');
        const lecture = store.get(id);
        lecture.onsuccess = () => {
          if (!lecture.result) {
            tx.abort();
            return;
          }
          store.put({ ...lecture.result, ...modifications, modifieLe: maintenant() });
        };
        await terminee(tx);
      },

      async supprimerTache(id) {
        const tx = db.transaction('taches', 'readwrite');
        tx.objectStore('taches').delete(id);
        await terminee(tx);
      },
    };
  }

  return { ouvrir, normaliser, NOM_BASE };
})();
