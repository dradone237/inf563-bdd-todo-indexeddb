package cm.inf563.todo.pages;

import cm.inf563.todo.support.Navigateur;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.SelectOption;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

/**
 * Page object de l'application To-Do : les sélecteurs (libellés, rôles ARIA,
 * data-testid) ne sont écrits qu'ici ; les étapes Gherkin n'expriment que des intentions.
 */
public class PageTodo {

    private final Navigateur navigateur;

    public PageTodo(Navigateur navigateur) {
        this.navigateur = navigateur;
    }

    private Page page() {
        return navigateur.page();
    }

    private Locator bouton(Locator portee, String nom) {
        return portee.getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName(nom).setExact(true));
    }

    private Locator bouton(String nom) {
        return page().getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(nom).setExact(true));
    }

    // ---- Navigation ---------------------------------------------------------

    public void ouvrir() {
        page().navigate(navigateur.urlApplication());
        attendreQueLApplicationSoitPrete();
    }

    public void recharger() {
        page().reload();
        attendreQueLApplicationSoitPrete();
    }

    /** L'application pose data-pret="true" sur body une fois IndexedDB ouverte et l'écran rendu. */
    private void attendreQueLApplicationSoitPrete() {
        assertThat(page().locator("body")).hasAttribute("data-pret", "true");
    }

    // ---- Projets ------------------------------------------------------------

    public void creerProjet(String nom) {
        page().getByLabel("Nom du projet").fill(nom);
        bouton("Ajouter le projet").click();
    }

    public Locator projet(String nom) {
        return bouton("Afficher le projet " + nom);
    }

    public void selectionnerProjet(String nom) {
        projet(nom).click();
    }

    public void selectionnerTousLesProjets() {
        bouton("Afficher tous les projets").click();
    }

    public void supprimerProjet(String nom) {
        bouton("Supprimer le projet " + nom).click();
    }

    // ---- Tâches -------------------------------------------------------------

    public void ajouterTache(String titre, String projet) {
        page().getByLabel("Titre de la tâche").fill(titre);
        Locator choixProjet = page().getByLabel("Projet", new Page.GetByLabelOptions().setExact(true));
        if (projet.isEmpty()) {
            choixProjet.selectOption("");
        } else {
            choixProjet.selectOption(new SelectOption().setLabel(projet));
        }
        bouton("Ajouter la tâche").click();
    }

    public Locator taches() {
        return page().getByTestId("tache");
    }

    public Locator titresDesTaches() {
        return page().getByTestId("tache-titre");
    }

    /** La ligne dont le titre est exactement {@code titre}. */
    public Locator tache(String titre) {
        Locator titreExact = page().getByTestId("tache-titre")
                .and(page().getByText(titre, new Page.GetByTextOptions().setExact(true)));
        return taches().filter(new Locator.FilterOptions().setHas(titreExact));
    }

    public Locator projetDeLaTache(String titre) {
        return tache(titre).getByTestId("tache-projet");
    }

    public Locator caseTerminee(String titre) {
        return page().getByRole(AriaRole.CHECKBOX,
                new Page.GetByRoleOptions().setName("Terminer « " + titre + " »").setExact(true));
    }

    public void basculerTerminee(String titre) {
        caseTerminee(titre).click();
    }

    public void supprimerTache(String titre) {
        bouton("Supprimer « " + titre + " »").click();
    }

    // ---- Modification d'une tâche ---------------------------------------------

    private Locator ligneEnEdition() {
        return page().locator("[data-testid=tache][data-edition=true]");
    }

    public void commencerModification(String titre) {
        bouton("Modifier « " + titre + " »").click();
        assertThat(ligneEnEdition()).isVisible();
    }

    public void saisirNouveauTitre(String titre) {
        ligneEnEdition().getByLabel("Nouveau titre").fill(titre);
    }

    public void choisirNouveauProjet(String projet) {
        ligneEnEdition().getByLabel("Nouveau projet").selectOption(new SelectOption().setLabel(projet));
    }

    public void enregistrerModification() {
        bouton(ligneEnEdition(), "Enregistrer").click();
    }

    public void annulerModification() {
        bouton(ligneEnEdition(), "Annuler").click();
    }

    // ---- Retours affichés -----------------------------------------------------

    public Locator message() {
        return page().getByTestId("message");
    }

    public Locator compteur() {
        return page().getByTestId("compteur");
    }

    public Locator listeVide() {
        return page().getByTestId("liste-vide");
    }
}
