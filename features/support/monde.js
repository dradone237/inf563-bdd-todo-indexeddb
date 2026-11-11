/*
 * Infrastructure des scénarios :
 *   - un serveur HTTP local sert src/ sur un port libre (IndexedDB exige une origine http://) ;
 *   - un seul navigateur Chromium pour toute la suite ;
 *   - un contexte de navigation neuf par scénario : IndexedDB vide, scénarios isolés et rejouables.
 * Variables d'environnement : HEADLESS=false pour voir le navigateur, SLOWMO=300 pour ralentir,
 * CANAL=chrome pour utiliser le Google Chrome installé (en CI : aucun téléchargement).
 */
import { After, AfterAll, Before, BeforeAll, Status, World, setDefaultTimeout, setWorldConstructor } from '@cucumber/cucumber';
import { chromium } from '@playwright/test';
import { demarrerServeur } from '../../outils/serveur.js';
import { BaseIndexedDb } from './base-indexeddb.js';
import * as couverture from './couverture.js';
import { PageTodo } from './page-todo.js';

setDefaultTimeout(30_000);

let serveur;
let navigateur;

BeforeAll(async function () {
  const avecCouverture = this.parameters.couverture === true;
  if (avecCouverture) await couverture.reinitialiser();
  serveur = await demarrerServeur({ instrumenter: avecCouverture ? couverture.instrumenter : undefined });
  navigateur = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: Number(process.env.SLOWMO ?? 0),
    channel: process.env.CANAL || undefined,
  });
});

AfterAll(async function () {
  await navigateur?.close();
  await serveur?.arreter();
  if (this.parameters.couverture === true) await couverture.enregistrer();
});

class MondeTodo extends World {
  erreursJavaScript = [];

  get urlApplication() {
    return `${serveur.url}index.html`;
  }

  async ouvrirContexte() {
    this.contexte = await navigateur.newContext({ locale: 'fr-FR' });
    this.contexte.setDefaultTimeout(10_000);
    this.page = await this.nouvellePage();
    this.todo = new PageTodo(this);
    this.base = new BaseIndexedDb(this);
  }

  async nouvellePage() {
    const page = await this.contexte.newPage();
    // Une erreur JavaScript non interceptée doit faire échouer le scénario, pas passer inaperçue
    page.on('pageerror', (erreur) => this.erreursJavaScript.push(erreur.message));
    return page;
  }

  /** Avant de quitter une page, on récupère le code qu'elle a exécuté (sinon il serait perdu). */
  async collecterCouverture() {
    if (this.parameters.couverture === true && !this.page.isClosed()) {
      couverture.ajouter(await this.page.evaluate(() => globalThis.__coverage__ ?? null));
    }
  }

  async recharger() {
    await this.collecterCouverture();
    await this.page.reload();
  }

  /** Ferme l'onglet courant et en ouvre un autre dans le même profil (même stockage IndexedDB). */
  async changerDOnglet() {
    await this.collecterCouverture();
    await this.page.close();
    this.page = await this.nouvellePage();
  }
}

setWorldConstructor(MondeTodo);

Before(async function () {
  await this.ouvrirContexte();
});

After(async function ({ result }) {
  if (result?.status === Status.FAILED && !this.page.isClosed()) {
    this.attach(await this.page.screenshot({ fullPage: true }), 'image/png');
  }
  await this.collecterCouverture();
  await this.contexte.close();
  if (this.erreursJavaScript.length > 0) {
    throw new Error(`Erreur(s) JavaScript dans l'application : ${this.erreursJavaScript.join(' | ')}`);
  }
});
