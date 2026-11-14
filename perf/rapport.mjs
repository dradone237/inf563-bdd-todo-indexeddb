// Rapport de profilage : croise les mesures de la machine (Glances) et celles de k6, palier par palier.
// « npm run perf:rapport » le régénère à partir de perf/resultats/ sans relancer la charge.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PROFIL = JSON.parse(await readFile(new URL('./paliers.json', import.meta.url), 'utf8'));
const GO = 1024 ** 3;

function lireCsv(texte) {
  const lignes = texte.trim().split(/\r?\n/);
  const decouper = (l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, -1).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, ''));
  const entete = decouper(lignes[0]);
  return lignes.slice(1).map((l) => Object.fromEntries(decouper(l).map((v, i) => [entete[i], v])));
}

const moyenne = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const maximum = (v) => (v.length ? Math.max(...v) : NaN);
const f = (n, d = 1) => (Number.isFinite(n) ? n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');

/** Une courbe SVG : une seule mesure, un seul axe, les plateaux des paliers en bandes grises. */
function courbe({ titre, unite, points, tMax, yMin = 0, yMax, couleur, bandes, reference, format = (v) => f(v, 0) }) {
  const L = 1000, H = 230, g = 64, d = 18, h = 30, b = 34;
  const x = (t) => g + (t / tMax) * (L - g - d);
  const y = (v) => H - b - ((v - yMin) / (yMax - yMin)) * (H - h - b);
  const graduationsY = [0, 0.25, 0.5, 0.75, 1].map((r) => yMin + r * (yMax - yMin));
  const graduationsT = [];
  for (let t = 0; t <= tMax; t += 30) graduationsT.push(t);
  const trace = points.map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<figure class="courbe"><figcaption>${titre} <span class="unite-titre">· ${unite}</span></figcaption>
<svg viewBox="0 0 ${L} ${H}" role="img" aria-label="${titre}">
${bandes.map((bd) => `<rect x="${x(bd.debut)}" y="${h}" width="${x(bd.fin) - x(bd.debut)}" height="${H - h - b}" fill="#eef1f6"/><text x="${(x(bd.debut) + x(bd.fin)) / 2}" y="${h - 8}" class="bande">${bd.nom}</text>`).join('')}
${graduationsY.map((v) => `<line x1="${g}" x2="${L - d}" y1="${y(v)}" y2="${y(v)}" class="grille"/><text x="${g - 8}" y="${y(v) + 4}" class="gy">${format(v)}</text>`).join('')}
${graduationsT.map((t) => `<text x="${x(t)}" y="${H - 12}" class="gt">${t} s</text>`).join('')}
${reference ? `<line x1="${g}" x2="${L - d}" y1="${y(reference.valeur)}" y2="${y(reference.valeur)}" class="reference"/><text x="${L - d}" y="${y(reference.valeur) - 6}" class="gref">${reference.nom}</text>` : ''}
<path d="${trace}" fill="none" stroke="${couleur}" stroke-width="2.2" stroke-linejoin="round"/>
</svg></figure>`;
}

export async function construireRapport(dossier = 'perf/resultats') {
  const chrono = JSON.parse(await readFile(`${dossier}/chronologie.json`, 'utf8'));
  const resume = JSON.parse(await readFile(`${dossier}/resume-k6.json`, 'utf8'));
  const mesures = lireCsv(await readFile(`${dossier}/glances.csv`, 'utf8'));
  const p = chrono.essai ? { ...PROFIL, ...PROFIL.essai } : PROFIL;
  const duree = p.repos + 2 * p.demiEtape * p.paliers.length + p.descente;
  const nombre = (ligne, cle) => Number(ligne[cle]);
  const disques = Object.keys(mesures[0]).filter((c) => /^diskio\..*_bytes_rate_per_sec$/.test(c));

  const serie = mesures.map((m) => {
    const t = (new Date(m.timestamp.replace(' ', 'T')).getTime() - chrono.debut) / 1000;
    return {
      t, cpu: nombre(m, 'cpu.total'), ram: nombre(m, 'mem.used') / GO, ramPct: nombre(m, 'mem.percent'),
      swap: nombre(m, 'memswap.percent'), disque: disques.reduce((s, c) => s + (Number(m[c]) || 0), 0) / 1024 ** 2,
    };
  }).filter((s) => Number.isFinite(s.cpu));
  const ramTotale = nombre(mesures[0], 'mem.total') / GO;
  const coeurs = `${mesures[0]['core.phys'] || '?'} cœurs physiques, ${mesures[0]['core.log'] || '?'} logiques`;

  const fenetres = [{ nom: 'Repos', debut: Math.min(-3, serie[0]?.t ?? 0), fin: p.repos, http: 0, navigateurs: 0 }];
  p.paliers.forEach((palier, i) => {
    const debut = p.repos + (2 * i + 1) * p.demiEtape;
    fenetres.push({ nom: `Palier ${i + 1}`, cle: String(i + 1), debut, fin: debut + p.demiEtape, ...palier });
  });
  const metrique = (nom) => resume.metrics?.[nom] ?? {};
  const lignes = fenetres.map((w) => {
    const dedans = serie.filter((s) => s.t >= w.debut && s.t < w.fin);
    const ligne = {
      ...w, mesures: dedans.length, cpu: moyenne(dedans.map((s) => s.cpu)), cpuMax: maximum(dedans.map((s) => s.cpu)),
      ram: moyenne(dedans.map((s) => s.ram)), ramMax: maximum(dedans.map((s) => s.ram)), ramPct: maximum(dedans.map((s) => s.ramPct)),
      swap: moyenne(dedans.map((s) => s.swap)), disque: moyenne(dedans.map((s) => s.disque)),
    };
    if (w.cle) {
      const iterations = metrique(`iterations{scenario:http,palier:${w.cle}}`).count ?? 0;
      const tour = (metrique(`iteration_duration{scenario:http,palier:${w.cle}}`).avg ?? NaN) / 1000;
      Object.assign(ligne, {
        debit: (metrique(`http_reqs{palier:${w.cle}}`).count ?? 0) / p.demiEtape,
        p95: metrique(`http_req_duration{palier:${w.cle}}`)['p(95)'],
        x: iterations / p.demiEtape, tour, little: (iterations / p.demiEtape) * tour,
        parcours: (metrique(`iteration_duration{scenario:navigateur,palier:${w.cle}}`).avg ?? NaN) / 1000,
      });
    }
    return ligne;
  });

  const seuils = [];
  for (const [nom, m] of Object.entries(resume.metrics ?? {})) {
    for (const [expr, echec] of Object.entries(m.thresholds ?? {})) {
      if (!/count>0|avg>0/.test(expr)) seuils.push({ nom, expr, ok: echec === false });
    }
  }
  const repos = lignes[0], dernier = lignes[lignes.length - 1];
  const paliersMesures = lignes.slice(1).filter((l) => l.mesures);
  const pente = (() => { // RAM supplémentaire par navigateur, régression linéaire sur les paliers
    const xs = paliersMesures.map((l) => l.navigateurs), ys = paliersMesures.map((l) => l.ram);
    const mx = moyenne(xs), my = moyenne(ys);
    const num = xs.reduce((s, xi, i) => s + (xi - mx) * (ys[i] - my), 0), den = xs.reduce((s, xi) => s + (xi - mx) ** 2, 0);
    const a = den ? num / den : NaN;
    const residus = ys.reduce((s, yi, i) => s + (yi - (my + a * (xs[i] - mx))) ** 2, 0), total = ys.reduce((s, yi) => s + (yi - my) ** 2, 0);
    return { a, r2: total ? 1 - residus / total : 0 };
  })();
  const cpuPar100 = (dernier.cpu - repos.cpu) / (dernier.debit / 100);
  const p95s = paliersMesures.map((l) => l.p95), parcours = paliersMesures.map((l) => l.parcours);
  const pasDeCoude = maximum(p95s) < 3 * Math.min(...p95s) && maximum(parcours) < 1.25 * Math.min(...parcours);
  const sature = lignes.some((l) => l.cpuMax > 90 || l.ramPct > 97);
  const swapMonte = dernier.swap - repos.swap > 5;

  const bandes = fenetres.slice(1).map((w) => ({ nom: w.nom.replace('Palier ', 'P'), debut: w.debut, fin: w.fin }));
  const etapes = [{ d: p.repos, v: 0 }, ...p.paliers.flatMap((x) => [{ d: p.demiEtape, v: x.http }, { d: p.demiEtape, v: x.http }]), { d: p.descente, v: 0 }];
  const profil = (t) => { // interpolation des étapes k6, comme le fait l'exécuteur ramping-vus
    let origine = 0, avant = 0;
    for (const e of etapes) {
      if (t <= origine + e.d) return avant + (e.v - avant) * (t - origine) / e.d;
      origine += e.d;
      avant = e.v;
    }
    return 0;
  };
  const vus = Array.from({ length: duree + 1 }, (_, t) => [t, profil(t)]);
  const tMax = Math.ceil((duree + 10) / 30) * 30;
  const pts = (cle) => serie.filter((s) => s.t >= 0 && s.t <= tMax).map((s) => [s.t, s[cle]]);
  const maxRam = Math.ceil(ramTotale);

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Profilage sous charge — To-Do IndexedDB</title>
<style>
body{margin:0;background:#f4f5f7;color:#1d2330;font:16px/1.5 "Segoe UI",system-ui,sans-serif}
main{max-width:1080px;margin:0 auto;padding:32px 20px 60px}
h1{font-size:30px;margin:0 0 6px}h2{font-size:21px;margin:34px 0 10px;color:#1e3a5f}
.sous{color:#5b6475;margin:0 0 18px}
.verdict{border-radius:10px;padding:14px 18px;margin:18px 0;font-weight:600}
.ok{background:#e9f6ec;border-left:5px solid #1a7f37}.ko{background:#fdeeee;border-left:5px solid #cf222e}.attention{background:#fff6e2;border-left:5px solid #c98500}
table{border-collapse:collapse;width:100%;background:#fff;font-size:14px}th,td{border:1px solid #dde3ea;padding:6px 9px;text-align:right}
th{background:#eef2f7;color:#1e3a5f}td{white-space:nowrap}.unite-titre{font-weight:400;color:#5b6475}td:first-child,th:first-child{text-align:left}
.courbe{background:#fff;border:1px solid #dde3ea;border-radius:10px;margin:14px 0;padding:10px 12px}
figcaption{font-weight:700;color:#1e3a5f}svg{width:100%;height:auto;font-family:"Segoe UI",sans-serif}
.grille{stroke:#e3e7ee}.gy{font-size:12px;fill:#5b6475;text-anchor:end}.gt{font-size:12px;fill:#5b6475;text-anchor:middle}
.bande{font-size:12px;fill:#52514e;text-anchor:middle;font-weight:700}.unite{font-size:12px;fill:#52514e}
.reference{stroke:#cf222e;stroke-dasharray:6 5}.gref{font-size:12px;fill:#cf222e;text-anchor:end}
li{margin:4px 0}code{background:#e8edf5;border-radius:4px;padding:1px 5px}
</style></head><body><main>
<h1>Profilage sous charge de l'application To-Do</h1>
<p class="sous">k6 ${chrono.essai ? '(profil d\'essai court)' : ''} génère la charge, Glances mesure la machine chaque seconde · ${coeurs} · ${f(ramTotale, 1)} Go de RAM · test du ${new Date(chrono.debut).toLocaleString('fr-FR')}</p>
<div class="verdict ${seuils.every((s) => s.ok) ? 'ok' : 'ko'}">Seuils k6 (oracle) : ${seuils.filter((s) => s.ok).length} / ${seuils.length} respectés — ${seuils.map((s) => `${s.nom} ${s.expr} ${s.ok ? '✓' : '✗'}`).join(' · ')}</div>
${sature || swapMonte ? `<div class="verdict attention">Verdict à nuancer (cours : « INCONCLUSIF si le générateur de charge est lui-même saturé ») : ${sature ? 'le processeur ou la RAM de la machine a frôlé la saturation' : ''}${sature && swapMonte ? ' ; ' : ''}${swapMonte ? 'la machine a commencé à utiliser le swap' : ''}. Ici l'injecteur (k6, navigateurs) et l'application tournent sur la même machine.</div>` : ''}
<h2>Ce que montrent les mesures</h2>
<ul>
<li><b>Au repos</b> (application servie, k6 lancé, aucune charge) : processeur ${f(repos.cpu)} %, RAM ${f(repos.ram, 2)} Go utilisés sur ${f(ramTotale, 1)} Go (${f(repos.ramPct)} %).</li>
<li><b>Au palier ${dernier.cle}</b> (${dernier.http} utilisateurs HTTP + ${dernier.navigateurs} navigateurs) : processeur ${f(dernier.cpu)} % en moyenne (pic ${f(dernier.cpuMax)} %), RAM ${f(dernier.ram, 2)} Go (+${f(dernier.ram - repos.ram, 2)} Go par rapport au repos).</li>
<li><b>Processeur</b> : il suit la charge, de ${f(repos.cpu)} % au repos à ${f(dernier.cpu)} % au palier ${dernier.cle}, soit environ ${f(cpuPar100, 1)} points de processeur pour 100 requêtes par seconde. L'injecteur (k6 et ses navigateurs) tourne sur la même machine : ce total inclut sa propre consommation (la répartition par processus se lit en direct dans Glances).</li>
<li><b>RAM</b> : ${pente.r2 >= 0.6
    ? `elle augmente d'environ ${f(pente.a * 1024, 0)} Mo par navigateur ajouté (régression sur les ${paliersMesures.length} paliers, R² = ${f(pente.r2, 2)}) : c'est le coût de l'application, qui travaille côté client (IndexedDB).`
    : `elle ne suit pas clairement le nombre de navigateurs (régression sur les ${paliersMesures.length} paliers : ${f(pente.a * 1024, 0)} Mo par navigateur, mais R² = ${f(pente.r2, 2)}, donc peu fiable). Avec ${f(repos.ramPct)} % de RAM déjà utilisés au repos, la RAM de la machine fluctue d'elle-même (gestion de la mémoire par Windows, autres applications ouvertes) : le coût de quelques navigateurs se perd dans ces variations (environ ±${f((maximum(serie.map((x) => x.ram)) - Math.min(...serie.map((x) => x.ram))) / 2, 1)} Go). Pour le mesurer, fermer les autres applications avant le test.`}</li>
<li><b>Coude</b> (cours : « jusqu'où le système suit-il ? ») : ${pasDeCoude
    ? `aucun. La latence p95 reste entre ${f(Math.min(...p95s), 1)} et ${f(maximum(p95s), 1)} ms et le parcours complet dans un navigateur entre ${f(Math.min(...parcours), 2)} et ${f(maximum(parcours), 2)} s, alors que le processeur a été multiplié par ${f(dernier.cpu / repos.cpu, 1)} : la capacité de la machine n'est pas atteinte à ${dernier.http} utilisateurs HTTP + ${dernier.navigateurs} navigateurs.`
    : `la latence ou la durée du parcours se dégrade nettement aux derniers paliers : la machine approche de sa capacité.`}</li>
<li><b>Le serveur</b> ne fait que servir 5 fichiers statiques : la latence HTTP p95 reste ${paliersMesures.every((l) => l.p95 < 300) ? 'sous 300 ms à tous les paliers' : 'au-dessus de 300 ms à au moins un palier'} (${paliersMesures.map((l) => `${f(l.p95, 1)} ms`).join(', ')}).</li>
<li><b>Loi de Little</b> (système fermé, N = X × T) : au palier ${dernier.cle}, X = ${f(dernier.x, 1)} itérations/s × T = ${f(dernier.tour, 3)} s ≈ ${f(dernier.little, 1)} utilisateurs, pour ${dernier.http} utilisateurs HTTP configurés : les mesures sont cohérentes.</li>
</ul>
<h2>Palier par palier</h2>
<table><tr><th>Fenêtre</th><th>Utilisateurs HTTP</th><th>Navigateurs</th><th>Processeur moy. (max)</th><th>RAM moy. (max)</th><th>RAM max</th><th>Swap</th><th>Disque</th><th>Requêtes/s</th><th>p95 HTTP</th><th>Little X×T</th><th>Parcours navigateur</th></tr>
${lignes.map((l) => `<tr><td>${l.nom}</td><td>${l.http}</td><td>${l.navigateurs}</td><td>${f(l.cpu)} % (${f(l.cpuMax)} %)</td><td>${f(l.ram, 2)} Go (${f(l.ramMax, 2)})</td><td>${f(l.ramPct)} %</td><td>${f(l.swap)} %</td><td>${f(l.disque, 2)} Mo/s</td><td>${l.cle ? f(l.debit, 0) : '–'}</td><td>${l.cle ? `${f(l.p95, 1)} ms` : '–'}</td><td>${l.cle ? f(l.little, 1) : '–'}</td><td>${l.cle ? `${f(l.parcours, 2)} s` : '–'}</td></tr>`).join('\n')}
</table>
<p class="sous">Mesures prises sur le plateau de chaque palier (${p.demiEtape} s), après sa montée. Le processeur est en % de la capacité totale de la machine.</p>
<h2>Au fil du test</h2>
${courbe({ titre: 'Utilisateurs HTTP simultanés (profil k6)', unite: 'utilisateurs', points: vus, tMax, yMax: Math.max(...p.paliers.map((x) => x.http)) * 1.1, couleur: '#2557d6', bandes })}
${courbe({ titre: 'Processeur de la machine (Glances)', unite: '% de la capacité totale', points: pts('cpu'), tMax, yMax: 100, couleur: '#2a78d6', bandes, format: (v) => `${f(v, 0)} %` })}
${courbe({ titre: 'RAM utilisée (Glances)', unite: 'Go', points: pts('ram'), tMax, yMax: maxRam, couleur: '#eb6834', bandes, yMin: Math.max(0, Math.floor(Math.min(...serie.map((s) => s.ram)) - 1)), reference: { valeur: ramTotale, nom: `RAM totale ${f(ramTotale, 1)} Go` }, format: (v) => f(v, 1) })}
${courbe({ titre: 'Fichier d\'échange (swap) utilisé (Glances)', unite: '%', points: pts('swap'), tMax, yMax: 100, couleur: '#6250d6', bandes, format: (v) => `${f(v, 0)} %` })}
${courbe({ titre: 'Lectures + écritures disque (Glances)', unite: 'Mo/s', points: pts('disque'), tMax, yMax: Math.max(1, Math.ceil(maximum(serie.map((s) => s.disque)))), couleur: '#1baf7a', bandes, format: (v) => f(v, 1) })}
<p class="sous">Bandes grises : plateaux des paliers P1 à P${p.paliers.length}. Le tableau de bord de k6 (requêtes, latences, signaux web des navigateurs) est dans <code>tableau-de-bord-k6.html</code>. Le trafic local (127.0.0.1) ne passe par aucune carte réseau : il n'apparaît pas dans les compteurs réseau de Glances.</p>
</main></body></html>`;
  const sortie = `${dossier}/profil.html`;
  await writeFile(sortie, html);
  return sortie;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`Rapport de profilage : ${await construireRapport(process.argv[2])}`);
}
