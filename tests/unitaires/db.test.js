// Doublure de type « fake » : fake-indexeddb est une vraie implémentation d'IndexedDB, en
// mémoire. Une fabrique neuve par test : chaque test part d'une base vide (isolation).
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ouvrirBase } from '../../src/js/db.js';

let base;

beforeEach(async () => {
  base = await ouvrirBase({ fabrique: new IDBFactory() });
});

afterEach(() => base.fermer());

describe('projets', () => {
  it('une base neuve ne contient ni projet ni tâche', async () => {
    expect(await base.listerProjets()).toEqual([]);
    expect(await base.listerTaches()).toEqual([]);
  });

  it('ajouterProjet enregistre le projet', async () => {
    const id = await base.ajouterProjet('Maison');
    expect(await base.listerProjets()).toMatchObject([{ id, nom: 'Maison', nomNormalise: 'maison' }]);
  });

  it('ajouterProjet refuse un doublon : index unique sur le nom normalisé', async () => {
    await base.ajouterProjet('Maison');
    await expect(base.ajouterProjet('MAISON')).rejects.toMatchObject({ name: 'ConstraintError' });
  });

  it('supprimerProjet supprime le projet et ses tâches', async () => {
    const maison = await base.ajouterProjet('Maison');
    await base.ajouterTache({ titre: 'Faire les courses', projetId: maison });
    await base.supprimerProjet(maison);
    expect(await base.listerProjets()).toEqual([]);
    expect(await base.listerTaches()).toEqual([]);
  });
});

describe('tâches', () => {
  it('ajouterTache enregistre une tâche non terminée', async () => {
    const maison = await base.ajouterProjet('Maison');
    const id = await base.ajouterTache({ titre: 'Faire les courses', projetId: maison });
    expect(await base.listerTaches()).toMatchObject([{ id, titre: 'Faire les courses', projetId: maison, terminee: false }]);
  });

  it('modifierTache change les champs demandés', async () => {
    const maison = await base.ajouterProjet('Maison');
    const id = await base.ajouterTache({ titre: 'Apeler', projetId: maison });
    await base.modifierTache(id, { titre: 'Appeler', terminee: true });
    expect(await base.listerTaches()).toMatchObject([{ id, titre: 'Appeler', terminee: true }]);
  });

  it('supprimerTache supprime la tâche', async () => {
    const maison = await base.ajouterProjet('Maison');
    const id = await base.ajouterTache({ titre: 'Faire les courses', projetId: maison });
    await base.supprimerTache(id);
    expect(await base.listerTaches()).toEqual([]);
  });
});

// ---- T2 : tests ajoutés après le premier test de mutation (voir le README) ----------

const ouvrirSansApplication = (fabrique, nom, version) => new Promise((resoudre, rejeter) => {
  const requete = fabrique.open(nom, version);
  requete.onsuccess = () => resoudre(requete.result);
  requete.onerror = () => rejeter(requete.error);
});

describe('T2 · schéma de la base', () => {
  // Tue NOM_BASE → "" et le nom d'index → "" : le schéma documenté est un contrat,
  // lu par d'autres que ce module (outils de développement, oracle des scénarios BDD)
  it('crée la base todo-inf563 avec les magasins et index documentés', async () => {
    const fabrique = new IDBFactory();
    (await ouvrirBase({ fabrique })).fermer();

    const db = await ouvrirSansApplication(fabrique, 'todo-inf563');
    const tx = db.transaction(['projets', 'taches']);
    const projets = tx.objectStore('projets');
    const taches = tx.objectStore('taches');
    expect(db.version).toBe(1);
    expect([...db.objectStoreNames]).toEqual(['projets', 'taches']);
    expect({ cle: projets.keyPath, auto: projets.autoIncrement, index: [...projets.indexNames] })
      .toEqual({ cle: 'id', auto: true, index: ['nomNormalise'] });
    expect(projets.index('nomNormalise')).toMatchObject({ keyPath: 'nomNormalise', unique: true });
    expect({ cle: taches.keyPath, auto: taches.autoIncrement, index: [...taches.indexNames] })
      .toEqual({ cle: 'id', auto: true, index: ['projetId'] });
    expect(taches.index('projetId')).toMatchObject({ keyPath: 'projetId', unique: false });
    db.close();
  });

  // Tue le gestionnaire « onerror » de l'ouverture → « () => undefined » (la promesse ne finissait jamais)
  it('ouvrirBase rejette si la base existante est d\'une version plus récente', async () => {
    const fabrique = new IDBFactory();
    (await ouvrirSansApplication(fabrique, 'todo-inf563', 2)).close();
    await expect(ouvrirBase({ fabrique })).rejects.toMatchObject({ name: 'VersionError' });
  });

  it('par défaut, utilise l\'IndexedDB du navigateur et l\'heure courante', async () => {
    const fabrique = new IDBFactory();
    vi.stubGlobal('indexedDB', fabrique);
    try {
      const parDefaut = await ouvrirBase();
      await parDefaut.ajouterProjet('Maison');
      const [projet] = await parDefaut.listerProjets();
      parDefaut.fermer();
      expect(projet.creeLe).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(Math.abs(Date.parse(projet.creeLe) - Date.now())).toBeLessThan(60_000);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // Tue « fermer: () => db.close() » → « () => undefined »
  it('fermer ferme la connexion : plus aucune lecture n\'est possible', async () => {
    const autre = await ouvrirBase({ fabrique: new IDBFactory() });
    autre.fermer();
    expect(() => autre.listerProjets()).toThrow(expect.objectContaining({ name: 'InvalidStateError' }));
  });
});

describe('T2 · horloge injectée', () => {
  // Tue « maintenant » → « () => undefined » : les dates n'étaient jamais vérifiées.
  // L'horloge est une doublure contrôlée par le test (cours, séance 9 : maîtriser le temps).
  it('date la création, puis la modification sans toucher à la date de création', async () => {
    const creation = '2026-11-11T08:00:00.000Z';
    const modification = '2026-11-11T09:30:00.000Z';
    let maintenant = new Date(creation);
    const datee = await ouvrirBase({ fabrique: new IDBFactory(), horloge: () => maintenant });

    const maison = await datee.ajouterProjet('Maison');
    const id = await datee.ajouterTache({ titre: 'Laver la voiture', projetId: maison });
    maintenant = new Date(modification);
    await datee.modifierTache(id, { terminee: true });

    expect(await datee.listerProjets()).toEqual([{ id: maison, nom: 'Maison', nomNormalise: 'maison', creeLe: creation }]);
    expect(await datee.listerTaches()).toEqual([
      { id, titre: 'Laver la voiture', projetId: maison, terminee: true, creeLe: creation, modifieLe: modification },
    ]);
    datee.fermer();
  });
});

describe('T2 · suppression en cascade et cas d\'erreur', () => {
  // Tue « curseur.result.continue() » supprimé : la boucle doit être testée avec plusieurs tâches
  it('supprimerProjet supprime toutes les tâches du projet, et seulement elles', async () => {
    const maison = await base.ajouterProjet('Maison');
    const travail = await base.ajouterProjet('Travail');
    await base.ajouterTache({ titre: 'Faire les courses', projetId: maison });
    await base.ajouterTache({ titre: 'Écrire le rapport', projetId: travail });
    await base.ajouterTache({ titre: 'Ranger le garage', projetId: maison });

    await base.supprimerProjet(maison);

    expect((await base.listerProjets()).map((p) => p.nom)).toEqual(['Travail']);
    expect((await base.listerTaches()).map((t) => t.titre)).toEqual(['Écrire le rapport']);
  });

  // Tue « !lecture.result » → « false » et couvre l'annulation (tx.abort, message d'erreur)
  it('modifierTache sur une tâche inexistante rejette et n\'écrit rien', async () => {
    const maison = await base.ajouterProjet('Maison');
    await base.ajouterTache({ titre: 'Faire les courses', projetId: maison });
    const avant = await base.listerTaches();

    await expect(base.modifierTache(999, { titre: 'Fantôme' }))
      .rejects.toMatchObject({ name: 'AbortError', message: 'Transaction annulée' });
    expect(await base.listerTaches()).toEqual(avant);
  });
});
