package cm.inf563.todo.support;

import java.util.List;
import java.util.Map;

/**
 * Oracle indépendant de l'application : lit et écrit IndexedDB directement avec
 * l'API du navigateur, sans passer par le code de l'application (js/db.js).
 * Un scénario vérifie ainsi ce qui est réellement sauvegardé, pas seulement l'écran.
 */
public class BaseIndexedDb {

    public record TacheStockee(String titre, String projet, boolean terminee) {
    }

    private static final String OUVRIR = """
            const ouvrir = () => new Promise((ok, ko) => {
              const r = indexedDB.open('todo-inf563');
              r.onsuccess = () => ok(r.result);
              r.onerror = () => ko(r.error);
            });
            """;

    private static final String LIRE = "async () => {" + OUVRIR + """
              const db = await ouvrir();
              const lire = (store) => new Promise((ok, ko) => {
                const r = db.transaction(store).objectStore(store).getAll();
                r.onsuccess = () => ok(r.result);
                r.onerror = () => ko(r.error);
              });
              const projets = await lire('projets');
              const taches = await lire('taches');
              db.close();
              return {
                projets: projets.map(p => p.nom),
                taches: taches.map(t => ({
                  titre: t.titre,
                  projet: (projets.find(p => p.id === t.projetId) || { nom: '(projet introuvable)' }).nom,
                  terminee: t.terminee === true
                }))
              };
            }
            """;

    private static final String ECRIRE = "async (lignes) => {" + OUVRIR + """
              const db = await ouvrir();
              const tx = db.transaction(['projets', 'taches'], 'readwrite');
              const idsProjets = new Map();
              const date = new Date().toISOString();
              lignes.forEach((l, i) => {
                if (!idsProjets.has(l.projet)) {
                  idsProjets.set(l.projet, idsProjets.size + 1);
                  tx.objectStore('projets').add({ id: idsProjets.get(l.projet), nom: l.projet,
                    nomNormalise: l.projet.trim().toLocaleLowerCase('fr'), creeLe: date });
                }
                tx.objectStore('taches').add({ id: i + 1, titre: l.titre, projetId: idsProjets.get(l.projet),
                  terminee: l.terminee, creeLe: date, modifieLe: date });
              });
              await new Promise((ok, ko) => {
                tx.oncomplete = ok;
                tx.onerror = () => ko(tx.error);
                tx.onabort = () => ko(tx.error);
              });
              db.close();
            }
            """;

    private final Navigateur navigateur;

    public BaseIndexedDb(Navigateur navigateur) {
        this.navigateur = navigateur;
    }

    @SuppressWarnings("unchecked")
    public List<String> projets() {
        Map<String, Object> contenu = (Map<String, Object>) navigateur.page().evaluate(LIRE);
        return (List<String>) contenu.get("projets");
    }

    @SuppressWarnings("unchecked")
    public List<TacheStockee> taches() {
        Map<String, Object> contenu = (Map<String, Object>) navigateur.page().evaluate(LIRE);
        return ((List<Map<String, Object>>) contenu.get("taches")).stream()
                .map(t -> new TacheStockee((String) t.get("titre"), (String) t.get("projet"), (Boolean) t.get("terminee")))
                .toList();
    }

    /** Pré-remplit la base (l'application doit avoir été ouverte une fois pour créer le schéma). */
    public void inserer(List<TacheStockee> taches) {
        List<Map<String, Object>> lignes = taches.stream()
                .map(t -> Map.<String, Object>of("titre", t.titre(), "projet", t.projet(), "terminee", t.terminee()))
                .toList();
        navigateur.page().evaluate(ECRIRE, lignes);
    }
}
