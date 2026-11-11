# INF563 · Devoir 2 – Application To-Do (projets, IndexedDB) en JavaScript : BDD, couverture et mutation

[![ci](https://github.com/dradone237/inf563-bdd-todo-indexeddb/actions/workflows/ci.yml/badge.svg)](https://github.com/dradone237/inf563-bdd-todo-indexeddb/actions/workflows/ci.yml)

Master 2 professionnel SIGL · Vérification et validation de logiciel · Enseignant : Evaris Fomekong
Séances de référence : **« Niveaux, doublures et TDD/BDD »**, **« Bout en bout web : Playwright et page objects »**
et **chapitre V « Couverture et test de mutation »**.

## Énoncé

- Une application **To-Do** : on peut **ajouter** une tâche et **modifier** une tâche ;
- les tâches **appartiennent à des projets** ;
- les données sont **sauvegardées dans IndexedDB**, la base de données du navigateur ;
- **toutes les fonctionnalités** sont testées en **BDD** dans le navigateur ;
- un **push** sur le dépôt **déclenche les tests**.

**Consignes complémentaires de l'enseignant :**

- le projet est **entièrement en JavaScript** ;
- appliquer la **couverture de code (JaCoCo)** et le **test de mutation (PIT)** du chapitre V, avec les
  bibliothèques et paquets propres à JavaScript.

## Résultat

| Mesure | Outil JavaScript | Résultat | Seuil (le build échoue en dessous) |
|---|---|---|---|
| Tests unitaires | **Vitest** | 51 réussis | – |
| Couverture du code métier (`regles.js`, `db.js`) | **Istanbul** (`@vitest/coverage-istanbul`) | **100 %** des instructions, branches, fonctions et lignes | 100 % ([`vitest.config.js`](vitest.config.js)) |
| Test de mutation du code métier | **StrykerJS** | **100 %** : 185 mutants, 183 tués, 2 en timeout, 0 survivant | 85 % ([`stryker.config.mjs`](stryker.config.mjs)) |
| Scénarios Gherkin dans le navigateur | **Cucumber-js** + **Playwright** | 24 réussis (200 étapes) | – |
| Couverture de **toute l'application** par les scénarios | **Istanbul** dans le navigateur + **nyc** | 85,93 % des branches, 95,12 % des instructions | 80 % ([`.nycrc.json`](.nycrc.json)) |
| Intégration continue | GitHub Actions | les 4 mesures à chaque `push` et *pull request* | – |

**Rapport complet (PDF, 32 pages)** : [`docs/Rapport_Devoir2_ToDo_JavaScript_Couverture_Mutation.pdf`](docs/Rapport_Devoir2_ToDo_JavaScript_Couverture_Mutation.pdf).

Rapports versionnés (instantané de la dernière exécution, livrable du TP) :

| Rapport | Fichier |
|---|---|
| Mutation, suite T1 (89,73 %) | [`docs/rapports/mutation-T1/index.html`](docs/rapports/mutation-T1/index.html) |
| Mutation, suite T2 (100 %) | [`docs/rapports/mutation-T2/index.html`](docs/rapports/mutation-T2/index.html) |
| Couverture des tests unitaires | [`docs/rapports/couverture-unitaire/index.html`](docs/rapports/couverture-unitaire/index.html) |
| Couverture des scénarios BDD | [`docs/rapports/couverture-bdd/index.html`](docs/rapports/couverture-bdd/index.html) |
| Scénarios Cucumber | [`docs/rapports/cucumber/cucumber.html`](docs/rapports/cucumber/cucumber.html) |

GitHub affiche ces fichiers HTML sous forme de code source : il faut les ouvrir dans un navigateur après avoir
cloné le dépôt. Chaque exécution de la CI publie aussi tous les rapports (artefact `rapports-tests`).

## Du Java au JavaScript : correspondance des outils

| Rôle | Version 1 (Java) | Version 2 (JavaScript) |
|---|---|---|
| Build et dépendances | Maven, `pom.xml` | npm, `package.json` + `package-lock.json` (versions figées) |
| Tests unitaires | JUnit 5 | **Vitest** |
| Couverture de code | **JaCoCo** : `prepare-agent` instrumente le bytecode, `report`, `check` | **Istanbul** : instrumente le JavaScript (Vitest pour les tests unitaires, `istanbul-lib-instrument` dans le navigateur pour les scénarios), **nyc** produit le rapport et vérifie les seuils |
| Seuil de couverture | `<counter>BRANCH</counter>` … `<minimum>0.80</minimum>` | `thresholds` (Vitest) ; `branches: 80` (`.nycrc.json`) |
| Test de mutation | **PIT** (`pitest-maven`, `mutationCoverage`) | **StrykerJS** (`@stryker-mutator/core` + `vitest-runner`) |
| Classes ciblées | `<targetClasses>` | `mutate: ['src/js/regles.js', 'src/js/db.js']` |
| Seuil de mutation | `<mutationThreshold>85</mutationThreshold>` | `thresholds: { break: 85 }` |
| Tests lancés par mutant | ceux qui couvrent la ligne | idem : `coverageAnalysis: 'perTest'` |
| BDD | Cucumber-JVM | **Cucumber-js** (mêmes fichiers `.feature`, en français) |
| Navigateur | Playwright pour Java | **Playwright** (`@playwright/test`) |
| Serveur HTTP des tests | `SimpleFileServer` du JDK | `node:http` ([`outils/serveur.js`](outils/serveur.js)) |
| Doublure d'IndexedDB | – | **fake-indexeddb** (une *fake* : vraie implémentation, en mémoire) |

Opérateurs de mutation du cours (PIT) et leurs équivalents StrykerJS :

| PIT | StrykerJS | Exemple dans ce projet |
|---|---|---|
| `CONDITIONALS_BOUNDARY` (`<` → `<=`) | `EqualityOperator` (`>` → `>=`) | `nombre > 1` dans `pluriel` |
| `NEGATE_CONDITIONALS` (`==` → `!=`) | `EqualityOperator` (`===` → `!==`), `ConditionalExpression` (condition → `true`/`false`) | `propre === ''` |
| `VOID_METHOD_CALLS` (appel supprimé) | `CallExpression` (appel supprimé) | `curseur.result.continue()` |
| `EMPTY_RETURNS` / `NULL_RETURNS` | `StringLiteral` (→ `""`), `ObjectLiteral` (→ `{}`), `ArrayDeclaration` (→ `[]`), `ArrowFunction` (→ `undefined`) | messages d'erreur, `maintenant()` |
| `TRUE_RETURNS` / `FALSE_RETURNS` | `BooleanLiteral` | `ok: true` |
| `MATH`, `INCREMENTS`, `INVERT_NEGS` | `ArithmeticOperator`, `UpdateOperator`, `UnaryOperator` | (aucune arithmétique dans ce code) |
| (propres à JavaScript) | `MethodExpression` (`trim()` supprimé), `OptionalChaining` (`?.` → `.`), `LogicalOperator` (`??` → `&&`), `BlockStatement` (corps vidé) | `nom.trim()`, `?.nom ?? '?'` |

Les 185 mutants se répartissent ainsi : `StringLiteral` 46, `ConditionalExpression` 35, `BlockStatement` 27,
`ArrowFunction` 18, `ObjectLiteral` 15, `EqualityOperator` 15, `BooleanLiteral` 13, `MethodExpression` 8,
`LogicalOperator` 3, `CallExpression` 3, `ArrayDeclaration` 1, `OptionalChaining` 1.

## Démarche (TP « Renforcer la suite », chapitre V)

L'historique des commits suit chaque étape :

1. **Rendre le code mesurable.** Les règles métier sortent de l'interface dans [`src/js/regles.js`](src/js/regles.js)
   (fonctions pures). [`src/js/db.js`](src/js/db.js) reçoit la fabrique IndexedDB et l'horloge en paramètres :
   les tests y branchent une base en mémoire (fake-indexeddb) et une horloge fixe.
2. **Suite T1, des tests de chemins** (un test par branche, comme pour viser la couverture). Elle révèle
   tout de suite un **défaut** (voir plus bas). Couverture : 86,11 % des branches, dont 60 % seulement sur `db.js`.
3. **Mutation sur T1 : 89,73 %.** 185 mutants : 164 tués, 2 en timeout, **14 survivants, 5 sans couverture**.
4. **Analyse de chaque survivant** (tableau ci-dessous) : à chaque fois, il manquait une entrée ou une
   assertion. **Aucun mutant n'est équivalent.**
5. **Suite T2** : 21 tests ajoutés, chacun commenté avec le mutant qu'il tue. Mutation : **100 %**. Couverture :
   **100 %**, et le seuil passe à 100 % sur ce code critique pour interdire toute régression.

### Survivants de T1 analysés

| # | Lieu | Opérateur | Mutant | Statut T1 | Pourquoi il survivait | Test T2 qui le tue |
|---|---|---|---|---|---|---|
| 1 | `regles.js:64` | EqualityOperator | `nombre > 1` → `nombre >= 1` | survit | T1 ne teste que 2 et 3 : **valeur limite 1** jamais essayée | `pluriel(1)` = « 1 terminée » |
| 2 | `regles.js:64` | ConditionalExpression | `nombre > 1` → `true` | survit | idem | `pluriel(0)`, `pluriel(1)` |
| 3 | `regles.js:64` | StringLiteral | `''` → `"Stryker was here!"` | non couvert | la branche du singulier n'est jamais exécutée | compteur « 1 tâche, dont 0 terminée » |
| 4 | `regles.js:24` | MethodExpression | `nom.trim()` → `nom` | survit | **classe « espaces »** jamais essayée | `'   '` refusé, `'  Travail  '` → `'Travail'` |
| 5 | `regles.js:33` | MethodExpression | `titre.trim()` → `titre` | survit | idem pour le titre | `'    '` refusé, titre nettoyé |
| 6 | `regles.js:8` | StringLiteral | message « nom du projet obligatoire » → `""` | survit | **oracle dépendant du code** : T1 compare à la constante `MESSAGES`, qui mute en même temps | textes exacts de la spécification (`.feature`) |
| 7 | `regles.js:9` | StringLiteral | message « titre obligatoire » → `""` | survit | idem | idem |
| 8 | `regles.js:10` | StringLiteral | message « choisissez un projet » → `""` | survit | idem | idem |
| 9 | `db.js:13` | StringLiteral | `NOM_BASE` → `""` | survit | le nom de la base n'est jamais vérifié | schéma : la base `todo-inf563` est ouverte directement |
| 10 | `db.js:35` | StringLiteral | nom de l'index `nomNormalise` → `""` | survit | l'unicité marche toujours (elle porte sur le champ), seul le nom change | schéma : magasins, clés et index documentés |
| 11 | `db.js:19` | ArrowFunction | `onerror` de l'ouverture → `() => undefined` | survit | aucun échec d'ouverture testé | `VersionError` si la base est plus récente |
| 12 | `db.js:49` | ArrowFunction | `maintenant` → `() => undefined` | survit | les dates `creeLe`/`modifieLe` ne sont jamais vérifiées | **horloge injectée** : dates exactes à la création et à la modification |
| 13 | `db.js:72` | CallExpression | `curseur.result.continue()` supprimé | survit | la boucle n'est testée qu'avec **une** tâche | cascade avec 2 tâches, plus une tâche d'un autre projet |
| 14 | `db.js:92` | ConditionalExpression | `!lecture.result` → `false` | survit | aucune modification d'une tâche inexistante | `modifierTache(999)` rejette et n'écrit rien |
| 15 | `db.js:92` | BlockStatement | `{ tx.abort(); return; }` → `{}` | non couvert | idem | idem |
| 16 | `db.js:93` | CallExpression | `tx.abort()` supprimé | non couvert | idem | idem |
| 17 | `db.js:29` | StringLiteral | `'Transaction annulée'` → `""` | non couvert | idem | message de l'`AbortError` vérifié |
| 18 | `db.js:29` | StringLiteral | `'AbortError'` → `""` | non couvert | idem | nom de l'erreur vérifié |
| 19 | `db.js:107` | ArrowFunction | `fermer` → `() => undefined` | survit | la fermeture n'est jamais vérifiée | après `fermer()`, une lecture lève `InvalidStateError` |

Les 2 mutants **en timeout** (`onsuccess` → `() => undefined`, corps de la promesse vidé) laissent une promesse
qui ne se termine jamais : le test dépasse son délai. Comme PIT (`TIMED_OUT`), Stryker les compte comme détectés.

### Ce que montre la comparaison T1 / T2

- **La couverture ne voit pas l'oracle** : avec T1, `regles.js` était couvert à 100 % des lignes, et pourtant les
  trois mutants des messages survivaient. La couverture mesure ce qui est **exécuté**, la mutation ce qui est **vérifié**.
- **Les mutants de limite survivent quand les tests évitent les frontières** (`nombre > 1`) : la mutation mesure
  la qualité de l'analyse des valeurs limites.
- **Un oracle tiré du code ne détecte rien** : comparer un message à sa propre constante est une tautologie.
  L'oracle de T2 est le texte de la spécification (les fichiers `.feature`).

## Couverture des scénarios BDD : ce qu'ils n'exécutent pas

La mutation porte sur le code à risque, la couverture sur **toute l'application**, comme le recommande le cours.
L'interface (`app.js`) n'est exercée que dans le navigateur. Pendant les scénarios, le serveur de test instrumente
donc le JavaScript servi (Istanbul), comme l'agent JaCoCo instrumente le bytecode. Avant de quitter chaque page,
on relève `window.__coverage__`, puis nyc produit le rapport et applique le seuil de 80 % des branches.

| Non exécuté par les scénarios | Pourquoi | Où c'est vérifié |
|---|---|---|
| `app.js` 116-117 : filet de sécurité si IndexedDB refuse un doublon | l'écran refuse le doublon avant d'écrire ; il faudrait deux onglets concurrents | `db.js` rejette bien avec une `ConstraintError` (test unitaire) |
| `app.js` 193-194 : échec d'ouverture d'IndexedDB | impossible à provoquer dans un navigateur normal | `ouvrirBase` rejette avec une `VersionError` (test unitaire) |
| `db.js` 93-94, 107 : tâche inexistante, `fermer()` | inaccessibles depuis l'écran | tests unitaires T2 |
| `regles.js` 77 : projet introuvable (« ? ») | une tâche ne peut pas perdre son projet par l'interface | test unitaire `nomDuProjet` |

Les deux niveaux se complètent : les scénarios prouvent le comportement de bout en bout, les tests unitaires
couvrent les chemins d'erreur que l'interface ne peut pas atteindre (pyramide des tests).

## Défauts détectés par les tests

1. **Par les tests unitaires (version 2).** Ajouter un projet en double rejetait avec `null` au lieu d'une
   `ConstraintError`. Dans IndexedDB, `transaction.error` n'est renseignée qu'à l'annulation de la transaction ;
   elle vaut encore `null` dans `onerror`, où la promesse rejetait. Le filet de sécurité de `app.js`
   (`erreur?.name === 'ConstraintError'`) ne pouvait donc jamais fonctionner, et les scénarios BDD ne le voyaient
   pas, puisque l'écran refuse le doublon avant d'écrire. Correctif : rejeter dans `onabort` (commits « TDD (rouge) »
   puis « TDD (vert) »).
2. **Par les scénarios BDD (version 1).** « Les données survivent au rechargement de la page » échouait : l'étape
   « je coche la tâche » se fiait à la case cochée, or le navigateur coche la case **avant** la fin de l'écriture
   dans IndexedDB. Le point de synchronisation est l'attribut `data-terminee`, rendu **après** relecture de la base.

## Structure

```
.github/workflows/ci.yml        pipeline : couverture, mutation, BDD à chaque push
package.json                    scripts npm et dépendances (versions figées par package-lock.json)
vitest.config.js                tests unitaires + couverture Istanbul et ses seuils
stryker.config.mjs              test de mutation StrykerJS et son seuil
cucumber.mjs                    configuration Cucumber-js (profil « couverture »)
.nycrc.json                     rapport et seuils de couverture des scénarios
src/                            l'application, servie telle quelle au navigateur
  index.html, css/style.css
  js/regles.js                  règles métier : fonctions pures (validation, compteur, filtre…)
  js/db.js                      persistance IndexedDB (fabrique et horloge injectées)
  js/app.js                     interface : affichage, relit la base après chaque écriture
tests/unitaires/                regles.test.js, db.test.js (T1 puis T2)
features/                       01_projets, 02_taches, 03_persistance_indexeddb (.feature)
  step_definitions/             phrases Gherkin → actions et assertions
  support/monde.js              serveur, navigateur, contexte neuf par scénario, hooks
  support/page-todo.js          page object (tous les sélecteurs)
  support/base-indexeddb.js     oracle : lit et écrit IndexedDB sans passer par l'application
  support/couverture.js         instrumentation Istanbul et collecte de la couverture
outils/serveur.js               serveur HTTP (npm start, et scénarios)
docs/rapports/                  instantané des rapports
docs/v1-java/                   rapport PDF de la version 1 (Java)
```

## L'application

- créer un projet, le supprimer (ses tâches sont supprimées avec lui, **dans une seule transaction**) ;
- filtrer les tâches par projet ;
- ajouter une tâche dans un projet, la **modifier** (titre et/ou projet), la terminer ou la réouvrir, la supprimer ;
- compteur « *n* tâches, dont *k* terminées » ;
- textes insérés avec `textContent`, jamais `innerHTML` : pas d'injection HTML.

Schéma IndexedDB (base `todo-inf563`, version 1), vérifié par un test unitaire :

| Magasin | Champs | Index |
|---|---|---|
| `projets` | `id` (auto), `nom`, `nomNormalise`, `creeLe` | `nomNormalise` **unique** (refuse les doublons) |
| `taches` | `id` (auto), `titre`, `projetId`, `terminee`, `creeLe`, `modifieLe` | `projetId` (tâches d'un projet) |

## Choix techniques et justification

| Choix | Justification (cours) |
|---|---|
| **Vitest** | Exécute nativement les modules ES du navigateur ; Stryker sait le piloter. |
| **Istanbul** pour la couverture | L'outil de couverture de référence en JavaScript, l'équivalent de JaCoCo (instructions, branches, fonctions, lignes). |
| **StrykerJS** pour la mutation | L'équivalent de PIT : mêmes familles d'opérateurs, seuil d'échec, tests lancés par mutant limités à ceux qui couvrent la ligne. |
| **Mutation sur `regles.js` et `db.js` seulement** | « Score de mutation sur les modules à risque, couverture sur tout le projet » ; `app.js` n'est que de l'affichage, couvert par les scénarios. |
| **fake-indexeddb** | Une *fake* (doublure) : vraie implémentation d'IndexedDB en mémoire, rapide et neuve pour chaque test. |
| **Horloge injectée** | « Maîtriser le temps » : les dates sont vérifiées exactement, sans dépendre de l'heure d'exécution. |
| **Oracles indépendants du code** | Messages attendus tirés de la spécification ; scénarios vérifiés sur l'écran **et** dans IndexedDB lue directement. |
| **Gherkin en français, Cucumber-js, Playwright, page object** | Spécification exécutable ; assertions qui attendent automatiquement (aucune pause fixe) ; sélecteurs stables. |
| **Un contexte de navigateur neuf par scénario** | IndexedDB vide à chaque scénario : tests isolés et reproductibles (F.I.R.S.T.). |
| **Erreur JavaScript = scénario en échec, capture d'écran en cas d'échec** | Une exception ne passe pas inaperçue ; l'échec est diagnostiquable. |

## Scénarios

| Feature | Scénarios |
|---|---|
| [`01_projets.feature`](features/01_projets.feature) | créer un projet ; refuser un nom vide ; refuser un doublon (plan : même nom, casse différente, majuscules) et un doublon entouré d'espaces ; filtrer par projet ; supprimer un projet et ses tâches |
| [`02_taches.feature`](features/02_taches.feature) | ajouter ; refuser une tâche invalide (plan : sans titre, sans projet, ni l'un ni l'autre) et un titre fait d'espaces ; renommer ; déplacer vers un autre projet ; refuser un titre vidé pendant la modification ; annuler une modification ; terminer puis réouvrir ; supprimer ; titre contenant du HTML |
| [`03_persistance_indexeddb.feature`](features/03_persistance_indexeddb.feature) | base neuve vide ; données conservées après **rechargement** ; après **fermeture de l'onglet** ; affichage de données **déjà présentes** dans IndexedDB |

## Intégration continue

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) se déclenche à chaque `push` (toutes branches), à chaque
*pull request* et à la demande (`workflow_dispatch`), sur **Ubuntu 24.04 figé** avec Node.js 24 :

1. `npm ci` : dépendances aux versions exactes de `package-lock.json` ;
2. `npm run test:couverture` : tests unitaires et couverture Istanbul, **échec sous 100 %** ;
3. `npm run test:mutation` : StrykerJS, **échec sous 85 %** ;
4. `npm run test:bdd:couverture` : les 24 scénarios dans le **Google Chrome préinstallé** (aucun téléchargement
   de navigateur), puis couverture de l'application, **échec sous 80 % des branches** ;
5. publication de tous les rapports, même en cas d'échec.

## Lancer en local

Prérequis : Node.js 22 ou plus. Commandes pour PowerShell :

```powershell
npm ci                               # installe les dépendances
npx playwright install chromium      # une seule fois (ou bien $env:CANAL="chrome" pour utiliser Google Chrome)

npm run test:unitaires               # tests unitaires
npm run test:couverture              # + couverture Istanbul      → rapports/couverture-unitaire/index.html
npm run test:mutation                # test de mutation StrykerJS → rapports/mutation/index.html
npm run test:bdd                     # les 24 scénarios           → rapports/cucumber/cucumber.html
npm run test:bdd:couverture          # + couverture des scénarios → rapports/couverture-bdd/index.html
npm run verify                       # tout, comme la CI

$env:HEADLESS="false"; $env:SLOWMO="300"; npm run test:bdd    # démonstration : navigateur visible et ralenti
npx cucumber-js --tags "@persistance"                          # une seule feature (@projets, @taches, @persistance)

npm start                            # l'application à la main : http://127.0.0.1:8080
```

Les données sont visibles dans les outils de développement (F12 → Application → IndexedDB → `todo-inf563`).

## Lacunes de spécification rencontrées

| Question non tranchée par l'énoncé | Décision |
|---|---|
| « Maison » et « maison » sont-ils deux projets différents ? | Non : comparaison sans tenir compte de la casse ni des espaces autour (index unique `nomNormalise`). |
| Que deviennent les tâches d'un projet supprimé ? | Elles sont supprimées avec lui, dans la même transaction (sinon tâches orphelines). |
| Un titre fait uniquement d'espaces est-il valide ? | Non : refusé à l'ajout comme à la modification. |
| Une tâche peut-elle exister sans projet ? | Non : le projet est obligatoire. |
| Dans quel ordre afficher les tâches ? | Ordre de création (clé auto-incrémentée). |
| « 0 terminée » ou « 0 terminées » ? | Singulier jusqu'à 1, comme en français : « 0 terminée », « 1 tâche », « 2 tâches ». |

## Limites

- **`app.js` n'est pas soumis à la mutation** : Stryker active les mutants dans le processus Node des tests, pas
  dans un navigateur piloté par Playwright. L'interface est vérifiée par les scénarios et mesurée par la couverture.
- **fake-indexeddb reste une doublure** : un navigateur réel peut différer sur des détails. C'est pourquoi les
  scénarios BDD tournent aussi contre le vrai IndexedDB de Chrome.
- Les scénarios tournent sous Chromium ; Firefox et WebKit peuvent être ajoutés dans `features/support/monde.js`.
- `npm audit` signale des failles modérées dans des dépendances de nyc et de Stryker (glob, minimatch). Ce sont
  des outils de développement : rien n'est livré avec l'application.

## Historique

La **version 1 (Java)** : Maven, Cucumber-JVM et Playwright pour Java, 24 scénarios. Elle reste consultable avec
l'étiquette Git [`v1-java`](https://github.com/dradone237/inf563-bdd-todo-indexeddb/tree/v1-java), et son rapport
PDF est dans [`docs/v1-java/`](docs/v1-java/Rapport_Devoir2_v1_Java.pdf).
