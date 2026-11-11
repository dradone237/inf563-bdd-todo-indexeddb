# INF563 · Devoir 2 – Application To-Do (projets, IndexedDB) testée en BDD

[![ci](https://github.com/dradone237/inf563-bdd-todo-indexeddb/actions/workflows/ci.yml/badge.svg)](https://github.com/dradone237/inf563-bdd-todo-indexeddb/actions/workflows/ci.yml)

Master 2 professionnel SIGL · Vérification et validation de logiciel · Enseignant : Evaris Fomekong
Séance de référence : **« Niveaux, doublures et TDD/BDD »**, complétée par **« Bout en bout web : Playwright et page objects »**.

## Énoncé

- Une application **To-Do** : on peut **ajouter** une tâche et **modifier** une tâche ;
- les tâches **appartiennent à des projets** ;
- les données sont **sauvegardées dans IndexedDB**, la base de données du navigateur ;
- **toutes les fonctionnalités** sont testées en **BDD** dans le navigateur ;
- un **push** sur le dépôt **déclenche les tests**.

## Résultat

| Élément | Résultat |
|---|---|
| Scénarios Gherkin (Cucumber + Playwright, Chromium) | 24 réussis, sur 3 exécutions consécutives : aucun test instable |
| Intégration continue | GitHub Actions à chaque `push` et `pull request` |

Rapport complet : [`docs/Rapport_Devoir2_BDD_ToDo_IndexedDB.pdf`](docs/Rapport_Devoir2_BDD_ToDo_IndexedDB.pdf).

## Structure

```
.github/workflows/ci.yml       pipeline : push → tests
src/main/webapp/               l'application (HTML, CSS, JavaScript, sans dépendance)
  index.html, css/style.css
  js/db.js                     accès IndexedDB (base todo-inf563 : magasins projets et taches)
  js/app.js                    interface ; relit la base après chaque écriture
src/test/java/cm/inf563/todo/
  pages/PageTodo               page object (tous les sélecteurs)
  steps/TodoSteps              phrases Gherkin → actions et assertions
  support/Navigateur           serveur HTTP local (JDK) + Chromium + contexte neuf par scénario
  support/BaseIndexedDb        oracle : lit et écrit IndexedDB sans passer par l'application
  RunCucumberTest              point d'entrée JUnit 5 de Cucumber
src/test/resources/features/
  01_projets.feature  02_taches.feature  03_persistance_indexeddb.feature
```

## L'application

- créer un projet, le supprimer (ses tâches sont supprimées avec lui, **dans une seule transaction**) ;
- filtrer les tâches par projet ;
- ajouter une tâche dans un projet, la **modifier** (titre et/ou projet), la terminer ou la réouvrir, la supprimer ;
- compteur « *n* tâches, dont *k* terminées » ;
- textes insérés avec `textContent`, jamais `innerHTML` : pas d'injection HTML.

Schéma IndexedDB (base `todo-inf563`, version 1) :

| Magasin | Champs | Index |
|---|---|---|
| `projets` | `id` (auto), `nom`, `nomNormalise`, `creeLe` | `nomNormalise` **unique** (refuse les doublons) |
| `taches` | `id` (auto), `titre`, `projetId`, `terminee`, `creeLe`, `modifieLe` | `projetId` (tâches d'un projet) |

## Choix techniques et justification

| Choix | Justification (cours) |
|---|---|
| **Java 21, Maven, JUnit 5** | Environnement du cours. |
| **Gherkin en français** exécuté par **Cucumber** | « La spécification exécutable » : chaque fonctionnalité de l'application est décrite en langage métier. |
| **Playwright pour Java** + **page object** | Outil E2E du cours ; assertions qui **attendent automatiquement** (aucun `Thread.sleep`) ; sélecteurs stables : libellés, rôles ARIA, `data-testid`. |
| **Deux oracles par scénario** : l'écran **et** IndexedDB | `BaseIndexedDb` lit la base avec l'API du navigateur, **sans passer par le code de l'application** : on vérifie ce qui est réellement sauvegardé, pas seulement ce qui est affiché. |
| **Un contexte de navigateur neuf par scénario** | IndexedDB vide à chaque scénario : tests **isolés**, **reproductibles**, exécutables dans n'importe quel ordre (F.I.R.S.T.). |
| **Serveur HTTP du JDK** (`SimpleFileServer`) démarré par les tests | IndexedDB exige une vraie origine `http://` ; aucune installation supplémentaire. |
| **Erreur JavaScript = scénario en échec** | Une exception dans la page ne passe pas inaperçue. |
| **Capture d'écran jointe au rapport en cas d'échec** | « Captures, vidéos et traces à chaque échec ». |

## Scénarios

| Feature | Scénarios |
|---|---|
| [`01_projets.feature`](src/test/resources/features/01_projets.feature) | créer un projet ; refuser un nom vide ; refuser un doublon (plan : même nom, casse différente, majuscules) et un doublon entouré d'espaces ; filtrer par projet ; supprimer un projet et ses tâches |
| [`02_taches.feature`](src/test/resources/features/02_taches.feature) | ajouter ; refuser une tâche invalide (plan : sans titre, sans projet, ni l'un ni l'autre) et un titre fait d'espaces ; renommer ; déplacer vers un autre projet ; refuser un titre vidé pendant la modification ; annuler une modification ; terminer puis réouvrir ; supprimer ; titre contenant du HTML |
| [`03_persistance_indexeddb.feature`](src/test/resources/features/03_persistance_indexeddb.feature) | base neuve vide ; données conservées après **rechargement** ; après **fermeture de l'onglet** ; affichage de données **déjà présentes** dans IndexedDB |

## Défaut détecté par les tests

Le scénario « les données survivent au rechargement de la page » a échoué au premier essai. L'étape
« je coche la tâche » se fiait à la case cochée, or le navigateur coche la case **avant** que l'écriture
dans IndexedDB soit terminée : un rechargement immédiat interrompait l'écriture. Le point de
synchronisation est désormais l'attribut `data-terminee`, rendu **après** relecture de la base (voir le
commit correctif). C'est le rôle d'un test BDD : il a révélé une hypothèse fausse sur ce qui est « sauvegardé ».

## Intégration continue

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) se déclenche à chaque `push` (toutes branches), à
chaque *pull request* et à la demande (`workflow_dispatch`) :

1. sur une machine **Ubuntu 24.04 figée** (et non `ubuntu-latest`, qui change d'Ubuntu sans prévenir) :
   `actions/checkout`, puis `actions/setup-java` (Temurin 21, cache Maven) ;
2. `mvn -B verify -Dcanal=chrome` : les 24 scénarios, dans le **Google Chrome déjà installé** sur la machine.
   L'étape `playwright install` a été retirée : le 11/11/2026 elle restait bloquée 10 minutes sur le
   téléchargement de Chromium et faisait échouer le pipeline avant tout test ;
3. publication des rapports Cucumber (HTML, avec captures des échecs) et Surefire, même en cas d'échec.

## Lancer en local

Prérequis : JDK 21 ou plus, Maven 3.9 ou plus.

```bash
# Une seule fois : télécharger Chromium pour Playwright
mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install chromium" -Dexec.classpathScope=test

mvn verify                                        # les 24 scénarios
mvn verify -Dheadless=false -DslowMo=300          # démonstration : navigateur visible et ralenti
mvn verify -Dcucumber.filter.tags=@persistance    # une seule feature (@projets, @taches, @persistance)
mvn verify -Dcanal=chrome                         # avec le Google Chrome installé (comme en CI)
```

Rapport lisible : `target/cucumber-reports/cucumber.html`.

Utiliser l'application à la main : `jwebserver -d <chemin absolu vers src/main/webapp> -p 8080`, puis
<http://localhost:8080>. Les données sont visibles dans les outils de développement
(F12 → Application → IndexedDB → `todo-inf563`).

## Lacunes de spécification rencontrées

| Question non tranchée par l'énoncé | Décision |
|---|---|
| « Maison » et « maison » sont-ils deux projets différents ? | Non : comparaison sans tenir compte de la casse ni des espaces autour (index unique `nomNormalise`). |
| Que deviennent les tâches d'un projet supprimé ? | Elles sont supprimées avec lui, dans la même transaction (sinon tâches orphelines). |
| Un titre fait uniquement d'espaces est-il valide ? | Non : refusé à l'ajout comme à la modification. |
| Une tâche peut-elle exister sans projet ? | Non : le projet est obligatoire. |
| Dans quel ordre afficher les tâches ? | Ordre de création (clé auto-incrémentée). |

## Limites

- Les scénarios tournent sous **Chromium** ; Firefox et WebKit peuvent être ajoutés en changeant le
  navigateur lancé dans `Navigateur.java`.
- IndexedDB est propre à chaque navigateur et à chaque profil : il n'y a pas de synchronisation entre appareils (hors du périmètre de l'énoncé).
