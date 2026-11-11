// Doublure de type « fake » : fake-indexeddb est une vraie implémentation d'IndexedDB, en
// mémoire. Une fabrique neuve par test : chaque test part d'une base vide (isolation).
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
