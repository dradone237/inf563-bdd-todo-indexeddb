package cm.inf563.todo.steps;

import cm.inf563.todo.pages.PageTodo;
import cm.inf563.todo.support.BaseIndexedDb;
import cm.inf563.todo.support.BaseIndexedDb.TacheStockee;
import cm.inf563.todo.support.Navigateur;
import io.cucumber.datatable.DataTable;
import io.cucumber.java.fr.Alors;
import io.cucumber.java.fr.Etantdonné;
import io.cucumber.java.fr.Quand;

import java.util.List;
import java.util.Map;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Définitions d'étapes de l'application To-Do.
 * Les vérifications portent sur deux oracles : l'écran (assertions Playwright,
 * qui attendent automatiquement) et le contenu réel d'IndexedDB (BaseIndexedDb).
 */
public class TodoSteps {

    private final Navigateur navigateur;
    private final PageTodo todo;
    private final BaseIndexedDb base;

    public TodoSteps(Navigateur navigateur) {
        this.navigateur = navigateur;
        this.todo = new PageTodo(navigateur);
        this.base = new BaseIndexedDb(navigateur);
    }

    // ---- Contexte -----------------------------------------------------------

    @Etantdonné("j'ouvre l'application To-Do avec une base vide")
    public void jOuvreLApplicationAvecUneBaseVide() {
        todo.ouvrir();
        assertEquals(List.of(), base.projets(), "précondition : aucun projet");
        assertEquals(List.of(), base.taches(), "précondition : aucune tâche");
    }

    @Quand("j'ouvre l'application To-Do")
    public void jOuvreLApplication() {
        todo.ouvrir();
    }

    @Etantdonné("la base IndexedDB contient déjà :")
    public void laBaseContientDeja(DataTable tableau) {
        todo.ouvrir(); // crée le schéma de la base
        base.inserer(tachesDuTableau(tableau));
    }

    @Etantdonné("le projet {string} existe")
    public void leProjetExiste(String nom) {
        todo.creerProjet(nom);
        assertThat(todo.projet(nom)).isVisible();
    }

    @Etantdonné("la tâche {string} existe dans le projet {string}")
    public void laTacheExiste(String titre, String projet) {
        todo.ajouterTache(titre, projet);
        assertThat(todo.tache(titre)).isVisible();
    }

    // ---- Actions ------------------------------------------------------------

    @Quand("je crée le projet {string}")
    public void jeCreeLeProjet(String nom) {
        todo.creerProjet(nom);
    }

    @Quand("je sélectionne le projet {string}")
    public void jeSelectionneLeProjet(String nom) {
        todo.selectionnerProjet(nom);
    }

    @Quand("je sélectionne tous les projets")
    public void jeSelectionneTousLesProjets() {
        todo.selectionnerTousLesProjets();
    }

    @Quand("je supprime le projet {string}")
    public void jeSupprimeLeProjet(String nom) {
        todo.supprimerProjet(nom);
    }

    @Quand("j'ajoute la tâche {string} dans le projet {string}")
    public void jAjouteLaTache(String titre, String projet) {
        todo.ajouterTache(titre, projet);
    }

    @Quand("je renomme la tâche {string} en {string}")
    public void jeRenommeLaTache(String ancien, String nouveau) {
        todo.commencerModification(ancien);
        todo.saisirNouveauTitre(nouveau);
        todo.enregistrerModification();
    }

    @Quand("je déplace la tâche {string} vers le projet {string}")
    public void jeDeplaceLaTache(String titre, String projet) {
        todo.commencerModification(titre);
        todo.choisirNouveauProjet(projet);
        todo.enregistrerModification();
    }

    @Quand("je commence à renommer la tâche {string} en {string} puis j'annule")
    public void jeCommenceARenommerPuisJAnnule(String ancien, String nouveau) {
        todo.commencerModification(ancien);
        todo.saisirNouveauTitre(nouveau);
        todo.annulerModification();
    }

    // La case est cochée par le navigateur AVANT l'écriture dans IndexedDB : ce n'est pas
    // une preuve de sauvegarde. data-terminee n'est rendu qu'après relecture de la base,
    // c'est donc lui le point de synchronisation (sinon un rechargement immédiat perd l'écriture).
    @Quand("je coche la tâche {string}")
    public void jeCocheLaTache(String titre) {
        assertThat(todo.tache(titre)).hasAttribute("data-terminee", "false");
        todo.basculerTerminee(titre);
        assertThat(todo.tache(titre)).hasAttribute("data-terminee", "true");
    }

    @Quand("je décoche la tâche {string}")
    public void jeDecocheLaTache(String titre) {
        assertThat(todo.tache(titre)).hasAttribute("data-terminee", "true");
        todo.basculerTerminee(titre);
        assertThat(todo.tache(titre)).hasAttribute("data-terminee", "false");
    }

    @Quand("je supprime la tâche {string}")
    public void jeSupprimeLaTache(String titre) {
        todo.supprimerTache(titre);
    }

    @Quand("je recharge la page")
    public void jeRechargeLaPage() {
        todo.recharger();
    }

    @Quand("je ferme l'onglet et j'ouvre l'application dans un nouvel onglet")
    public void jeChangeDOnglet() {
        navigateur.changerDOnglet();
        todo.ouvrir();
    }

    // ---- Vérifications à l'écran ---------------------------------------------

    @Alors("le projet {string} apparaît dans la liste des projets")
    public void leProjetApparait(String nom) {
        assertThat(todo.projet(nom)).isVisible();
    }

    @Alors("le projet {string} n'apparaît plus dans la liste des projets")
    public void leProjetNApparaitPlus(String nom) {
        assertThat(todo.projet(nom)).hasCount(0);
    }

    @Alors("le message {string} s'affiche")
    public void leMessageSAffiche(String message) {
        assertThat(todo.message()).hasText(message);
    }

    @Alors("je vois uniquement les tâches :")
    public void jeVoisUniquementLesTaches(List<String> titres) {
        assertThat(todo.titresDesTaches()).hasText(titres.toArray(String[]::new));
    }

    @Alors("la liste des tâches est vide")
    public void laListeEstVide() {
        assertThat(todo.taches()).hasCount(0);
        assertThat(todo.listeVide()).isVisible();
    }

    @Alors("la tâche {string} est affichée dans le projet {string}")
    public void laTacheEstAffichee(String titre, String projet) {
        assertThat(todo.tache(titre)).isVisible();
        assertThat(todo.projetDeLaTache(titre)).hasText(projet);
    }

    @Alors("la tâche {string} n'est plus affichée")
    public void laTacheNEstPlusAffichee(String titre) {
        assertThat(todo.tache(titre)).hasCount(0);
    }

    @Alors("la tâche {string} est marquée comme terminée")
    public void laTacheEstTerminee(String titre) {
        assertThat(todo.tache(titre)).hasAttribute("data-terminee", "true");
        assertThat(todo.caseTerminee(titre)).isChecked();
    }

    @Alors("la tâche {string} n'est pas marquée comme terminée")
    public void laTacheNEstPasTerminee(String titre) {
        assertThat(todo.tache(titre)).hasAttribute("data-terminee", "false");
        assertThat(todo.caseTerminee(titre)).not().isChecked();
    }

    @Alors("le compteur indique {string}")
    public void leCompteurIndique(String texte) {
        assertThat(todo.compteur()).hasText(texte);
    }

    // ---- Vérifications dans IndexedDB -----------------------------------------

    @Alors("la base IndexedDB ne contient aucun projet")
    public void aucunProjetEnBase() {
        assertEquals(List.of(), base.projets());
    }

    @Alors("la base IndexedDB ne contient aucune tâche")
    public void aucuneTacheEnBase() {
        assertEquals(List.of(), base.taches());
    }

    @Alors("la base IndexedDB contient exactement les projets :")
    public void projetsEnBase(List<String> attendus) {
        assertEquals(attendus, base.projets());
    }

    @Alors("la base IndexedDB contient exactement les tâches :")
    public void tachesEnBase(DataTable tableau) {
        assertEquals(tachesDuTableau(tableau), base.taches());
    }

    private static List<TacheStockee> tachesDuTableau(DataTable tableau) {
        return tableau.asMaps().stream()
                .map(TodoSteps::tacheDeLaLigne)
                .toList();
    }

    private static TacheStockee tacheDeLaLigne(Map<String, String> ligne) {
        String terminee = ligne.get("terminée");
        if (!"oui".equals(terminee) && !"non".equals(terminee)) {
            throw new IllegalArgumentException("Colonne « terminée » : oui ou non attendu, reçu « " + terminee + " »");
        }
        return new TacheStockee(ligne.get("tâche"), ligne.get("projet"), "oui".equals(terminee));
    }
}
