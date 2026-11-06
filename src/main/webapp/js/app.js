/*
 * Interface de l'application To-Do. L'état affiché est toujours relu depuis
 * IndexedDB après chaque écriture : ce qui est à l'écran est ce qui est sauvegardé.
 * Les textes saisis sont insérés avec textContent (jamais innerHTML) : pas d'injection HTML.
 */
(() => {
  const etat = { projets: [], taches: [], projetSelectionne: null, tacheEnEdition: null };
  let base;

  const $ = (id) => document.getElementById(id);

  function creer(balise, attributs = {}, ...enfants) {
    const element = document.createElement(balise);
    for (const [cle, valeur] of Object.entries(attributs)) {
      if (cle === 'texte') element.textContent = valeur;
      else if (cle.startsWith('on')) element.addEventListener(cle.slice(2), valeur);
      else if (valeur === true) element.setAttribute(cle, '');
      else if (valeur !== false && valeur !== null && valeur !== undefined) element.setAttribute(cle, valeur);
    }
    element.append(...enfants);
    return element;
  }

  const afficherMessage = (texte) => { $('message').textContent = texte; };
  const projetDe = (tache) => etat.projets.find((p) => p.id === tache.projetId);
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

  async function recharger() {
    [etat.projets, etat.taches] = await Promise.all([base.listerProjets(), base.listerTaches()]);
    if (!etat.projets.some((p) => p.id === etat.projetSelectionne)) etat.projetSelectionne = null;
    afficher();
  }

  function afficher() {
    afficherProjets();
    afficherChoixProjet();
    afficherTaches();
    afficherCompteur();
  }

  function afficherProjets() {
    const tous = creer('li', {},
      creer('button', {
        type: 'button', class: 'projet', 'aria-label': 'Afficher tous les projets',
        'aria-pressed': String(etat.projetSelectionne === null), onclick: () => selectionnerProjet(null),
      }, 'Tous les projets ', creer('span', { class: 'nombre', texte: `(${etat.taches.length})` })));

    const projets = etat.projets.map((projet) => {
      const nombre = etat.taches.filter((t) => t.projetId === projet.id).length;
      return creer('li', { 'data-testid': 'projet' },
        creer('button', {
          type: 'button', class: 'projet', 'aria-label': `Afficher le projet ${projet.nom}`,
          'aria-pressed': String(etat.projetSelectionne === projet.id), onclick: () => selectionnerProjet(projet.id),
        }, `${projet.nom} `, creer('span', { class: 'nombre', texte: `(${nombre})` })),
        creer('button', {
          type: 'button', class: 'icone danger', 'aria-label': `Supprimer le projet ${projet.nom}`,
          title: 'Supprimer le projet et ses tâches', onclick: () => supprimerProjet(projet), texte: '✕',
        }));
    });

    $('liste-projets').replaceChildren(tous, ...projets);
  }

  function afficherChoixProjet() {
    const choix = $('projet-tache');
    const precedent = Number(choix.value) || null;
    const defaut = etat.projetSelectionne ?? (etat.projets.some((p) => p.id === precedent) ? precedent : null);
    choix.replaceChildren(
      creer('option', { value: '', texte: '— Choisir un projet —' }),
      ...etat.projets.map((p) => creer('option', { value: String(p.id), texte: p.nom })));
    choix.value = defaut === null ? '' : String(defaut);
  }

  function afficherTaches() {
    const visibles = etat.taches.filter((t) => etat.projetSelectionne === null || t.projetId === etat.projetSelectionne);
    $('liste-taches').replaceChildren(...visibles.map((t) => (t.id === etat.tacheEnEdition ? elementEdition(t) : elementTache(t))));
    $('liste-vide').hidden = visibles.length > 0;
    document.querySelector('[data-edition] input')?.focus();
  }

  function elementTache(tache) {
    return creer('li', { class: tache.terminee ? 'tache terminee' : 'tache', 'data-testid': 'tache', 'data-terminee': String(tache.terminee) },
      creer('input', {
        type: 'checkbox', checked: tache.terminee, 'aria-label': `Terminer « ${tache.titre} »`,
        onchange: (e) => changerEtat(tache, e.target.checked),
      }),
      creer('span', { class: 'titre', 'data-testid': 'tache-titre', texte: tache.titre }),
      creer('span', { class: 'badge', 'data-testid': 'tache-projet', texte: projetDe(tache)?.nom ?? '?' }),
      creer('button', { type: 'button', class: 'secondaire', 'aria-label': `Modifier « ${tache.titre} »`, onclick: () => commencerEdition(tache), texte: 'Modifier' }),
      creer('button', { type: 'button', class: 'danger', 'aria-label': `Supprimer « ${tache.titre} »`, onclick: () => supprimerTache(tache), texte: 'Supprimer' }));
  }

  function elementEdition(tache) {
    const champ = creer('input', { 'aria-label': 'Nouveau titre', value: tache.titre, maxlength: '120' });
    const choix = creer('select', { 'aria-label': 'Nouveau projet' },
      ...etat.projets.map((p) => creer('option', { value: String(p.id), selected: p.id === tache.projetId, texte: p.nom })));
    return creer('li', { class: 'tache edition', 'data-testid': 'tache', 'data-edition': 'true' },
      creer('form', {
        class: 'ligne', novalidate: true,
        onsubmit: (e) => { e.preventDefault(); enregistrerEdition(tache, champ.value, Number(choix.value)); },
      }, champ, choix,
      creer('button', { type: 'submit', texte: 'Enregistrer' }),
      creer('button', { type: 'button', class: 'secondaire', onclick: annulerEdition, texte: 'Annuler' })));
  }

  function afficherCompteur() {
    const total = etat.taches.length;
    const faites = etat.taches.filter((t) => t.terminee).length;
    $('compteur').textContent = total === 0
      ? 'Aucune tâche'
      : `${pluriel(total, 'tâche')}, dont ${pluriel(faites, 'terminée')}`;
  }

  // ---- Actions -------------------------------------------------------------

  async function ajouterProjet(nom) {
    const propre = nom.trim();
    if (!propre) return afficherMessage('Le nom du projet est obligatoire.');
    const existant = etat.projets.find((p) => p.nomNormalise === TodoDb.normaliser(propre));
    if (existant) return afficherMessage(`Le projet « ${existant.nom} » existe déjà.`);
    try {
      await base.ajouterProjet(propre);
    } catch (erreur) {
      // Filet de sécurité : l'index unique d'IndexedDB refuse aussi le doublon
      if (erreur?.name === 'ConstraintError') return afficherMessage(`Le projet « ${propre} » existe déjà.`);
      throw erreur;
    }
    $('nom-projet').value = '';
    afficherMessage('');
    await recharger();
  }

  async function supprimerProjet(projet) {
    await base.supprimerProjet(projet.id);
    afficherMessage('');
    await recharger();
  }

  function selectionnerProjet(id) {
    etat.projetSelectionne = id;
    afficher();
  }

  async function ajouterTache(titre, projetId) {
    const propre = titre.trim();
    if (!propre) return afficherMessage('Le titre de la tâche est obligatoire.');
    if (!projetId) return afficherMessage('Choisissez un projet pour la tâche.');
    await base.ajouterTache({ titre: propre, projetId });
    $('titre-tache').value = '';
    afficherMessage('');
    await recharger();
  }

  function commencerEdition(tache) {
    etat.tacheEnEdition = tache.id;
    afficherMessage('');
    afficherTaches();
  }

  function annulerEdition() {
    etat.tacheEnEdition = null;
    afficherMessage('');
    afficherTaches();
  }

  async function enregistrerEdition(tache, titre, projetId) {
    const propre = titre.trim();
    if (!propre) return afficherMessage('Le titre de la tâche est obligatoire.');
    await base.modifierTache(tache.id, { titre: propre, projetId });
    etat.tacheEnEdition = null;
    afficherMessage('');
    await recharger();
  }

  async function changerEtat(tache, terminee) {
    await base.modifierTache(tache.id, { terminee });
    await recharger();
  }

  async function supprimerTache(tache) {
    await base.supprimerTache(tache.id);
    afficherMessage('');
    await recharger();
  }

  // ---- Démarrage -----------------------------------------------------------

  async function demarrer() {
    base = await TodoDb.ouvrir();
    $('form-projet').addEventListener('submit', (e) => {
      e.preventDefault();
      ajouterProjet($('nom-projet').value);
    });
    $('form-tache').addEventListener('submit', (e) => {
      e.preventDefault();
      ajouterTache($('titre-tache').value, Number($('projet-tache').value) || null);
    });
    await recharger();
    document.body.dataset.pret = 'true';
  }

  demarrer().catch((erreur) => {
    afficherMessage(`Impossible d'ouvrir la base IndexedDB : ${erreur?.message ?? erreur}`);
    console.error(erreur);
  });
})();
