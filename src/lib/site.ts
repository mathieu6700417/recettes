// Le réseau vu par le site (build uniquement) : chargement du graphe via scripts/lib/reseau.mjs,
// adresses, titres, arbres des lentilles, voisinages, cousins.
import { chargerReseau } from '../../scripts/lib/reseau.mjs';
import {
  decrireMois, moisDeSaison as moisDeSaisonReseau, preparationVegetarienne, saisonDe as saisonDeReseau,
  versionVegetarienne,
} from '../../scripts/lib/derives.mjs';
import { majuscule, minuscule } from './format';

export type TypeNoeud = 'technique' | 'preparation' | 'version' | 'profil' | 'famille' | 'ingredient';
export type TypeLien = 'parent' | 'cuisson' | 'composant' | 'substitution' | 'profil' | 'version'
  | 'utilise' | 'composition' | 'substitut' | 'accord';

export interface Noeud {
  type: TypeNoeud;
  slug: string;
  titre?: string;
  data: Record<string, any>;
  famille?: string;
  preparation?: string;
  index?: number;
  fichier: { chemin: string; corps?: string };
}
export interface Lien {
  type: TypeLien;
  de: string;
  vers: string;
  rang: number;
  mutation?: string;
  role?: string;
  echanges?: { de: string; vers: string }[];
  implicite?: boolean;
  ligne?: Record<string, any>;
}
export interface Reseau {
  noeuds: Map<string, Noeud>;
  liens: Lien[];
  noeud(slug: string): Noeud | undefined;
  parType(type: TypeNoeud): Noeud[];
  liensDe(slug: string, type?: TypeLien): Lien[];
  liensVers(slug: string, type?: TypeLien): Lien[];
  versionsDe(slug: string): Noeud[];
  ancetres(slug: string): string[];
}

// ---------- Chargement (une fois au build ; rechargé régulièrement en dev) ----------

const DOSSIER = (process.env.CONTENU_DIR ?? 'src/content').replace(/\/$/, '');
let cache: { r: Reseau; t: number } | null = null;

export function reseau(): Reseau {
  const maintenant = Date.now();
  if (!cache || (import.meta.env.DEV && maintenant - cache.t > 2000)) {
    cache = { r: chargerReseau(DOSSIER) as unknown as Reseau, t: maintenant };
  }
  return cache.r;
}

/** Mémorise un calcul dérivé du réseau courant. */
function derive<T>(cle: string, calcul: (r: Reseau) => T): T {
  const r = reseau();
  const store = (r as any).__derives ?? ((r as any).__derives = new Map<string, unknown>());
  if (!store.has(cle)) store.set(cle, calcul(r));
  return store.get(cle) as T;
}

// ---------- Adresses et titres ----------

export function url(chemin: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${chemin.replace(/^\//, '')}`;
}

const DOSSIER_URL: Record<TypeNoeud, string> = {
  technique: 'techniques',
  preparation: 'preparations',
  version: 'preparations',
  profil: 'profils',
  famille: 'ingredients',
  ingredient: 'ingredients',
};

/** Suffixe d'une version (« boeuf-bourguignon--maison » → « maison »). */
export function suffixeVersion(slug: string): string {
  const i = slug.indexOf('--');
  return i >= 0 ? slug.slice(i + 2) : slug;
}

export function urlDe(slug: string): string | undefined {
  const n = reseau().noeud(slug);
  if (!n) return undefined;
  if (n.type === 'version') return url(`preparations/${n.preparation}/#version-${suffixeVersion(n.slug)}`);
  return url(`${DOSSIER_URL[n.type]}/${n.slug}/`);
}

/** Nom brut : titre, ou nom (minuscule) pour un ingrédient. */
export function nomDe(slug: string): string {
  const n = reseau().noeud(slug);
  if (!n) return slug;
  return n.type === 'ingredient' ? n.data.nom : (n.titre ?? slug);
}

/** Titre d'affichage (capitalisé). */
export function titreDe(slug: string): string {
  return majuscule(nomDe(slug));
}

/** Nom en début de phrase ou en liste (« bœuf », « fond brun »). */
export function nomCourant(slug: string): string {
  const n = reseau().noeud(slug);
  if (!n) return slug;
  return n.type === 'ingredient' ? n.data.nom : minuscule(n.titre ?? slug);
}

export const NOMS_TYPES: Record<TypeNoeud, string> = {
  technique: 'Technique',
  preparation: 'Préparation',
  version: 'Version',
  profil: 'Profil aromatique',
  famille: "Famille d'ingrédients",
  ingredient: 'Ingrédient',
};

/** Couleur (classe CSS) et nom de chaque type de lien, partagés par les listes et le graphe. */
export type Teinte = 'cuisson' | 'composant' | 'profil' | 'substitution' | 'parent' | 'utilise' | 'substitut' | 'accord' | 'cousin';
export const TEINTES: Record<Teinte, string> = {
  cuisson: 'Cuisson',
  composant: 'Composant',
  profil: 'Profil',
  substitution: 'Substitution',
  parent: 'Filiation',
  utilise: 'Ingrédient',
  substitut: 'Substitut',
  accord: "S'accorde avec",
  cousin: 'Cousinage',
};

export const ROLES: Record<string, string> = {
  structure: 'structure',
  sauce: 'sauce',
  liaison: 'liaison',
  garniture: 'garniture',
  finition: 'finition',
  accompagnement: 'accompagnement',
  aromatique: 'aromatique',
};

export const STATUTS: Record<string, string> = {
  'a-relire': 'à relire',
  'relu-agent': 'relu par un agent',
  'relu-mathieu': 'relu par Mathieu',
};

export const DIFFICULTES: Record<string, string> = {
  facile: 'Facile',
  moyen: 'Difficulté moyenne',
  difficile: 'Difficile',
};

// ---------- Tris ----------

export function trier(slugs: string[]): string[] {
  const r = reseau();
  return [...slugs].sort((a, b) => {
    const na = r.noeud(a);
    const nb = r.noeud(b);
    const oa = na?.data.ordre ?? (na?.type === 'ingredient' ? na.index : undefined) ?? Infinity;
    const ob = nb?.data.ordre ?? (nb?.type === 'ingredient' ? nb.index : undefined) ?? Infinity;
    if (oa !== ob) return oa - ob;
    return nomDe(a).localeCompare(nomDe(b), 'fr');
  });
}

const parTitre = (a: string, b: string) => nomDe(a).localeCompare(nomDe(b), 'fr');

// ---------- Hiérarchies (techniques, profils, ingrédients) ----------

/** Enfants directs par lien `parent` (techniques, profils, ingrédients ; famille → 1er niveau). */
export function enfantsDe(slug: string): string[] {
  const r = reseau();
  return trier(r.liensVers(slug, 'parent').map((l) => l.de).filter((s) => r.noeud(s)));
}

/** Tous les descendants par lien `parent` (sans le nœud lui-même). */
export function descendantsDe(slug: string): string[] {
  const res: string[] = [];
  const vus = new Set([slug]);
  const pile = [...enfantsDe(slug)];
  while (pile.length) {
    const s = pile.shift()!;
    if (vus.has(s)) continue;
    vus.add(s);
    res.push(s);
    pile.push(...enfantsDe(s));
  }
  return res;
}

/** Chaîne des ancêtres existants, de la racine au parent direct. */
export function ascendance(slug: string): string[] {
  const r = reseau();
  return r.ancetres(slug).filter((s) => r.noeud(s)).reverse();
}

export function parentDe(slug: string): Lien | undefined {
  return reseau().liensDe(slug, 'parent')[0];
}

// ---------- Préparations ----------

export function preparationsDe(slugs: Iterable<string>): string[] {
  const r = reseau();
  return [...new Set(slugs)].filter((s) => r.noeud(s)?.type === 'preparation');
}

/** Préparations dont une version utilise l'un des slugs (ingrédient ou base), avec les usages. */
export function usagesDe(slugs: string[]): Map<string, { version: string; ingredient: string }[]> {
  const r = reseau();
  const res = new Map<string, { version: string; ingredient: string }[]>();
  for (const s of slugs) {
    for (const l of r.liensVers(s, 'utilise')) {
      const v = r.noeud(l.de);
      if (!v || v.type !== 'version' || !v.preparation || !r.noeud(v.preparation)) continue;
      if (!res.has(v.preparation)) res.set(v.preparation, []);
      const u = res.get(v.preparation)!;
      if (!u.some((x) => x.version === v.slug && x.ingredient === s)) u.push({ version: v.slug, ingredient: s });
    }
  }
  return new Map([...res].sort(([a], [b]) => parTitre(a, b)));
}

export function versionReference(prep: string): Noeud | undefined {
  return reseau().versionsDe(prep)[0];
}

export interface Cousin { slug: string; via: string; mutation?: string }

/**
 * Cousins d'une préparation : celles qui partagent un de ses profils, ou une de ses mères de
 * substitution. Groupés par nœud commun (profil ou mère).
 */
export function cousinsDe(prep: string): { type: 'profil' | 'substitution'; via: string; cousins: Cousin[] }[] {
  const r = reseau();
  const groupes: { type: 'profil' | 'substitution'; via: string; cousins: Cousin[] }[] = [];
  for (const type of ['profil', 'substitution'] as const) {
    for (const l of r.liensDe(prep, type)) {
      if (!r.noeud(l.vers)) continue;
      const cousins = r.liensVers(l.vers, type)
        .filter((x) => x.de !== prep && r.noeud(x.de)?.type === 'preparation')
        .map((x) => ({ slug: x.de, via: l.vers, mutation: x.mutation }))
        .sort((a, b) => parTitre(a.slug, b.slug));
      if (cousins.length) groupes.push({ type, via: l.vers, cousins });
    }
  }
  return groupes;
}

// ---------- Lentilles de la barre latérale ----------

export type Lentille = 'cuisson' | 'composants' | 'profils' | 'ingredients';
export const LENTILLES: Lentille[] = ['cuisson', 'composants', 'profils', 'ingredients'];
export const NOMS_LENTILLES: Record<Lentille, string> = {
  cuisson: 'Cuisson',
  composants: 'Composants',
  profils: 'Profils',
  ingredients: 'Ingrédients',
};

export interface Branche {
  cle: string;
  type: TypeNoeud | 'groupe';
  titre: string;
  url?: string;
  mutation?: string;
  origine?: string;
  nature?: string;
  enfants: Branche[];
  /** nombre de préparations dans le sous-arbre */
  compte: number;
}

export interface Arbres {
  racines: Record<Lentille, Branche[]>;
  /** parent affiché de chaque clé, par lentille */
  parents: Record<Lentille, Map<string, string | null>>;
}

function branche(slug: string, mutation?: string): Branche {
  const n = reseau().noeud(slug)!;
  return {
    cle: slug,
    type: n.type,
    titre: titreDe(slug),
    url: urlDe(slug),
    mutation,
    origine: n.type === 'preparation' || n.type === 'profil' ? n.data.origine ?? undefined : undefined,
    nature: n.type === 'preparation' ? n.data.nature : undefined,
    enfants: [],
    compte: 0,
  };
}

/** Assemble un arbre à partir d'un dictionnaire enfant → parent, en cassant les cycles. */
function assembler(
  noeuds: Map<string, Branche>,
  parentDeCle: Map<string, string | null>,
  ordreRacines: (a: Branche, b: Branche) => number,
): Branche[] {
  for (const cle of parentDeCle.keys()) {
    const vus = new Set([cle]);
    let c = parentDeCle.get(cle);
    while (c) {
      if (vus.has(c)) { parentDeCle.set(cle, null); break; }
      vus.add(c);
      c = parentDeCle.get(c) ?? null;
    }
  }
  const racines: Branche[] = [];
  for (const [cle, p] of parentDeCle) {
    const b = noeuds.get(cle)!;
    if (p && noeuds.has(p)) noeuds.get(p)!.enfants.push(b);
    else racines.push(b);
  }
  const rangType = (b: Branche) => (b.type === 'preparation' ? 1 : 0);
  const finir = (b: Branche) => {
    b.enfants.sort((x, y) => rangType(x) - rangType(y) || (x.type === 'preparation'
      ? x.titre.localeCompare(y.titre, 'fr')
      : trier([x.cle, y.cle])[0] === x.cle ? -1 : 1));
    b.compte = 0;
    for (const e of b.enfants) {
      finir(e);
      b.compte += e.compte + (e.type === 'preparation' ? 1 : 0);
    }
  };
  racines.forEach(finir);
  return racines.sort(ordreRacines);
}

function groupe(cle: string, titre: string): Branche {
  return { cle, type: 'groupe', titre, enfants: [], compte: 0 };
}

export function arbres(): Arbres {
  return derive('arbres', (r) => {
    const racines = {} as Arbres['racines'];
    const parents = {} as Arbres['parents'];
    const preps = r.parType('preparation');
    const enOrdre = (a: Branche, b: Branche) =>
      (a.type === 'groupe' ? 1 : 0) - (b.type === 'groupe' ? 1 : 0) || (trier([a.cle, b.cle])[0] === a.cle ? -1 : 1);

    // Cuisson : arbre des techniques, préparations sous leur 1re cuisson.
    {
      const noeuds = new Map<string, Branche>();
      const p = new Map<string, string | null>();
      for (const t of r.parType('technique')) {
        noeuds.set(t.slug, branche(t.slug, r.liensDe(t.slug, 'parent')[0]?.mutation));
        p.set(t.slug, r.liensDe(t.slug, 'parent')[0]?.vers ?? null);
      }
      const sans = groupe('groupe:cuisson', 'Sans cuisson');
      for (const n of preps) {
        const c = r.liensDe(n.slug, 'cuisson').find((l) => r.noeud(l.vers)?.type === 'technique');
        noeuds.set(n.slug, branche(n.slug, c?.mutation));
        p.set(n.slug, c ? c.vers : sans.cle);
      }
      if ([...p.values()].includes(sans.cle)) { noeuds.set(sans.cle, sans); p.set(sans.cle, null); }
      racines.cuisson = assembler(noeuds, p, enOrdre);
      parents.cuisson = p;
    }

    // Composants : bases racines ; chaque préparation sous son 1er composant (à défaut, sa 1re mère).
    {
      const noeuds = new Map<string, Branche>();
      const p = new Map<string, string | null>();
      const plats = groupe('groupe:composants', 'Plats sans composant');
      for (const n of preps) {
        const c = r.liensDe(n.slug, 'composant').find((l) => r.noeud(l.vers)?.type === 'preparation');
        const m = r.liensDe(n.slug, 'substitution').find((l) => r.noeud(l.vers)?.type === 'preparation');
        const lien = c ?? m;
        noeuds.set(n.slug, branche(n.slug, lien?.mutation));
        p.set(n.slug, lien ? lien.vers : (n.data.nature === 'base' ? null : plats.cle));
      }
      if ([...p.values()].includes(plats.cle)) { noeuds.set(plats.cle, plats); p.set(plats.cle, null); }
      racines.composants = assembler(noeuds, p, (a, b) =>
        (a.type === 'groupe' ? 1 : 0) - (b.type === 'groupe' ? 1 : 0) || a.titre.localeCompare(b.titre, 'fr'));
      parents.composants = p;
    }

    // Profils : arbre des profils, préparations sous leur 1er profil.
    {
      const noeuds = new Map<string, Branche>();
      const p = new Map<string, string | null>();
      for (const n of r.parType('profil')) {
        noeuds.set(n.slug, branche(n.slug, r.liensDe(n.slug, 'parent')[0]?.mutation));
        p.set(n.slug, r.liensDe(n.slug, 'parent')[0]?.vers ?? null);
      }
      const sans = groupe('groupe:profils', 'Sans profil');
      for (const n of preps) {
        const c = r.liensDe(n.slug, 'profil').find((l) => r.noeud(l.vers)?.type === 'profil');
        noeuds.set(n.slug, branche(n.slug, c?.mutation));
        p.set(n.slug, c ? c.vers : sans.cle);
      }
      if ([...p.values()].includes(sans.cle)) { noeuds.set(sans.cle, sans); p.set(sans.cle, null); }
      racines.profils = assembler(noeuds, p, (a, b) =>
        (a.type === 'groupe' ? 1 : 0) - (b.type === 'groupe' ? 1 : 0) || a.titre.localeCompare(b.titre, 'fr'));
      parents.profils = p;
    }

    // Ingrédients : familles → hiérarchie.
    {
      const noeuds = new Map<string, Branche>();
      const p = new Map<string, string | null>();
      for (const f of r.parType('famille')) { noeuds.set(f.slug, branche(f.slug)); p.set(f.slug, null); }
      for (const i of r.parType('ingredient')) {
        noeuds.set(i.slug, branche(i.slug));
        p.set(i.slug, r.liensDe(i.slug, 'parent')[0]?.vers ?? i.famille ?? null);
      }
      racines.ingredients = assembler(noeuds, p, (a, b) => a.titre.localeCompare(b.titre, 'fr'));
      parents.ingredients = p;
    }

    return { racines, parents };
  });
}

/** Clés à déplier dans chaque lentille pour montrer le nœud courant. */
export function aDeplier(courant?: string): Record<Lentille, Set<string>> {
  const a = arbres();
  const res = {} as Record<Lentille, Set<string>>;
  for (const l of LENTILLES) {
    const s = new Set<string>();
    let c = courant ? a.parents[l].get(courant) : null;
    while (c && !s.has(c)) { s.add(c); c = a.parents[l].get(c) ?? null; }
    res[l] = s;
  }
  return res;
}

/** Lentille la plus naturelle pour un type de nœud. */
export function lentilleDe(type?: TypeNoeud): Lentille | undefined {
  switch (type) {
    case 'technique': return 'cuisson';
    case 'profil': return 'profils';
    case 'ingredient':
    case 'famille': return 'ingredients';
    default: return undefined;
  }
}

// ---------- Voisinage (graphe local) ----------

export interface Voisin { slug: string; titre: string; url?: string; teinte: Teinte; note?: string }
export interface Voisinage { haut: Voisin[]; bas: Voisin[]; gauche: Voisin[]; droite: Voisin[] }

export function voisinage(slug: string): Voisinage {
  const r = reseau();
  const n = r.noeud(slug);
  const v: Voisinage = { haut: [], bas: [], gauche: [], droite: [] };
  if (!n) return v;
  const vus = new Set([slug]);
  const ajouter = (cote: keyof Voisinage, s: string, teinte: Teinte, note?: string) => {
    if (vus.has(s) || !r.noeud(s)) return;
    vus.add(s);
    v[cote].push({ slug: s, titre: titreDe(s), url: urlDe(s), teinte, note });
  };
  const parent = parentDe(slug);
  switch (n.type) {
    case 'preparation': {
      r.liensDe(slug, 'cuisson').forEach((l) => ajouter('haut', l.vers, 'cuisson', l.mutation));
      r.liensDe(slug, 'composant').forEach((l) => ajouter('haut', l.vers, 'composant', l.mutation));
      r.liensDe(slug, 'profil').forEach((l) => ajouter('gauche', l.vers, 'profil', l.mutation));
      r.liensDe(slug, 'substitution').forEach((l) => ajouter('droite', l.vers, 'substitution', l.mutation));
      r.liensVers(slug, 'substitution').forEach((l) => ajouter('droite', l.de, 'substitution', l.mutation));
      r.liensVers(slug, 'composant').forEach((l) => ajouter('bas', l.de, 'composant', l.mutation));
      for (const p of usagesDe([slug]).keys()) ajouter('bas', p, 'utilise');
      break;
    }
    case 'technique': {
      if (parent) ajouter('haut', parent.vers, 'parent');
      enfantsDe(slug).forEach((s) => ajouter('bas', s, 'parent', parentDe(s)?.mutation));
      r.liensVers(slug, 'cuisson').forEach((l) => ajouter('bas', l.de, 'cuisson', l.mutation));
      r.liensVers(slug, 'accord').forEach((l) => ajouter('droite', l.de, 'accord'));
      break;
    }
    case 'profil': {
      if (parent) ajouter('haut', parent.vers, 'parent');
      enfantsDe(slug).forEach((s) => ajouter('bas', s, 'parent', parentDe(s)?.mutation));
      r.liensVers(slug, 'profil').forEach((l) => ajouter('bas', l.de, 'profil', l.mutation));
      r.liensDe(slug, 'composition').forEach((l) => ajouter('gauche', l.vers, 'utilise'));
      break;
    }
    case 'ingredient': {
      if (parent) ajouter('haut', parent.vers, 'parent');
      enfantsDe(slug).forEach((s) => ajouter('bas', s, 'parent'));
      substitutsDe(slug).forEach((s) => ajouter('gauche', s, 'substitut'));
      r.liensDe(slug, 'accord').forEach((l) => ajouter('droite', l.vers, 'accord'));
      for (const p of usagesDe([slug]).keys()) ajouter('bas', p, 'utilise');
      break;
    }
    case 'famille': {
      enfantsDe(slug).forEach((s) => ajouter('bas', s, 'parent'));
      break;
    }
    default:
      break;
  }
  return v;
}

// ---------- Ingrédients ----------

/** Sœurs (même parent ingrédient, hors famille racine) + substituts déclarés, dans les deux sens. */
export function substitutsDe(slug: string): string[] {
  const r = reseau();
  const res = new Set<string>();
  const p = parentDe(slug);
  if (p && !p.implicite && r.noeud(p.vers)?.type === 'ingredient') {
    for (const s of enfantsDe(p.vers)) res.add(s);
  }
  for (const l of r.liensDe(slug, 'substitut')) res.add(l.vers);
  for (const l of r.liensVers(slug, 'substitut')) res.add(l.de);
  res.delete(slug);
  return [...res].filter((s) => r.noeud(s));
}

// ---------- Régime et saison (dérivés, voir scripts/lib/derives.mjs) ----------

/** Préparation (ou version) végétarienne ; undefined pour une préparation sans version. */
export function vegetarien(slug: string): boolean | undefined {
  return derive(`vegetarien:${slug}`, (r) => (r.noeud(slug)?.type === 'version'
    ? versionVegetarienne(r, slug)
    : preparationVegetarienne(r, slug)));
}

/** Saison d'un ingrédient (mois triés) et l'ingrédient qui la porte (lui-même ou un ancêtre). */
export function saisonDe(slug: string): { mois: number[]; de: string; texte: string } | null {
  const s = saisonDeReseau(reseau(), slug);
  return s ? { ...s, texte: decrireMois(s.mois) } : null;
}

/** Mois où une préparation est de saison (vide si aucun de ses ingrédients n'a de saison). */
export function moisDeSaison(prep: string): number[] {
  return derive(`saison:${prep}`, (r) => moisDeSaisonReseau(r, prep));
}
