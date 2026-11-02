#!/usr/bin/env node
// Vérifie strictement le contenu (techniques et recettes) selon CONTENU.md.
// Usage : node scripts/verifier.mjs [dossierContenu]   (défaut : src/content)
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const racine = path.resolve(process.argv[2] ?? 'src/content');

// ---------- Liste fermée (CONTENU.md) ----------
const T = (axe, parent, titre) => ({ axe, parent, titre });
const LISTE = {
  'chaleur-humide': T('cuisson', null, 'Chaleur humide'),
  pocher: T('cuisson', 'chaleur-humide', 'Pocher'),
  mijoter: T('cuisson', 'chaleur-humide', 'Mijoter'),
  'cuisson-au-blanc': T('cuisson', 'mijoter', 'Cuisson au blanc'),
  braiser: T('cuisson', 'chaleur-humide', 'Braiser'),
  ragout: T('cuisson', 'braiser', 'Ragoût'),
  'chaleur-seche': T('cuisson', null, 'Chaleur sèche'),
  'cuire-au-four': T('cuisson', 'chaleur-seche', 'Cuire au four'),
  'cuire-au-bain-marie': T('cuisson', 'cuire-au-four', 'Cuire au bain-marie'),
  frire: T('cuisson', 'chaleur-seche', 'Frire'),
  fond: T('base', null, 'Fonds'),
  'fond-blanc': T('base', 'fond', 'Fond blanc'),
  'fond-brun': T('base', 'fond', 'Fond brun'),
  veloute: T('base', 'fond-blanc', 'Velouté'),
  roux: T('base', null, 'Roux et farine'),
  singer: T('base', 'roux', 'Singer'),
  marinade: T('base', null, 'Marinade au vin'),
  liaison: T('base', null, 'Liaisons de fin de cuisson'),
  'liaison-creme-jaune': T('base', 'liaison', 'Liaison crème et jaune'),
  'liaison-au-sang': T('base', 'liaison', 'Liaison au sang'),
  'pate-a-choux': T('base', null, 'Pâte à choux'),
  'pate-a-foncer': T('base', null, 'Pâtes à foncer'),
  'pate-brisee': T('base', 'pate-a-foncer', 'Pâte brisée'),
  'pate-sucree': T('base', 'pate-a-foncer', 'Pâte sucrée'),
  'creme-aux-oeufs': T('base', null, 'Crèmes aux œufs'),
  'creme-anglaise': T('base', 'creme-aux-oeufs', 'Crème anglaise'),
  'creme-patissiere': T('base', 'creme-aux-oeufs', 'Crème pâtissière'),
  'creme-prise': T('base', 'creme-aux-oeufs', 'Crème prise'),
  meringue: T('base', null, 'Meringue'),
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const AXES = ['cuisson', 'base'];
const DIFFICULTES = ['facile', 'moyen', 'difficile'];
const UNITES = ['g', 'kg', 'ml', 'cl', 'l', 'c. à soupe', 'c. à café', 'pincée', 'gousse', 'branche', 'botte', 'feuille', 'tranche', ''];
const MUT_MAX = 80;
const MUT_AVERT = 60;

// ---------- Utilitaires ----------
const tty = process.stdout.isTTY;
const c = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const rouge = (s) => c(31, s);
const jaune = (s) => c(33, s);
const gras = (s) => c(1, s);

const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const estChaine = (v) => typeof v === 'string' && v.trim() !== '';
const estEntier = (v) => typeof v === 'number' && Number.isInteger(v);
const estNombre = (v) => typeof v === 'number' && Number.isFinite(v);
const liste = (a) => a.map((x) => (x === '' ? '« "" »' : `« ${x} »`)).join(', ');

function lire(dossier) {
  if (!fs.existsSync(dossier)) return [];
  return fs.readdirSync(dossier).filter((f) => f.endsWith('.md')).sort().map((f) => ({
    chemin: path.join(dossier, f),
    rel: path.relative(process.cwd(), path.join(dossier, f)),
    slug: f.slice(0, -3),
    erreurs: [],
    avertissements: [],
  }));
}

function analyser(fichier) {
  const texte = fs.readFileSync(fichier.chemin, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const m = texte.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*))?$/);
  if (!m) {
    fichier.erreurs.push('en-tête YAML (front matter) absent ou non délimité par « --- »');
    return;
  }
  try {
    const d = yaml.load(m[1]);
    if (!estObjet(d)) throw new Error("l'en-tête doit être un objet YAML");
    fichier.data = d;
  } catch (e) {
    fichier.erreurs.push(`YAML illisible : ${String(e.message).split('\n')[0]}`);
    return;
  }
  fichier.corps = m[2] ?? '';
}

function champsInconnus(f, d, permis, erreur) {
  for (const k of Object.keys(d)) {
    if (!permis.includes(k)) {
      (erreur ? f.erreurs : f.avertissements).push(`champ inconnu : « ${k} »`);
    }
  }
}

function verifierMutation(f, valeur, ou) {
  if (!estChaine(valeur)) {
    f.erreurs.push(`${ou} : mutation requise (chaîne non vide)`);
    return;
  }
  if (valeur.length > MUT_MAX) f.erreurs.push(`${ou} : mutation trop longue (${valeur.length} caractères, maximum ${MUT_MAX})`);
  else if (valeur.length > MUT_AVERT) f.avertissements.push(`${ou} : mutation longue (${valeur.length} caractères, idéalement ≤ ${MUT_AVERT})`);
}

// Lien {slug, mutation}
function lien(f, v, ou) {
  if (!estObjet(v)) {
    f.erreurs.push(`${ou} : doit être un objet { slug, mutation }`);
    return null;
  }
  champsInconnus(f, v, ['slug', 'mutation'], true);
  if (!estChaine(v.slug) || !SLUG.test(v.slug)) {
    f.erreurs.push(`${ou}.slug : slug invalide`);
    verifierMutation(f, v.mutation, ou);
    return null;
  }
  verifierMutation(f, v.mutation, ou);
  return v.slug;
}

function trouverCycle(depart, suivant) {
  const vus = new Set([depart]);
  let cur = suivant(depart);
  while (cur) {
    if (cur === depart) return true;
    if (vus.has(cur)) return false; // cycle ailleurs, signalé pour l'autre fichier
    vus.add(cur);
    cur = suivant(cur);
  }
  return false;
}

// ---------- Chargement ----------
const techniques = lire(path.join(racine, 'techniques'));
const recettes = lire(path.join(racine, 'recettes'));
if (!fs.existsSync(racine)) {
  console.error(`Dossier introuvable : ${racine}`);
  process.exit(2);
}
[...techniques, ...recettes].forEach(analyser);
const tParSlug = new Map(techniques.map((f) => [f.slug, f]));
const rParSlug = new Map(recettes.map((f) => [f.slug, f]));

// ---------- Techniques ----------
for (const f of techniques) {
  const d = f.data;
  if (!SLUG.test(f.slug)) f.erreurs.push(`nom de fichier invalide pour un slug : « ${f.slug} »`);
  const ref = LISTE[f.slug];
  if (!ref) f.erreurs.push(`slug hors de la liste fermée des techniques : « ${f.slug} »`);
  if (!d) continue;
  champsInconnus(f, d, ['titre', 'axe', 'parent', 'mutation', 'resume', 'ordre'], false);
  if (!estChaine(d.titre)) f.erreurs.push('titre requis (chaîne non vide)');
  else if (ref && d.titre !== ref.titre) f.avertissements.push(`titre « ${d.titre} » différent de la liste fermée (« ${ref.titre} »)`);
  if (!AXES.includes(d.axe)) f.erreurs.push(`axe invalide : attendu ${liste(AXES)}`);
  else if (ref && d.axe !== ref.axe) f.erreurs.push(`axe « ${d.axe} » non conforme à la liste fermée (« ${ref.axe} »)`);
  if (!estChaine(d.resume)) f.erreurs.push('resume requis (chaîne non vide)');
  if (d.ordre !== undefined && !estNombre(d.ordre)) f.erreurs.push('ordre doit être un nombre');

  if (d.parent !== undefined && d.parent !== null) {
    if (!estChaine(d.parent) || !SLUG.test(d.parent)) f.erreurs.push('parent : slug invalide');
    else {
      if (d.parent === f.slug) f.erreurs.push('parent : une technique ne peut pas être son propre parent');
      const p = tParSlug.get(d.parent);
      if (!p) f.erreurs.push(`parent : référence manquante, technique « ${d.parent} » introuvable`);
      else if (p.data && AXES.includes(d.axe) && p.data.axe !== d.axe) f.erreurs.push(`parent « ${d.parent} » d'un autre axe (« ${p.data.axe} » au lieu de « ${d.axe} »)`);
      if (ref && ref.parent !== d.parent) f.erreurs.push(`parent « ${d.parent} » non conforme à la liste fermée (${ref.parent ? `« ${ref.parent} »` : 'racine'})`);
    }
    verifierMutation(f, d.mutation, 'mutation');
  } else {
    if (d.mutation !== undefined) f.avertissements.push('mutation présente sur une racine (sans parent) : elle sera ignorée');
    if (ref && ref.parent) f.erreurs.push(`parent absent, alors que la liste fermée impose « ${ref.parent} »`);
  }
}
for (const f of techniques) {
  if (!f.data) continue;
  if (trouverCycle(f.slug, (s) => tParSlug.get(s)?.data?.parent)) f.erreurs.push('cycle dans la hiérarchie des techniques');
}

// ---------- Recettes ----------
function verifierIngredients(f, ing) {
  if (!Array.isArray(ing) || ing.length === 0) {
    f.erreurs.push('ingredients : tableau non vide requis');
    return;
  }
  ing.forEach((x, i) => {
    const ou = `ingredients[${i + 1}]`;
    if (!estObjet(x)) return f.erreurs.push(`${ou} : doit être un objet`);
    champsInconnus(f, x, ['qte', 'unite', 'nom', 'groupe'], true);
    if (!(x.qte === null || (estNombre(x.qte) && x.qte > 0))) f.erreurs.push(`${ou}.qte : nombre > 0 ou null requis`);
    if (!UNITES.includes(x.unite)) f.erreurs.push(`${ou}.unite : unité inconnue (${JSON.stringify(x.unite)}), attendu ${liste(UNITES)}`);
    if (!estChaine(x.nom)) f.erreurs.push(`${ou}.nom : chaîne non vide requise`);
    if (x.groupe !== undefined && !estChaine(x.groupe)) f.erreurs.push(`${ou}.groupe : chaîne non vide si présent`);
  });
}

for (const f of recettes) {
  const d = f.data;
  if (!SLUG.test(f.slug)) f.erreurs.push(`nom de fichier invalide pour un slug : « ${f.slug} »`);
  if (!d) continue;
  champsInconnus(f, d, ['titre', 'origine', 'portions', 'preparation', 'cuisson', 'difficulte', 'cuisson_technique', 'bases', 'variante_de', 'source', 'ingredients', 'etapes'], true);
  if (!estChaine(d.titre)) f.erreurs.push('titre requis (chaîne non vide)');
  if (typeof d.origine !== 'string' || !/^[A-Z]{2}$/.test(d.origine)) f.erreurs.push('origine : code pays à 2 lettres majuscules requis (ex. FR)');
  if (!estEntier(d.portions) || d.portions < 1) f.erreurs.push('portions : entier ≥ 1 requis');
  if (!estEntier(d.preparation) || d.preparation < 0) f.erreurs.push('preparation : entier ≥ 0 (minutes) requis');
  if (!estEntier(d.cuisson) || d.cuisson < 0) f.erreurs.push('cuisson : entier ≥ 0 (minutes) requis');
  if (!DIFFICULTES.includes(d.difficulte)) f.erreurs.push(`difficulte : attendu ${liste(DIFFICULTES)}`);

  // Cuisson
  const sc = lien(f, d.cuisson_technique, 'cuisson_technique');
  if (sc) {
    const ref = LISTE[sc];
    if (!ref) f.erreurs.push(`cuisson_technique : slug hors de la liste fermée : « ${sc} »`);
    else if (ref.axe !== 'cuisson') f.erreurs.push(`cuisson_technique : « ${sc} » n'est pas une technique de l'axe cuisson`);
    else if (!tParSlug.has(sc)) f.erreurs.push(`cuisson_technique : référence manquante, technique « ${sc} » introuvable`);
  }
  // Bases
  if (!Array.isArray(d.bases) || d.bases.length === 0) f.erreurs.push('bases : tableau non vide requis');
  else {
    const vus = new Set();
    d.bases.forEach((b, i) => {
      const s = lien(f, b, `bases[${i + 1}]`);
      if (!s) return;
      if (vus.has(s)) f.erreurs.push(`bases[${i + 1}] : doublon « ${s} »`);
      vus.add(s);
      const ref = LISTE[s];
      if (!ref) f.erreurs.push(`bases[${i + 1}] : slug hors de la liste fermée : « ${s} »`);
      else if (ref.axe !== 'base') f.erreurs.push(`bases[${i + 1}] : « ${s} » n'est pas une technique de l'axe base`);
      else if (!tParSlug.has(s)) f.erreurs.push(`bases[${i + 1}] : référence manquante, technique « ${s} » introuvable`);
    });
  }
  // Variante
  if (d.variante_de !== undefined && d.variante_de !== null) {
    const s = lien(f, d.variante_de, 'variante_de');
    if (s) {
      if (s === f.slug) f.erreurs.push('variante_de : une recette ne peut pas être variante d\'elle-même');
      else if (!rParSlug.has(s)) f.erreurs.push(`variante_de : référence manquante, recette « ${s} » introuvable`);
    }
  }
  if (d.source !== undefined && !estChaine(d.source)) f.erreurs.push('source : chaîne non vide si présente');
  verifierIngredients(f, d.ingredients);
  if (!Array.isArray(d.etapes) || d.etapes.length === 0) f.erreurs.push('etapes : tableau non vide requis');
  else d.etapes.forEach((e, i) => { if (!estChaine(e)) f.erreurs.push(`etapes[${i + 1}] : chaîne non vide requise`); });

  if (/^# /m.test(f.corps ?? '')) f.avertissements.push('le corps contient un titre H1 (« # ») : à retirer, le titre vient de l\'en-tête');
}
for (const f of recettes) {
  if (!f.data?.variante_de?.slug) continue;
  if (trouverCycle(f.slug, (s) => rParSlug.get(s)?.data?.variante_de?.slug)) f.erreurs.push('cycle dans les variantes de recettes');
}

// ---------- Sortie ----------
const tous = [...techniques, ...recettes];
let nbE = 0;
let nbA = 0;
for (const f of tous) {
  nbE += f.erreurs.length;
  nbA += f.avertissements.length;
  if (!f.erreurs.length && !f.avertissements.length) continue;
  console.log(gras(f.rel));
  f.erreurs.forEach((m) => console.log(`  ${rouge('✗')} ${m}`));
  f.avertissements.forEach((m) => console.log(`  ${jaune('⚠')} ${m}`));
}
const pl = (n, s) => `${n} ${s}${n > 1 ? 's' : ''}`;
console.log(`\n${pl(tous.length, 'fichier')}, ${pl(nbE, 'erreur')}, ${pl(nbA, 'avertissement')}`);
process.exit(nbE > 0 ? 1 : 0);
