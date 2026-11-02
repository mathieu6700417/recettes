#!/usr/bin/env node
// Migration v1 -> v2 des recettes (src/content/recettes/*.md).
// Usage : node scripts/migrer-v1.mjs [--liens <fichier.yaml>] [--apercu]
//
// Partie mécanique : front matter, temps, difficulté, étapes, source, ingrédients
// (via scripts/correspondance-ingredients-v1.yaml) et liens v1 reportés tels quels
// (cuisson_technique -> cuisson, bases -> composants, variante_de -> substitution).
// Partie jugement : un fichier --liens (YAML, clé = slug v1) qui remplace, pour chaque
// recette, tout ou partie de : titre, resume, cuisson, composants, substitution, profils,
// principe (corps de la préparation), notes (corps de la version), version (champs de la
// version : ingredients, etapes, temps, difficulte, portions, titre, ecarts, statut…).
// --apercu : n'écrit rien, affiche les ingrédients tels que le site les rendra.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const V1 = path.join(RACINE, 'src/content/recettes');
const PREP = path.join(RACINE, 'src/content/preparations');
const VERS = path.join(RACINE, 'src/content/versions');
const TABLE = path.join(RACINE, 'scripts/correspondance-ingredients-v1.yaml');

const args = process.argv.slice(2);
const apercu = args.includes('--apercu');
const iL = args.indexOf('--liens');
const liens = iL >= 0 ? yaml.load(fs.readFileSync(args[iL + 1], 'utf8')) ?? {} : {};

// Recettes v1 qui deviennent une version non de référence d'une autre préparation.
const VERSIONS_SECONDAIRES = { 'blanquette-de-veau-maison': { preparation: 'blanquette-de-veau', version: 'maison' } };
const SLUGS_BASES_V1 = { marinade: 'marinade-au-vin', fond: null };

// ---------- référentiel (pour l'aperçu) ----------
const referentiel = {};
for (const f of fs.readdirSync(path.join(RACINE, 'src/content/ingredients'))) {
  const y = yaml.load(fs.readFileSync(path.join(RACINE, 'src/content/ingredients', f), 'utf8'));
  for (const i of y.ingredients ?? []) referentiel[i.slug] = i;
}

// ---------- lecture v1 ----------
const lire = (fichier) => {
  const t = fs.readFileSync(fichier, 'utf8');
  const m = t.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`front matter introuvable : ${fichier}`);
  return { fm: yaml.load(m[1]), corps: m[2].trim() };
};

// ---------- ingrédients ----------
const table = yaml.load(fs.readFileSync(TABLE, 'utf8'));
const lignesTable = (recette) => table.filter((r) => r.recette === recette);

// Chaque ligne v1 consomme, dans l'ordre, les lignes de la table qui portent son nom_v1.
// Si une ligne v1 produit plusieurs entrées (« sel, poivre », bouquet garni), elles se suivent.
function migrerIngredients(recette, ingredientsV1) {
  const rangees = lignesTable(recette);
  const parNom = {};
  for (const r of rangees) (parNom[r.nom_v1] ??= []).push(r);
  const nbLignesV1 = {};
  for (const l of ingredientsV1) nbLignesV1[l.nom] = (nbLignesV1[l.nom] ?? 0) + 1;
  const sortie = [];
  for (const l of ingredientsV1) {
    const dispo = parNom[l.nom];
    if (!dispo?.length) throw new Error(`${recette} : pas de correspondance pour « ${l.nom} »`);
    const parLigne = Math.max(1, Math.round((dispo.length + 0) / nbLignesV1[l.nom]));
    const prises = dispo.splice(0, parLigne);
    prises.forEach((r, k) => sortie.push(convertir(l, r, k, prises.length)));
  }
  return sortie;
}

const UNITE_DANS_LE_NOM = new Set(['gousse-de-vanille', 'baton-de-cannelle', 'laurier']);
// Bouquet garni éclaté : une quantité lisible par herbe, multipliée par le nombre de bouquets.
const BOUQUET = { thym: { qte: 1, unite: 'branche' }, laurier: { qte: 1, unite: '' }, persil: { qte: 3, unite: 'branche' }, romarin: { qte: 1, unite: 'branche' } };

function convertir(l, r, k, n) {
  const e = r.preparation ? { preparation: r.preparation } : { ingredient: r.ingredient };
  let qte = l.qte ?? null;
  let unite = l.unite ?? '';
  const bouquet = /bouquet garni/i.test(l.nom);
  if (bouquet && BOUQUET[r.ingredient]) {
    const b = BOUQUET[r.ingredient];
    qte = qte == null ? null : b.qte * qte;
    unite = b.unite;
  } else if (n > 1) {
    qte = null; // « sel, poivre » et autres lignes multiples : non quantifiables
    unite = '';
  }
  if (UNITE_DANS_LE_NOM.has(r.ingredient)) unite = '';
  e.qte = qte;
  e.unite = unite;
  const precision = bouquet ? 'bouquet garni' : (r.precision ?? '');
  if (precision) e.precision = precision;
  if (l.groupe) e.groupe = l.groupe;
  return e;
}

// Corrections ponctuelles (--liens : corr_ingredients: [{ i: <index>, <clé>: <valeur|null> }]).
function corriger(liste, corr = []) {
  for (const { i, ...patch } of corr) {
    if (!liste[i]) throw new Error(`correction hors liste : index ${i}`);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null && k !== 'qte') delete liste[i][k]; else liste[i][k] = v;
    }
  }
  return liste;
}

// ---------- liens v1 reportés mécaniquement ----------
function liensMecaniques(fm) {
  const cuisson = fm.cuisson_technique ? [{ slug: fm.cuisson_technique.slug, mutation: fm.cuisson_technique.mutation }] : [];
  const composants = (fm.bases ?? [])
    .map((b) => ({ slug: b.slug in SLUGS_BASES_V1 ? SLUGS_BASES_V1[b.slug] : b.slug, role: 'structure', mutation: b.mutation }))
    .filter((b) => b.slug);
  const substitution = fm.variante_de ? [{ mere: fm.variante_de.slug, mutation: fm.variante_de.mutation, echanges: [] }] : [];
  return { cuisson, composants, substitution, profils: [] };
}

// ---------- émission YAML lisible ----------
const q = (s) => JSON.stringify(s);
const NU = /^([a-z0-9]+(-[a-z0-9]+)*|c\. à (soupe|café))$/; // slugs et unités : sans guillemets
const val = (v) => (v === null || v === undefined ? 'null' : typeof v === 'string' ? (NU.test(v) && !['null', 'true', 'false', 'yes', 'no', 'on', 'off'].includes(v) ? v : q(v)) : String(v));
const flux = (o) => `{ ${Object.entries(o).map(([k, v]) => `${k}: ${Array.isArray(v) ? `[ ${v.map(flux).join(', ')} ]` : val(v)}`).join(', ')} }`;

function emettrePreparation(p) {
  const L = ['---', `titre: ${q(p.titre)}`, `origine: ${p.origine}`, 'nature: plat', `resume: ${q(p.resume)}`];
  L.push('cuisson:', ...p.cuisson.map((c) => `  - ${flux(c)}`));
  L.push(p.composants.length ? 'composants:' : 'composants: []', ...p.composants.map((c) => `  - ${flux(c)}`));
  if (p.substitution.length) {
    L.push('substitution:');
    for (const s of p.substitution) {
      L.push(`  - mere: ${s.mere}`, `    mutation: ${q(s.mutation)}`, `    echanges: [ ${s.echanges.map(flux).join(', ')} ]`);
    }
  } else L.push('substitution: []');
  L.push(p.profils.length ? 'profils:' : 'profils: []', ...p.profils.map((c) => `  - ${flux(c)}`));
  L.push(`histoire: ${p.histoire ? flux(p.histoire) : 'null'}`, '---', '', '## Principe', '', p.principe.trim(), '');
  return L.join('\n');
}

function emettreVersion(v) {
  const L = ['---', `preparation: ${v.preparation}`, `titre: ${q(v.titre)}`, `reference: ${v.reference}`];
  if (!v.reference) L.push(`ecarts: ${q(v.ecarts)}`);
  L.push(`statut: ${v.statut}`, `portions: ${v.portions}`, `temps: ${flux(v.temps)}`, `difficulte: ${v.difficulte}`);
  if (v.source) L.push(`source: ${q(v.source)}`);
  L.push('ingredients:', ...v.ingredients.map((i) => `  - ${flux(i)}`));
  L.push('etapes:', ...v.etapes.map((e) => `  - ${q(e)}`), '---', '');
  if (v.notes?.trim()) L.push(v.notes.trim(), '');
  return L.join('\n');
}

// ---------- affichage (aperçu, règles d'accord du contrat) ----------
const UNITES_S = new Set(['gousse', 'branche', 'botte', 'feuille', 'tranche', 'pincée']);
const elide = (mot, ref) => ref?.elision ?? /^[aeiouyéèêàâîïôœ]/i.test(mot);
function afficher(i) {
  const ref = i.ingredient ? referentiel[i.ingredient] : null;
  const nom = ref ? ref.nom : `[${i.preparation}]`;
  const pl = ref?.pluriel ?? nom;
  let s;
  if (i.qte == null) s = nom;
  else if (!i.unite) s = `${i.qte} ${i.qte < 2 ? nom : pl}`;
  else {
    const u = i.qte >= 2 && UNITES_S.has(i.unite) ? `${i.unite}s` : i.unite;
    s = `${i.qte} ${u} ${elide(pl, ref) ? `d'${pl}` : `de ${pl}`}`;
  }
  return `${s}${i.precision ? `, ${i.precision}` : ''}${i.groupe ? `   [${i.groupe}]` : ''}${ref || i.preparation ? '' : '   ⚠ SLUG INCONNU'}`;
}

// ---------- migration ----------
const fichiers = fs.readdirSync(V1).filter((f) => f.endsWith('.md')).sort();
if (!apercu) { fs.mkdirSync(PREP, { recursive: true }); fs.mkdirSync(VERS, { recursive: true }); }
let nP = 0; let nV = 0;
for (const f of fichiers) {
  const slug = f.replace(/\.md$/, '');
  const { fm, corps } = lire(path.join(V1, f));
  const j = liens[slug] ?? {};
  const secondaire = VERSIONS_SECONDAIRES[slug];
  const meca = liensMecaniques(fm);

  const version = {
    preparation: secondaire ? secondaire.preparation : slug,
    titre: secondaire ? fm.titre : 'Version classique',
    reference: !secondaire,
    ecarts: secondaire ? fm.variante_de?.mutation : undefined,
    statut: secondaire ? 'relu-mathieu' : 'a-relire',
    portions: fm.portions,
    temps: { preparation: fm.preparation, cuisson: fm.cuisson, ...(fm.repos ? { repos: fm.repos } : {}) },
    difficulte: fm.difficulte,
    source: fm.source,
    ingredients: corriger(migrerIngredients(slug, fm.ingredients), j.corr_ingredients),
    etapes: fm.etapes,
    notes: j.notes ?? (secondaire ? corps : ''),
    ...(j.version ?? {}),
  };
  const nomVersion = `${version.preparation}--${secondaire ? secondaire.version : 'classique'}`;

  if (apercu) {
    console.log(`\n== ${nomVersion} (${version.portions} portions)`);
    version.ingredients.forEach((i) => console.log(`   ${afficher(i)}`));
    continue;
  }
  fs.writeFileSync(path.join(VERS, `${nomVersion}.md`), emettreVersion(version));
  nV++;
  if (secondaire) continue;

  const prep = {
    titre: j.titre ?? fm.titre,
    origine: fm.origine,
    resume: j.resume ?? 'À RÉDIGER',
    cuisson: j.cuisson ?? meca.cuisson,
    composants: j.composants ?? meca.composants,
    substitution: j.substitution ?? meca.substitution,
    profils: j.profils ?? meca.profils,
    histoire: null,
    principe: j.principe ?? corps,
  };
  fs.writeFileSync(path.join(PREP, `${slug}.md`), emettrePreparation(prep));
  nP++;
}
if (!apercu) console.log(`${nP} préparations, ${nV} versions écrites.`);
