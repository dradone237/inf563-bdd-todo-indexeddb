/*
 * Définitions d'étapes de l'application To-Do.
 * Deux oracles : l'écran (assertions Playwright, qui attendent automatiquement) et le
 * contenu réel d'IndexedDB (BaseIndexedDb, qui n'utilise pas le code de l'application).
 */
import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '../support/page-todo.js';

const colonne = (tableau) => tableau.raw().map(([valeur]) => valeur);

function tachesDuTableau(tableau) {
  return tableau.hashes().map((ligne) => {
    const terminee = ligne['terminée'];
    if (terminee !== 'oui' && terminee !== 'non') {
      throw new Error(`Colonne « terminée » : oui ou non attendu, reçu « ${terminee} »`);
    }
    return { titre: ligne['tâche'], projet: ligne.projet, terminee: terminee === 'oui' };
  });
}

// ---- Contexte -----------------------------------------------------------

Given("j'ouvre l'application To-Do avec une base vide", async function () {
  await this.todo.ouvrir();
  assert.deepEqual(await this.base.projets(), [], 'précondition : aucun projet');
  assert.deepEqual(await this.base.taches(), [], 'précondition : aucune tâche');
});

When("j'ouvre l'application To-Do", async function () {
  await this.todo.ouvrir();
});

Given('la base IndexedDB contient déjà :', async function (tableau) {
  await this.todo.ouvrir(); // crée le schéma de la base
  await this.base.inserer(tachesDuTableau(tableau));
});

Given('le projet {string} existe', async function (nom) {
  await this.todo.creerProjet(nom);
  await expect(this.todo.projet(nom)).toBeVisible();
});

Given('la tâche {string} existe dans le projet {string}', async function (titre, projet) {
  await this.todo.ajouterTache(titre, projet);
  await expect(this.todo.tache(titre)).toBeVisible();
});

// ---- Actions ------------------------------------------------------------

When('je crée le projet {string}', async function (nom) {
  await this.todo.creerProjet(nom);
});

When('je sélectionne le projet {string}', async function (nom) {
  await this.todo.selectionnerProjet(nom);
});

When('je sélectionne tous les projets', async function () {
  await this.todo.selectionnerTousLesProjets();
});

When('je supprime le projet {string}', async function (nom) {
  await this.todo.supprimerProjet(nom);
});

When("j'ajoute la tâche {string} dans le projet {string}", async function (titre, projet) {
  await this.todo.ajouterTache(titre, projet);
});

When('je renomme la tâche {string} en {string}', async function (ancien, nouveau) {
  await this.todo.commencerModification(ancien);
  await this.todo.saisirNouveauTitre(nouveau);
  await this.todo.enregistrerModification();
});

When('je déplace la tâche {string} vers le projet {string}', async function (titre, projet) {
  await this.todo.commencerModification(titre);
  await this.todo.choisirNouveauProjet(projet);
  await this.todo.enregistrerModification();
});

When("je commence à renommer la tâche {string} en {string} puis j'annule", async function (ancien, nouveau) {
  await this.todo.commencerModification(ancien);
  await this.todo.saisirNouveauTitre(nouveau);
  await this.todo.annulerModification();
});

// La case est cochée par le navigateur AVANT l'écriture dans IndexedDB : ce n'est pas une
// preuve de sauvegarde. data-terminee n'est rendu qu'après relecture de la base : c'est le
// point de synchronisation (sinon un rechargement immédiat perd l'écriture).
When('je coche la tâche {string}', async function (titre) {
  await expect(this.todo.tache(titre)).toHaveAttribute('data-terminee', 'false');
  await this.todo.basculerTerminee(titre);
  await expect(this.todo.tache(titre)).toHaveAttribute('data-terminee', 'true');
});

When('je décoche la tâche {string}', async function (titre) {
  await expect(this.todo.tache(titre)).toHaveAttribute('data-terminee', 'true');
  await this.todo.basculerTerminee(titre);
  await expect(this.todo.tache(titre)).toHaveAttribute('data-terminee', 'false');
});

When('je supprime la tâche {string}', async function (titre) {
  await this.todo.supprimerTache(titre);
});

When('je recharge la page', async function () {
  await this.todo.recharger();
});

When("je ferme l'onglet et j'ouvre l'application dans un nouvel onglet", async function () {
  await this.changerDOnglet();
  await this.todo.ouvrir();
});

// ---- Vérifications à l'écran ---------------------------------------------

Then('le projet {string} apparaît dans la liste des projets', async function (nom) {
  await expect(this.todo.projet(nom)).toBeVisible();
});

Then("le projet {string} n'apparaît plus dans la liste des projets", async function (nom) {
  await expect(this.todo.projet(nom)).toHaveCount(0);
});

Then("le message {string} s'affiche", async function (message) {
  await expect(this.todo.message()).toHaveText(message);
});

Then('je vois uniquement les tâches :', async function (tableau) {
  await expect(this.todo.titresDesTaches()).toHaveText(colonne(tableau));
});

Then('la liste des tâches est vide', async function () {
  await expect(this.todo.taches()).toHaveCount(0);
  await expect(this.todo.listeVide()).toBeVisible();
});

Then('la tâche {string} est affichée dans le projet {string}', async function (titre, projet) {
  await expect(this.todo.tache(titre)).toBeVisible();
  await expect(this.todo.projetDeLaTache(titre)).toHaveText(projet);
});

Then("la tâche {string} n'est plus affichée", async function (titre) {
  await expect(this.todo.tache(titre)).toHaveCount(0);
});

Then('la tâche {string} est marquée comme terminée', async function (titre) {
  await expect(this.todo.tache(titre)).toHaveAttribute('data-terminee', 'true');
  await expect(this.todo.caseTerminee(titre)).toBeChecked();
});

Then("la tâche {string} n'est pas marquée comme terminée", async function (titre) {
  await expect(this.todo.tache(titre)).toHaveAttribute('data-terminee', 'false');
  await expect(this.todo.caseTerminee(titre)).not.toBeChecked();
});

Then('le compteur indique {string}', async function (texte) {
  await expect(this.todo.compteur()).toHaveText(texte);
});

// ---- Vérifications dans IndexedDB -----------------------------------------

Then('la base IndexedDB ne contient aucun projet', async function () {
  assert.deepEqual(await this.base.projets(), []);
});

Then('la base IndexedDB ne contient aucune tâche', async function () {
  assert.deepEqual(await this.base.taches(), []);
});

Then('la base IndexedDB contient exactement les projets :', async function (tableau) {
  assert.deepEqual(await this.base.projets(), colonne(tableau));
});

Then('la base IndexedDB contient exactement les tâches :', async function (tableau) {
  assert.deepEqual(await this.base.taches(), tachesDuTableau(tableau));
});
