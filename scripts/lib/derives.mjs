// Propriétés dérivées du réseau, sans champ à saisir (CONTENU-v2.md) : régime végétarien et
// saison. Node pur, sans dépendance : utilisé par le site (src/lib/site.ts) et par les tests.
//
// Les fonctions prennent le réseau renvoyé par chargerReseau() (ou tout objet qui offre
// noeud(), liensDe() et versionsDe()).
import { FAMILLES_CARNEES, INGREDIENTS_CARNES, MOIS } from './listes.mjs';

// ---------- Régime ----------

/** Un ingrédient (ou une famille) est carné s'il est d'une famille carnée ou de la liste hors famille. */
export function estCarne(r, slug) {
  const n = r.noeud(slug);
  if (!n || (n.type !== 'ingredient' && n.type !== 'famille')) return false;
  return FAMILLES_CARNEES.includes(n.famille) || INGREDIENTS_CARNES.includes(slug);
}

/** Version de référence d'une préparation (la première de versionsDe). */
const reference = (r, prep) => r.versionsDe(prep)[0];

/**
 * Une version est végétarienne si aucun de ses ingrédients n'est carné, en descendant dans les
 * versions de référence des bases utilisées comme ingrédient. Une base sans version (ou un
 * cycle) n'apprend rien : elle ne rend pas la version carnée.
 */
export function versionVegetarienne(r, version, vus = new Set()) {
  if (vus.has(version)) return true;
  vus.add(version);
  for (const l of r.liensDe(version, 'utilise')) {
    const n = r.noeud(l.vers);
    if (!n) continue;
    if (n.type === 'preparation') {
      const v = reference(r, n.slug);
      if (v && !versionVegetarienne(r, v.slug, vus)) return false;
    } else if (estCarne(r, n.slug)) return false;
  }
  return true;
}

/** Une préparation est végétarienne si sa version de référence l'est ; undefined sans version. */
export function preparationVegetarienne(r, prep) {
  const v = reference(r, prep);
  return v ? versionVegetarienne(r, v.slug) : undefined;
}

// ---------- Saison ----------

const moisValide = (m) => Number.isInteger(m) && m >= 1 && m <= 12;

/**
 * Mois de saison d'un ingrédient (triés), hérités du parent ingrédient à défaut ; null si aucun.
 * @returns {{ mois: number[], de: string } | null}  `de` : l'ingrédient qui porte la saison
 */
export function saisonDe(r, slug) {
  const vus = new Set();
  let cur = slug;
  while (cur && !vus.has(cur)) {
    vus.add(cur);
    const n = r.noeud(cur);
    if (!n || n.type !== 'ingredient') return null;
    const s = n.data?.saison;
    if (Array.isArray(s) && s.length && s.every(moisValide)) return { mois: [...new Set(s)].sort((a, b) => a - b), de: cur };
    const p = r.liensDe(cur, 'parent')[0];
    cur = p && !p.implicite ? p.vers : null;
  }
  return null;
}

/**
 * Mois où une version est de saison : l'intersection des saisons de ses ingrédients saisonniers
 * (hors placard), y compris ceux des bases qu'elle utilise (versions de référence, récursivement ;
 * un cycle ou une base sans version n'apporte rien). Tableau vide s'il n'y a aucun ingrédient
 * saisonnier, ou si l'intersection est vide (jamais de saison).
 */
export function moisDeSaisonVersion(r, version) {
  const vus = new Set();
  let res = null; // null : aucun ingrédient saisonnier trouvé ; [] : intersection vide
  const descendre = (v) => {
    if (vus.has(v)) return;
    vus.add(v);
    for (const l of r.liensDe(v, 'utilise')) {
      const n = r.noeud(l.vers);
      if (!n) continue;
      if (n.type === 'preparation') {
        const ref = reference(r, n.slug);
        if (ref) descendre(ref.slug);
      } else if (n.type === 'ingredient' && n.data?.placard !== true) {
        const s = saisonDe(r, n.slug);
        if (!s) continue;
        res = res ? res.filter((m) => s.mois.includes(m)) : s.mois;
      }
    }
  };
  descendre(version);
  return res ?? [];
}

/** Mois où une préparation est de saison (ceux de sa version de référence). */
export function moisDeSaison(r, prep) {
  const v = reference(r, prep);
  return v ? moisDeSaisonVersion(r, v.slug) : [];
}

/**
 * Décrit une liste de mois en plages : [9, 10, 11, 12, 1, 2] → « septembre à février » ;
 * [3, 4, 5, 9, 10] → « mars à mai ; septembre et octobre ». Les plages peuvent passer par janvier.
 */
export function decrireMois(liste) {
  const mois = new Set((liste ?? []).filter(moisValide));
  if (mois.size === 0) return '';
  if (mois.size === 12) return "toute l'année";
  const suivant = (m) => (m % 12) + 1;
  const precedent = (m) => ((m + 10) % 12) + 1;
  const plages = [];
  for (let m = 1; m <= 12; m++) {
    if (!mois.has(m) || mois.has(precedent(m))) continue; // début de plage seulement
    let fin = m;
    while (mois.has(suivant(fin))) fin = suivant(fin);
    plages.push([m, fin]);
  }
  const nom = (m) => MOIS[m - 1];
  const textes = plages.map(([a, b]) => (a === b ? nom(a) : suivant(a) === b ? `${nom(a)} et ${nom(b)}` : `${nom(a)} à ${nom(b)}`));
  return textes.length > 1 ? `${textes.slice(0, -1).join(', ')} ; ${textes.at(-1)}` : textes[0];
}
