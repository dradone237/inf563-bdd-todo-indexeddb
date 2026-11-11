import { describe, expect, it } from 'vitest';
import {
  MESSAGES, lireIdentifiant, nomDuProjet, nombreDeTaches, normaliser, pluriel, projetParDefaut,
  selectionValide, tachesVisibles, texteCompteur, validerNomProjet, validerNouvelleTache, validerTitre,
} from '../../src/js/regles.js';

const maison = { id: 1, nom: 'Maison', nomNormalise: 'maison' };
const travail = { id: 2, nom: 'Travail', nomNormalise: 'travail' };
const tache = (id, projetId, terminee = false) => ({ id, titre: `Tâche ${id}`, projetId, terminee });

describe('normaliser', () => {
  it('ignore les espaces autour et la casse', () => {
    expect(normaliser('  MaiSon  ')).toBe('maison');
  });
});

describe('validerNomProjet', () => {
  it('refuse un nom vide', () => {
    expect(validerNomProjet('', [])).toEqual({ ok: false, message: MESSAGES.NOM_PROJET_OBLIGATOIRE });
  });

  it('refuse un doublon en citant le projet existant', () => {
    expect(validerNomProjet('maison', [maison])).toEqual({ ok: false, message: 'Le projet « Maison » existe déjà.' });
  });

  it('accepte un nouveau nom', () => {
    expect(validerNomProjet('Travail', [maison])).toEqual({ ok: true, nom: 'Travail' });
  });
});

describe('validerTitre', () => {
  it('refuse un titre vide', () => {
    expect(validerTitre('')).toEqual({ ok: false, message: MESSAGES.TITRE_OBLIGATOIRE });
  });

  it('accepte un titre', () => {
    expect(validerTitre('Payer la facture')).toEqual({ ok: true, titre: 'Payer la facture' });
  });
});

describe('validerNouvelleTache', () => {
  it('refuse une tâche sans titre', () => {
    expect(validerNouvelleTache('', 1)).toEqual({ ok: false, message: MESSAGES.TITRE_OBLIGATOIRE });
  });

  it('refuse une tâche sans projet', () => {
    expect(validerNouvelleTache('Acheter du pain', null)).toEqual({ ok: false, message: MESSAGES.PROJET_OBLIGATOIRE });
  });

  it('accepte une tâche avec titre et projet', () => {
    expect(validerNouvelleTache('Acheter du pain', 1)).toEqual({ ok: true, titre: 'Acheter du pain', projetId: 1 });
  });
});

describe('lireIdentifiant', () => {
  it('lit un identifiant', () => {
    expect(lireIdentifiant('3')).toBe(3);
  });

  it('renvoie null quand aucun projet n\'est choisi', () => {
    expect(lireIdentifiant('')).toBeNull();
  });
});

describe('tachesVisibles et nombreDeTaches', () => {
  const taches = [tache(1, 1), tache(2, 2), tache(3, 2)];

  it('sans sélection, toutes les tâches sont visibles', () => {
    expect(tachesVisibles(taches, null)).toEqual(taches);
  });

  it('avec un projet sélectionné, seules ses tâches sont visibles', () => {
    expect(tachesVisibles(taches, 2)).toEqual([taches[1], taches[2]]);
  });

  it('compte les tâches d\'un projet', () => {
    expect(nombreDeTaches(taches, 2)).toBe(2);
  });
});

describe('pluriel et texteCompteur', () => {
  it('met au pluriel', () => {
    expect(pluriel(2, 'tâche')).toBe('2 tâches');
  });

  it('affiche « Aucune tâche » sans tâche', () => {
    expect(texteCompteur([])).toBe('Aucune tâche');
  });

  it('compte les tâches et les tâches terminées', () => {
    expect(texteCompteur([tache(1, 1), tache(2, 1, true), tache(3, 1, true)])).toBe('3 tâches, dont 2 terminées');
  });
});

describe('nomDuProjet', () => {
  it('donne le nom du projet de la tâche', () => {
    expect(nomDuProjet([maison, travail], tache(1, 2))).toBe('Travail');
  });

  it('affiche « ? » si le projet n\'existe plus', () => {
    expect(nomDuProjet([maison], tache(1, 9))).toBe('?');
  });
});

describe('selectionValide et projetParDefaut', () => {
  it('garde une sélection qui existe', () => {
    expect(selectionValide([maison], 1)).toBe(1);
  });

  it('oublie une sélection qui n\'existe plus', () => {
    expect(selectionValide([maison], 2)).toBeNull();
  });

  it('pré-choisit le projet sélectionné', () => {
    expect(projetParDefaut([maison, travail], 2, 1)).toBe(2);
  });

  it('sinon garde le choix précédent', () => {
    expect(projetParDefaut([maison, travail], null, 1)).toBe(1);
  });
});
