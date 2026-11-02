// Chargement et indexation du contenu v2 en un graphe typé (CONTENU-v2.md).
// Node pur + js-yaml, sans dépendance Astro : réutilisable par le vérificateur et par le site.
//
//   import { chargerReseau } from './lib/reseau.mjs';
//   const r = chargerReseau('src/content');
//   r.noeud('coq-au-vin');                    // → Noeud
//   r.liensDe('coq-au-vin', 'composant');     // liens sortants (déclarés côté enfant)
//   r.liensVers('fond-brun', 'composant');    // liens entrants (sens inverse, calculé)
//
// Le chargement est tolérant : un fichier illisible ou mal formé est conservé avec ses
// erreurs de lecture (fichier.erreurs) et contribue au graphe ce qui peut l'être. La
// validation complète est faite par validerReseau() (./valider.mjs).
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

/**
 * @typedef {'technique'|'preparation'|'version'|'profil'|'famille'|'ingredient'} TypeNoeud
 * @typedef {'parent'|'cuisson'|'composant'|'substitution'|'profil'|'version'|'utilise'|'composition'|'substitut'|'accord'} TypeLien
 *
 * @typedef {object} Fichier
 * @property {string} chemin   chemin absolu
 * @property {string} rel      chemin relatif au répertoire courant (pour les messages)
 * @property {TypeNoeud} type  'famille' pour un fichier du référentiel des ingrédients
 * @property {string} slug     nom du fichier sans extension
 * @property {object} [data]   en-tête YAML (ou contenu YAML pour une famille)
 * @property {string} [corps]  corps Markdown
 * @property {string[]} erreurs
 * @property {string[]} avertissements
 *
 * @typedef {object} Noeud
 * @property {TypeNoeud} type
 * @property {string} slug
 * @property {string} [titre]  titre (ou nom pour un ingrédient)
 * @property {object} data     données brutes (en-tête, ou entrée du référentiel)
 * @property {Fichier} fichier fichier de déclaration
 * @property {string} [famille]     famille (ingrédients et familles)
 * @property {string} [preparation] préparation (versions)
 * @property {number} [index]       rang dans la liste du référentiel (ingrédients)
 *
 * @typedef {object} Lien
 * @property {TypeLien} type
 * @property {string} de      slug du nœud déclarant (l'enfant)
 * @property {string} vers    slug du nœud cible (peut ne pas exister : la validation le signale)
 * @property {number} rang    position dans la liste déclarée (0 = principal)
 * @property {Fichier} fichier
 * @property {string} [mutation]
 * @property {string} [role]                        composant
 * @property {{de:string, vers:string}[]} [echanges] substitution
 * @property {boolean} [implicite]                  parent implicite d'un ingrédient vers sa famille
 * @property {object} [ligne]                       utilise / composition : la ligne d'origine
 */

export const DOSSIERS = {
  technique: 'techniques',
  preparation: 'preparations',
  version: 'versions',
  profil: 'profils',
  famille: 'ingredients',
};

const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const estChaine = (v) => typeof v === 'string' && v.trim() !== '';
const tableau = (v) => (Array.isArray(v) ? v : []);

function lister(dossier, ext, type, cwd) {
  if (!fs.existsSync(dossier)) return [];
  return fs.readdirSync(dossier).filter((f) => f.endsWith(ext)).sort().map((f) => ({
    chemin: path.join(dossier, f),
    rel: path.relative(cwd, path.join(dossier, f)),
    type,
    slug: f.slice(0, -ext.length),
    erreurs: [],
    avertissements: [],
  }));
}

function lireMarkdown(f) {
  const texte = fs.readFileSync(f.chemin, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const m = texte.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*))?$/);
  if (!m) {
    f.erreurs.push('en-tête YAML (front matter) absent ou non délimité par « --- »');
    return;
  }
  try {
    const d = yaml.load(m[1]);
    if (!estObjet(d)) throw new Error("l'en-tête doit être un objet YAML");
    f.data = d;
  } catch (e) {
    f.erreurs.push(`YAML illisible : ${String(e.message).split('\n')[0]}`);
    return;
  }
  f.corps = m[2] ?? '';
}

function lireYaml(f) {
  try {
    const d = yaml.load(fs.readFileSync(f.chemin, 'utf8').replace(/^﻿/, ''));
    if (!estObjet(d)) throw new Error('le fichier doit contenir un objet YAML { titre, ingredients }');
    f.data = d;
  } catch (e) {
    f.erreurs.push(`YAML illisible : ${String(e.message).split('\n')[0]}`);
  }
}

/**
 * Charge un dossier de contenu v2 et l'indexe en graphe.
 * @param {string} [dossier='src/content']
 * @param {{ cwd?: string }} [options]  cwd : base des chemins relatifs des messages
 */
export function chargerReseau(dossier = 'src/content', { cwd = process.cwd() } = {}) {
  const racine = path.resolve(cwd, dossier);
  if (!fs.existsSync(racine)) throw new Error(`Dossier introuvable : ${racine}`);

  const fichiers = [
    ...lister(path.join(racine, DOSSIERS.technique), '.md', 'technique', cwd),
    ...lister(path.join(racine, DOSSIERS.preparation), '.md', 'preparation', cwd),
    ...lister(path.join(racine, DOSSIERS.version), '.md', 'version', cwd),
    ...lister(path.join(racine, DOSSIERS.profil), '.md', 'profil', cwd),
    ...lister(path.join(racine, DOSSIERS.famille), '.yaml', 'famille', cwd),
  ];
  for (const f of fichiers) (f.type === 'famille' ? lireYaml : lireMarkdown)(f);

  /** @type {Map<string, Noeud>} */
  const noeuds = new Map();
  /** slugs déclarés plusieurs fois : slug → tous les nœuds (le premier est dans `noeuds`) */
  const doublons = new Map();
  const ajouter = (n) => {
    if (!noeuds.has(n.slug)) return noeuds.set(n.slug, n);
    if (!doublons.has(n.slug)) doublons.set(n.slug, [noeuds.get(n.slug)]);
    doublons.get(n.slug).push(n);
  };

  for (const f of fichiers) {
    const d = f.data ?? {};
    if (f.type === 'version') {
      const i = f.slug.indexOf('--');
      ajouter({
        type: 'version', slug: f.slug, titre: d.titre, data: d, fichier: f,
        preparation: estChaine(d.preparation) ? d.preparation : (i > 0 ? f.slug.slice(0, i) : undefined),
      });
    } else if (f.type === 'famille') {
      ajouter({ type: 'famille', slug: f.slug, titre: d.titre, data: d, fichier: f, famille: f.slug });
      tableau(d.ingredients).forEach((ing, index) => {
        if (!estObjet(ing) || !estChaine(ing.slug)) return;
        ajouter({ type: 'ingredient', slug: ing.slug, titre: ing.nom, data: ing, fichier: f, famille: f.slug, index });
      });
    } else {
      ajouter({ type: f.type, slug: f.slug, titre: d.titre, data: d, fichier: f });
    }
  }

  // ---------- Liens (déclarés côté enfant) ----------
  /** @type {Lien[]} */
  const liens = [];
  const lier = (type, de, vers, fichier, rang = 0, extra = {}) => {
    if (!estChaine(vers)) return;
    liens.push({ type, de, vers, rang, fichier, ...extra });
  };
  const mut = (o) => (estChaine(o?.mutation) ? { mutation: o.mutation } : {});

  for (const n of [...noeuds.values(), ...[...doublons.values()].flatMap((l) => l.slice(1))]) {
    const d = n.data;
    const f = n.fichier;
    switch (n.type) {
      case 'technique':
      case 'profil':
        if (estChaine(d.parent)) lier('parent', n.slug, d.parent, f, 0, mut(d));
        if (n.type === 'profil') {
          tableau(d.composition).forEach((c, i) => {
            if (estObjet(c)) lier('composition', n.slug, c.ingredient, f, i, { ligne: c });
          });
        }
        break;
      case 'preparation':
        tableau(d.cuisson).forEach((c, i) => estObjet(c) && lier('cuisson', n.slug, c.slug, f, i, mut(c)));
        tableau(d.composants).forEach((c, i) => estObjet(c) && lier('composant', n.slug, c.slug, f, i, { role: c.role, ...mut(c) }));
        tableau(d.substitution).forEach((s, i) => estObjet(s) && lier('substitution', n.slug, s.mere, f, i, {
          ...mut(s),
          echanges: tableau(s.echanges).filter((e) => estObjet(e) && estChaine(e.de) && estChaine(e.vers)).map(({ de, vers }) => ({ de, vers })),
        }));
        tableau(d.profils).forEach((p, i) => estObjet(p) && lier('profil', n.slug, p.slug, f, i, mut(p)));
        break;
      case 'version':
        lier('version', n.slug, n.preparation, f);
        tableau(d.ingredients).forEach((l, i) => {
          if (!estObjet(l)) return;
          lier('utilise', n.slug, estChaine(l.ingredient) ? l.ingredient : l.preparation, f, i, { ligne: l });
        });
        break;
      case 'ingredient':
        if (estChaine(d.parent)) lier('parent', n.slug, d.parent, f);
        else lier('parent', n.slug, n.famille, f, 0, { implicite: true });
        tableau(d.substituts).forEach((s, i) => lier('substitut', n.slug, s, f, i));
        tableau(d.techniques).forEach((t, i) => lier('accord', n.slug, t, f, i));
        break;
      default:
        break;
    }
  }

  // ---------- Index dans les deux sens ----------
  const sortants = new Map();
  const entrants = new Map();
  const pousser = (m, k, v) => (m.has(k) ? m.get(k).push(v) : m.set(k, [v]));
  for (const l of liens) {
    pousser(sortants, l.de, l);
    pousser(entrants, l.vers, l);
  }
  const filtrer = (arr, type) => (arr ?? []).filter((l) => !type || l.type === type);

  return {
    dossier: racine,
    fichiers,
    noeuds,
    doublons,
    liens,
    sortants,
    entrants,
    /** @param {string} slug @returns {Noeud|undefined} */
    noeud: (slug) => noeuds.get(slug),
    /** Nœuds d'un type, dans l'ordre de chargement. @param {TypeNoeud} type */
    parType: (type) => [...noeuds.values()].filter((n) => n.type === type),
    /** Liens sortants (déclarés par `slug`). @param {string} slug @param {TypeLien} [type] */
    liensDe: (slug, type) => filtrer(sortants.get(slug), type),
    /** Liens entrants (qui pointent vers `slug`). @param {string} slug @param {TypeLien} [type] */
    liensVers: (slug, type) => filtrer(entrants.get(slug), type),
    /** Versions d'une préparation (la référence en premier). @param {string} slug */
    versionsDe: (slug) => filtrer(entrants.get(slug), 'version')
      .map((l) => noeuds.get(l.de))
      .filter(Boolean)
      .sort((a, b) => (b.data.reference === true) - (a.data.reference === true) || a.slug.localeCompare(b.slug)),
    /** Chaîne des ancêtres par liens `parent` (du parent direct à la racine), sans boucler. */
    ancetres: (slug) => {
      const res = [];
      const vus = new Set([slug]);
      let cur = filtrer(sortants.get(slug), 'parent')[0]?.vers;
      while (cur && !vus.has(cur)) {
        res.push(cur);
        vus.add(cur);
        cur = filtrer(sortants.get(cur), 'parent')[0]?.vers;
      }
      return res;
    },
  };
}

/**
 * Cherche les cycles d'un graphe orienté. Renvoie une liste de cycles, chacun sous la
 * forme [a, b, …, a], dédoublonnés.
 * @param {Iterable<string>} sommets
 * @param {(s: string) => string[]} voisins
 */
export function trouverCycles(sommets, voisins) {
  const etat = new Map(); // 1 = en cours, 2 = fini
  const pile = [];
  const cycles = [];
  const cles = new Set();
  const visiter = (s) => {
    etat.set(s, 1);
    pile.push(s);
    for (const v of voisins(s)) {
      if (etat.get(v) === 1) {
        const cycle = [...pile.slice(pile.indexOf(v)), v];
        const cle = [...new Set(cycle)].sort().join('|');
        if (!cles.has(cle)) {
          cles.add(cle);
          cycles.push(cycle);
        }
      } else if (!etat.has(v)) visiter(v);
    }
    pile.pop();
    etat.set(s, 2);
  };
  for (const s of sommets) if (!etat.has(s)) visiter(s);
  return cycles;
}
