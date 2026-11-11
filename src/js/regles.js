/*
 * Règles métier de l'application To-Do : des fonctions pures, sans DOM ni IndexedDB.
 * Elles sont testées unitairement (tests/unitaires/regles.test.js) et soumises au
 * test de mutation (StrykerJS) : c'est le code « à risque » de l'application.
 */

export const MESSAGES = Object.freeze({
  NOM_PROJET_OBLIGATOIRE: 'Le nom du projet est obligatoire.',
  TITRE_OBLIGATOIRE: 'Le titre de la tâche est obligatoire.',
  PROJET_OBLIGATOIRE: 'Choisissez un projet pour la tâche.',
  projetExistant: (nom) => `Le projet « ${nom} » existe déjà.`,
});

/** Clé de comparaison des noms de projet : espaces autour et casse ignorés. */
export function normaliser(texte) {
  return texte.trim().toLocaleLowerCase('fr');
}

/**
 * Valide le nom d'un nouveau projet face aux projets existants.
 * @returns {{ ok: true, nom: string } | { ok: false, message: string }}
 */
export function validerNomProjet(nom, projets) {
  const propre = nom.trim();
  if (propre === '') return { ok: false, message: MESSAGES.NOM_PROJET_OBLIGATOIRE };
  const existant = projets.find((p) => p.nomNormalise === normaliser(propre));
  if (existant) return { ok: false, message: MESSAGES.projetExistant(existant.nom) };
  return { ok: true, nom: propre };
}

/** Valide le titre d'une tâche, à l'ajout comme à la modification. */
export function validerTitre(titre) {
  const propre = titre.trim();
  if (propre === '') return { ok: false, message: MESSAGES.TITRE_OBLIGATOIRE };
  return { ok: true, titre: propre };
}

/** Valide une nouvelle tâche : le titre est vérifié avant le projet. */
export function validerNouvelleTache(titre, projetId) {
  const verdict = validerTitre(titre);
  if (!verdict.ok) return verdict;
  if (projetId === null) return { ok: false, message: MESSAGES.PROJET_OBLIGATOIRE };
  return { ok: true, titre: verdict.titre, projetId };
}

/** Identifiant lu dans une liste déroulante : entier strictement positif, sinon null (aucun choix). */
export function lireIdentifiant(valeur) {
  const nombre = Number(valeur);
  return Number.isInteger(nombre) && nombre > 0 ? nombre : null;
}

/** Tâches affichées : toutes si aucun projet n'est sélectionné, sinon celles du projet. */
export function tachesVisibles(taches, projetSelectionne) {
  if (projetSelectionne === null) return taches;
  return taches.filter((t) => t.projetId === projetSelectionne);
}

export function nombreDeTaches(taches, projetId) {
  return taches.filter((t) => t.projetId === projetId).length;
}

/** « 0 terminée », « 1 tâche », « 2 tâches » : en français, le pluriel commence à 2. */
export function pluriel(nombre, mot) {
  return `${nombre} ${mot}${nombre > 1 ? 's' : ''}`;
}

/** « Aucune tâche » ou « n tâche(s), dont k terminée(s) ». */
export function texteCompteur(taches) {
  const total = taches.length;
  if (total === 0) return 'Aucune tâche';
  const terminees = taches.filter((t) => t.terminee).length;
  return `${pluriel(total, 'tâche')}, dont ${pluriel(terminees, 'terminée')}`;
}

/** Nom du projet d'une tâche ; « ? » si le projet n'existe plus. */
export function nomDuProjet(projets, tache) {
  return projets.find((p) => p.id === tache.projetId)?.nom ?? '?';
}

/** Un projet sélectionné reste sélectionné seulement s'il existe encore. */
export function selectionValide(projets, projetSelectionne) {
  return projets.some((p) => p.id === projetSelectionne) ? projetSelectionne : null;
}

/**
 * Projet pré-choisi dans le formulaire d'ajout : le projet sélectionné dans la liste,
 * sinon le choix précédent s'il existe encore, sinon aucun.
 */
export function projetParDefaut(projets, projetSelectionne, choixPrecedent) {
  if (projetSelectionne !== null) return projetSelectionne;
  return selectionValide(projets, choixPrecedent);
}
