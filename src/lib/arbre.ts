// Construction de la généalogie (côté build uniquement).
import { getCollection, type CollectionEntry } from 'astro:content';

export type Axe = 'cuisson' | 'base';
export type Technique = CollectionEntry<'techniques'>;
export type Recette = CollectionEntry<'recettes'>;

export interface Noeud {
  type: 'technique' | 'recette';
  slug: string;
  titre: string;
  mutation?: string;
  origine?: string;
  enfants: Noeud[];
  /** Nombre de recettes dans le sous-arbre (techniques uniquement). */
  nbRecettes: number;
  nbTechniques: number;
}

export interface Genealogie {
  techniques: Map<string, Technique>;
  recettes: Map<string, Recette>;
  arbres: Record<Axe, Noeud[]>;
  /** Index des nœuds par axe et clé « type:slug ». */
  index: Record<Axe, Map<string, Noeud>>;
  /** Parent affiché dans l'arbre (clé « type:slug ») par axe. */
  parents: Record<Axe, Map<string, string | null>>;
}

export const AXES: Axe[] = ['cuisson', 'base'];
export const NOMS_AXES: Record<Axe, string> = {
  cuisson: 'Mode de cuisson',
  base: 'Préparations de base',
};

const avertis = new Set<string>();
function avertir(msg: string) {
  if (avertis.has(msg)) return;
  avertis.add(msg);
  console.warn(`[généalogie] ${msg}`);
}

function trierTechniques(a: Noeud & { ordre?: number }, b: Noeud & { ordre?: number }) {
  const oa = a.ordre ?? Number.POSITIVE_INFINITY;
  const ob = b.ordre ?? Number.POSITIVE_INFINITY;
  if (oa !== ob) return oa - ob;
  return a.titre.localeCompare(b.titre, 'fr');
}
function trierTitre(a: Noeud, b: Noeud) {
  return a.titre.localeCompare(b.titre, 'fr');
}

/** Technique de rattachement d'une recette dans un axe. */
export function rattachement(r: Recette, axe: Axe) {
  return axe === 'cuisson' ? r.data.cuisson_technique : r.data.bases[0];
}

let cache: Promise<Genealogie> | null = null;
export function genealogie(): Promise<Genealogie> {
  cache ??= construire();
  return cache;
}

async function construire(): Promise<Genealogie> {
  const lesTechniques = await getCollection('techniques');
  const lesRecettes = await getCollection('recettes');
  const techniques = new Map(lesTechniques.map((t) => [t.id, t]));
  const recettes = new Map(lesRecettes.map((r) => [r.id, r]));

  const arbres = {} as Genealogie['arbres'];
  const index = {} as Genealogie['index'];
  const parents = {} as Genealogie['parents'];

  for (const axe of AXES) {
    const noeuds = new Map<string, Noeud & { ordre?: number }>();
    const parentDe = new Map<string, string | null>();

    for (const t of lesTechniques) {
      if (t.data.axe !== axe) continue;
      noeuds.set(`technique:${t.id}`, {
        type: 'technique', slug: t.id, titre: t.data.titre, mutation: t.data.mutation,
        ordre: t.data.ordre, enfants: [], nbRecettes: 0, nbTechniques: 0,
      });
      let p: string | null = null;
      if (t.data.parent) {
        const tp = techniques.get(t.data.parent);
        if (!tp) avertir(`technique « ${t.id} » : parent « ${t.data.parent} » introuvable, rattachée à la racine.`);
        else if (tp.data.axe !== axe) avertir(`technique « ${t.id} » : parent « ${t.data.parent} » sur un autre axe, rattachée à la racine.`);
        else p = `technique:${tp.id}`;
      }
      parentDe.set(`technique:${t.id}`, p);
    }

    for (const r of lesRecettes) {
      const lienT = rattachement(r, axe);
      noeuds.set(`recette:${r.id}`, {
        type: 'recette', slug: r.id, titre: r.data.titre, origine: r.data.origine,
        mutation: lienT.mutation, enfants: [], nbRecettes: 0, nbTechniques: 0,
      });
      let p: string | null = null;
      const mere = r.data.variante_de;
      if (mere && recettes.has(mere.slug) && mere.slug !== r.id) {
        p = `recette:${mere.slug}`;
        noeuds.get(`recette:${r.id}`)!.mutation = mere.mutation;
      } else {
        if (mere) avertir(`recette « ${r.id} » : recette mère « ${mere.slug} » introuvable.`);
        const t = techniques.get(lienT.slug);
        if (!t) avertir(`recette « ${r.id} » : technique « ${lienT.slug} » introuvable (axe ${axe}), rattachée à la racine.`);
        else if (t.data.axe !== axe) avertir(`recette « ${r.id} » : technique « ${lienT.slug} » n'est pas sur l'axe ${axe}.`);
        else p = `technique:${t.id}`;
      }
      parentDe.set(`recette:${r.id}`, p);
    }

    // Casser d'éventuels cycles : on remonte chaque chaîne, un cycle est rattaché à la racine.
    for (const cle of parentDe.keys()) {
      const vus = new Set<string>([cle]);
      let c = parentDe.get(cle);
      while (c) {
        if (vus.has(c)) {
          avertir(`cycle détecté autour de « ${cle} », rattaché à la racine.`);
          parentDe.set(cle, null);
          break;
        }
        vus.add(c);
        c = parentDe.get(c) ?? null;
      }
    }

    const racines: Noeud[] = [];
    for (const [cle, p] of parentDe) {
      const n = noeuds.get(cle)!;
      if (p && noeuds.has(p)) noeuds.get(p)!.enfants.push(n);
      else racines.push(n);
    }

    const finaliser = (n: Noeud & { ordre?: number }) => {
      const techs = n.enfants.filter((e) => e.type === 'technique').sort(trierTechniques);
      const recs = n.enfants.filter((e) => e.type === 'recette').sort(trierTitre);
      n.enfants = [...techs, ...recs];
      n.nbRecettes = 0;
      n.nbTechniques = 0;
      for (const e of n.enfants) {
        finaliser(e);
        n.nbRecettes += e.nbRecettes + (e.type === 'recette' ? 1 : 0);
        n.nbTechniques += e.nbTechniques + (e.type === 'technique' ? 1 : 0);
      }
    };
    racines.forEach(finaliser);
    racines.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'technique' ? -1 : 1;
      return a.type === 'technique' ? trierTechniques(a, b) : trierTitre(a, b);
    });

    arbres[axe] = racines;
    index[axe] = noeuds;
    parents[axe] = parentDe;
  }

  return { techniques, recettes, arbres, index, parents };
}

/** Chaîne des nœuds de la racine jusqu'au nœud (inclus). */
export function ascendance(g: Genealogie, axe: Axe, cle: string): Noeud[] {
  const chaine: Noeud[] = [];
  let c: string | null | undefined = cle;
  const vus = new Set<string>();
  while (c && !vus.has(c)) {
    vus.add(c);
    const n = g.index[axe].get(c);
    if (!n) break;
    chaine.unshift(n);
    c = g.parents[axe].get(c);
  }
  return chaine;
}

/** Ascendance des techniques seules (de la racine à la technique donnée). */
export function ascendanceTechnique(g: Genealogie, slug: string): Technique[] {
  const chaine: Technique[] = [];
  const vus = new Set<string>();
  let t = g.techniques.get(slug);
  while (t && !vus.has(t.id)) {
    vus.add(t.id);
    chaine.unshift(t);
    const p = t.data.parent ? g.techniques.get(t.data.parent) : undefined;
    t = p && p.data.axe === t.data.axe ? p : undefined;
  }
  return chaine;
}

/** Drapeau emoji depuis un code ISO 3166-1 alpha-2. */
export function drapeau(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const PAYS = new Intl.DisplayNames(['fr'], { type: 'region' });
export function nomPays(code: string): string {
  try { return PAYS.of(code) ?? code; } catch { return code; }
}

/** Durée en minutes → « 2 h », « 1 h 30 », « 15 min ». */
export function duree(min: number): string {
  if (min < 60) return `${min}\u00a0min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}\u00a0h\u00a0${String(m).padStart(2, '0')}` : `${h}\u00a0h`;
}

export const DIFFICULTES: Record<string, string> = {
  facile: 'Facile',
  moyen: 'Difficulté moyenne',
  difficile: 'Difficile',
};

export function url(chemin: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${chemin.replace(/^\//, '')}`;
}
export const urlTechnique = (slug: string) => url(`techniques/${slug}/`);
export const urlRecette = (slug: string) => url(`recettes/${slug}/`);
export const urlNoeud = (n: Noeud) => (n.type === 'technique' ? urlTechnique(n.slug) : urlRecette(n.slug));
