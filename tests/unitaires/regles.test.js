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

// ---- T2 : tests ajoutés après le premier test de mutation (voir le README) ----------

describe('T2 · valeurs limites du pluriel', () => {
  // Tue « nombre > 1 » → « nombre >= 1 » et → « true » : il faut tester la frontière 1
  it.each([
    [0, '0 terminée'],
    [1, '1 terminée'],
    [2, '2 terminées'],
  ])('pluriel(%i) donne « %s »', (nombre, attendu) => {
    expect(pluriel(nombre, 'terminée')).toBe(attendu);
  });

  it('le compteur est au singulier pour une seule tâche', () => {
    expect(texteCompteur([tache(1, 1)])).toBe('1 tâche, dont 0 terminée');
  });
});

describe('T2 · espaces autour des saisies', () => {
  // Tuent « nom.trim() » → « nom » et « titre.trim() » → « titre »
  it('un nom de projet fait d\'espaces est refusé', () => {
    expect(validerNomProjet('   ', []).ok).toBe(false);
  });

  it('un nom de projet est enregistré sans les espaces autour', () => {
    expect(validerNomProjet('  Travail  ', [maison])).toEqual({ ok: true, nom: 'Travail' });
  });

  it('un titre fait d\'espaces est refusé', () => {
    expect(validerTitre('    ').ok).toBe(false);
  });

  it('un titre est enregistré sans les espaces autour', () => {
    expect(validerTitre('  Appeler le plombier ')).toEqual({ ok: true, titre: 'Appeler le plombier' });
  });
});

describe('T2 · oracle indépendant du code', () => {
  // Les tests T1 comparaient aux constantes MESSAGES : muter une constante changeait aussi
  // l'attendu. L'oracle est ici le texte exact de la spécification (fichiers .feature).
  it('les messages d\'erreur sont ceux de la spécification', () => {
    expect(validerNomProjet('', []).message).toBe('Le nom du projet est obligatoire.');
    expect(validerTitre('').message).toBe('Le titre de la tâche est obligatoire.');
    expect(validerNouvelleTache('Acheter du pain', null).message).toBe('Choisissez un projet pour la tâche.');
  });
});

describe('T2 · valeurs limites de lireIdentifiant', () => {
  it.each([
    ['0', null],
    ['1', 1],
    ['-1', null],
    ['1.5', null],
    ['abc', null],
  ])('lireIdentifiant(%j) donne %j', (valeur, attendu) => {
    expect(lireIdentifiant(valeur)).toBe(attendu);
  });
});
