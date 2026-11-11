/*
 * Accès à IndexedDB : toute la persistance de l'application passe par ce module.
 *
 * Base « todo-inf563 », version 1
 *   projets : { id (auto), nom, nomNormalise (index unique), creeLe }
 *   taches  : { id (auto), titre, projetId (index), terminee, creeLe, modifieLe }
 *
 * La fabrique IndexedDB et l'horloge sont injectées : le navigateur utilise les vraies,
 * les tests unitaires une base en mémoire (fake-indexeddb) et une horloge fixe.
 */
import { normaliser } from './regles.js';

export const NOM_BASE = 'todo-inf563';
export const VERSION = 1;

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

/**
 * Ouvre la base (et la crée à la première utilisation).
 * @param {{ fabrique?: IDBFactory, horloge?: () => Date, nom?: string }} [options]
 */
export async function ouvrirBase({ fabrique = globalThis.indexedDB, horloge = () => new Date(), nom = NOM_BASE } = {}) {
  const ouverture = fabrique.open(nom, VERSION);
  ouverture.onupgradeneeded = () => creerSchema(ouverture.result);
  const db = await resultat(ouverture);

  const maintenant = () => horloge().toISOString();
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
      const curseur = tx.objectStore('taches').index('projetId').openCursor(id);
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

    /** Rejette si la tâche n'existe pas : rien n'est écrit. */
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

    fermer: () => db.close(),
  };
}
