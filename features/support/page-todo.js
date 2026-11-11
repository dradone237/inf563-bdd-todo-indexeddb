/*
 * Page object de l'application To-Do : les sélecteurs (libellés, rôles ARIA, data-testid)
 * ne sont écrits qu'ici ; les étapes Gherkin n'expriment que des intentions.
 */
import { expect as expectPlaywright } from '@playwright/test';

/** Assertions Playwright : elles attendent automatiquement (aucune pause fixe). */
export const expect = expectPlaywright.configure({ timeout: 10_000 });

export class PageTodo {
  constructor(monde) {
    this.monde = monde;
  }

  get page() {
    return this.monde.page;
  }

  bouton(nom, portee = this.page) {
    return portee.getByRole('button', { name: nom, exact: true });
  }

  // ---- Navigation ---------------------------------------------------------

  async ouvrir() {
    await this.page.goto(this.monde.urlApplication);
    await this.attendreQueLApplicationSoitPrete();
  }

  async recharger() {
    await this.monde.recharger();
    await this.attendreQueLApplicationSoitPrete();
  }

  /** L'application pose data-pret="true" sur body une fois IndexedDB ouverte et l'écran rendu. */
  async attendreQueLApplicationSoitPrete() {
    await expect(this.page.locator('body')).toHaveAttribute('data-pret', 'true');
  }

  // ---- Projets ------------------------------------------------------------

  async creerProjet(nom) {
    await this.page.getByLabel('Nom du projet').fill(nom);
    await this.bouton('Ajouter le projet').click();
  }

  projet(nom) {
    return this.bouton(`Afficher le projet ${nom}`);
  }

  async selectionnerProjet(nom) {
    await this.projet(nom).click();
  }

  async selectionnerTousLesProjets() {
    await this.bouton('Afficher tous les projets').click();
  }

  async supprimerProjet(nom) {
    await this.bouton(`Supprimer le projet ${nom}`).click();
  }

  // ---- Tâches -------------------------------------------------------------

  async ajouterTache(titre, projet) {
    await this.page.getByLabel('Titre de la tâche').fill(titre);
    await this.page.getByLabel('Projet', { exact: true }).selectOption(projet === '' ? '' : { label: projet });
    await this.bouton('Ajouter la tâche').click();
  }

  taches() {
    return this.page.getByTestId('tache');
  }

  titresDesTaches() {
    return this.page.getByTestId('tache-titre');
  }

  /** La ligne dont le titre est exactement « titre ». */
  tache(titre) {
    const titreExact = this.page.getByTestId('tache-titre').and(this.page.getByText(titre, { exact: true }));
    return this.taches().filter({ has: titreExact });
  }

  projetDeLaTache(titre) {
    return this.tache(titre).getByTestId('tache-projet');
  }

  caseTerminee(titre) {
    return this.page.getByRole('checkbox', { name: `Terminer « ${titre} »`, exact: true });
  }

  async basculerTerminee(titre) {
    await this.caseTerminee(titre).click();
  }

  async supprimerTache(titre) {
    await this.bouton(`Supprimer « ${titre} »`).click();
  }

  // ---- Modification d'une tâche ---------------------------------------------

  ligneEnEdition() {
    return this.page.locator('[data-testid=tache][data-edition=true]');
  }

  async commencerModification(titre) {
    await this.bouton(`Modifier « ${titre} »`).click();
    await expect(this.ligneEnEdition()).toBeVisible();
  }

  async saisirNouveauTitre(titre) {
    await this.ligneEnEdition().getByLabel('Nouveau titre').fill(titre);
  }

  async choisirNouveauProjet(projet) {
    await this.ligneEnEdition().getByLabel('Nouveau projet').selectOption({ label: projet });
  }

  async enregistrerModification() {
    await this.bouton('Enregistrer', this.ligneEnEdition()).click();
  }

  async annulerModification() {
    await this.bouton('Annuler', this.ligneEnEdition()).click();
  }

  // ---- Retours affichés -----------------------------------------------------

  message() {
    return this.page.getByTestId('message');
  }

  compteur() {
    return this.page.getByTestId('compteur');
  }

  listeVide() {
    return this.page.getByTestId('liste-vide');
  }
}
