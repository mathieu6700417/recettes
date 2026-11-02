// « Cuisiner avec ce que j'ai » : classement des préparations selon les ingrédients disponibles.
// Algorithme pur, partagé entre le build (préparation des données) et le navigateur.
//
// Correspondance d'un ingrédient requis R avec un ingrédient disponible D :
//   - couvert : D = R, ou l'un est ancêtre de l'autre dans la hiérarchie du référentiel ;
//   - avec substitution : D correspond (au sens ci-dessus) à un substitut de R, c'est-à-dire
//     une sœur de R (même parent ingrédient, pas seulement la même famille) ou un slug de la
//     liste `substituts` (de R, ou de l'autre ingrédient vers R) ;
//   - sinon manquant.
// Les ingrédients de placard (sel, huile, beurre…) sont ignorés.

export interface IngredientCuisine {
  slug: string;
  nom: string;
  /** parent dans la hiérarchie : slug d'un ingrédient, ou de la famille pour un ingrédient de 1er niveau */
  parent: string | null;
  /** true si `parent` est une famille (racine) */
  parentEstFamille?: boolean;
  substituts?: string[];
  placard?: boolean;
  synonymes?: string[];
  famille?: string;
}

export interface PreparationCuisine {
  slug: string;
  titre: string;
  url: string;
  drapeau?: string;
  nature?: string;
  /** slugs d'ingrédients de la version de référence (sans les préparations utilisées comme ingrédient) */
  ingredients: string[];
  /** titres des préparations de base utilisées comme ingrédient (affichées « à préparer ») */
  aPreparer?: string[];
  /** version de référence végétarienne, bases comprises (dérivé au build) */
  vegetarien?: boolean;
}

export interface Correspondance {
  requis: string;
  etat: 'couvert' | 'substitution' | 'manquant';
  /** ingrédient disponible utilisé */
  par?: string;
}

export interface Resultat {
  preparation: PreparationCuisine;
  /** ingrédients pris en compte (hors placard, dédoublonnés) */
  total: number;
  couverts: Correspondance[];
  substitutions: Correspondance[];
  manquants: string[];
  /** entre 0 et 1 : (couverts + ½ substitutions) / total */
  score: number;
}

export interface Referentiel {
  get(slug: string): IngredientCuisine | undefined;
  ancetres(slug: string): string[];
  substitutsDe(slug: string): string[];
  estPlacard(slug: string): boolean;
}

/** Indexe le référentiel (une fois) pour les calculs de correspondance. */
export function indexer(ingredients: IngredientCuisine[]): Referentiel {
  const parSlug = new Map(ingredients.map((i) => [i.slug, i]));
  const enfants = new Map<string, string[]>();
  const inverses = new Map<string, string[]>();
  for (const i of ingredients) {
    if (i.parent && !i.parentEstFamille) {
      if (!enfants.has(i.parent)) enfants.set(i.parent, []);
      enfants.get(i.parent)!.push(i.slug);
    }
    for (const s of i.substituts ?? []) {
      if (!inverses.has(s)) inverses.set(s, []);
      inverses.get(s)!.push(i.slug);
    }
  }
  const cacheAnc = new Map<string, string[]>();
  const ancetres = (slug: string): string[] => {
    if (cacheAnc.has(slug)) return cacheAnc.get(slug)!;
    const res: string[] = [];
    const vus = new Set([slug]);
    let p = parSlug.get(slug);
    while (p && p.parent && !p.parentEstFamille && !vus.has(p.parent)) {
      res.push(p.parent);
      vus.add(p.parent);
      p = parSlug.get(p.parent);
    }
    cacheAnc.set(slug, res);
    return res;
  };
  const substitutsDe = (slug: string): string[] => {
    const i = parSlug.get(slug);
    if (!i) return [];
    const res = new Set<string>();
    if (i.parent && !i.parentEstFamille) for (const s of enfants.get(i.parent) ?? []) res.add(s);
    for (const s of i.substituts ?? []) res.add(s);
    for (const s of inverses.get(slug) ?? []) res.add(s);
    res.delete(slug);
    return [...res];
  };
  return {
    get: (s) => parSlug.get(s),
    ancetres,
    substitutsDe,
    estPlacard: (s) => parSlug.get(s)?.placard === true,
  };
}

/** a et b désignent le même ingrédient, ou l'un est ancêtre de l'autre. */
export function couvre(ref: Referentiel, a: string, b: string): boolean {
  return a === b || ref.ancetres(a).includes(b) || ref.ancetres(b).includes(a);
}

/** Correspondance d'un ingrédient requis avec la liste disponible. */
export function correspondre(ref: Referentiel, requis: string, disponibles: string[]): Correspondance {
  const exact = disponibles.find((d) => d === requis) ?? disponibles.find((d) => couvre(ref, requis, d));
  if (exact) return { requis, etat: 'couvert', par: exact };
  for (const s of ref.substitutsDe(requis)) {
    const d = disponibles.find((x) => couvre(ref, s, x));
    if (d) return { requis, etat: 'substitution', par: d };
  }
  return { requis, etat: 'manquant' };
}

/** Évalue une préparation. */
export function evaluer(ref: Referentiel, p: PreparationCuisine, disponibles: string[]): Resultat {
  const requis = [...new Set(p.ingredients)].filter((s) => !ref.estPlacard(s));
  const couverts: Correspondance[] = [];
  const substitutions: Correspondance[] = [];
  const manquants: string[] = [];
  for (const r of requis) {
    const c = correspondre(ref, r, disponibles);
    if (c.etat === 'couvert') couverts.push(c);
    else if (c.etat === 'substitution') substitutions.push(c);
    else manquants.push(r);
  }
  const total = requis.length;
  const score = total ? (couverts.length + substitutions.length / 2) / total : 0;
  return { preparation: p, total, couverts, substitutions, manquants, score };
}

/**
 * Classe les préparations : meilleure couverture d'abord, puis le moins de manquants, puis
 * le titre. Ne garde que celles dont au moins un ingrédient est couvert ou substituable.
 */
export function classer(ref: Referentiel, preparations: PreparationCuisine[], disponibles: string[]): Resultat[] {
  if (!disponibles.length) return [];
  return preparations
    .map((p) => evaluer(ref, p, disponibles))
    .filter((r) => r.couverts.length + r.substitutions.length > 0)
    .sort((a, b) => b.score - a.score
      || a.manquants.length - b.manquants.length
      || a.preparation.titre.localeCompare(b.preparation.titre, 'fr'));
}

/** Sépare les plats des préparations de base (nature « base »), en gardant l'ordre du classement. */
export function repartir(resultats: Resultat[]): { plats: Resultat[]; bases: Resultat[] } {
  return {
    plats: resultats.filter((r) => r.preparation.nature !== 'base'),
    bases: resultats.filter((r) => r.preparation.nature === 'base'),
  };
}

/** Ne garde que les préparations végétariennes si le filtre est actif. */
export function filtrerRegime(preparations: PreparationCuisine[], vegetarienSeulement: boolean): PreparationCuisine[] {
  return vegetarienSeulement ? preparations.filter((p) => p.vegetarien === true) : preparations;
}
