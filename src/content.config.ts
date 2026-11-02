import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { defineCollection } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';
import { z } from 'astro/zod';

// Format v2 (réseau à liens typés) : voir CONTENU-v2.md. Les règles transverses (références
// existantes et du bon type, listes fermées, cycles, version de référence unique…) sont
// vérifiées par scripts/verifier.mjs ; les schémas ci-dessous valident la forme de chaque entrée.

// Dossier du contenu : src/content par défaut, ou CONTENU_DIR (ex. tests/fixtures/v2/valide).
const dossier = (process.env.CONTENU_DIR ?? 'src/content').replace(/\/$/, '');
const racine = dossier.startsWith('/') ? dossier : `./${dossier}`;

export const UNITES = [
  'g', 'kg', 'ml', 'cl', 'l', 'c. à soupe', 'c. à café', 'pincée', 'gousse',
  'branche', 'botte', 'feuille', 'tranche', '',
] as const;
export const ROLES = [
  'structure', 'sauce', 'liaison', 'garniture', 'finition', 'accompagnement', 'aromatique',
] as const;
export const STATUTS = ['a-relire', 'relu-agent', 'relu-mathieu'] as const;
export const NATURES = ['plat', 'base'] as const;
export const DIFFICULTES = ['facile', 'moyen', 'difficile'] as const;
export const MUTATION_MAX = 60;

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const texte = z.string().trim().min(1);
const pays = z.string().regex(/^[A-Z]{2}$/);
const mutation = texte.max(MUTATION_MAX);
const minutes = z.number().int().min(0);

// ---------- Techniques ----------
const techniques = defineCollection({
  loader: glob({ pattern: '*.md', base: `${racine}/techniques` }),
  schema: z.object({
    titre: texte,
    parent: slug.nullish(),
    mutation: mutation.nullish(),
    resume: texte,
    ordre: z.number().optional(),
  }).strict().refine((d) => !d.parent === !d.mutation, {
    message: 'mutation requise si parent, interdite sinon',
    path: ['mutation'],
  }),
});

// ---------- Préparations ----------
const preparations = defineCollection({
  loader: glob({ pattern: '*.md', base: `${racine}/preparations` }),
  schema: z.object({
    titre: texte,
    origine: pays,
    nature: z.enum(NATURES),
    resume: texte,
    cuisson: z.array(z.object({ slug, mutation }).strict()).default([]),
    composants: z.array(z.object({ slug, role: z.enum(ROLES), mutation }).strict()).default([]),
    substitution: z.array(z.object({
      mere: slug,
      mutation,
      echanges: z.array(z.object({ de: slug, vers: slug }).strict()).min(1),
    }).strict()).max(2).default([]),
    profils: z.array(z.object({ slug, mutation: mutation.optional() }).strict()).default([]),
    histoire: z.object({ texte, source: texte }).strict().nullish(),
    ordre: z.number().optional(),
  }).strict().refine((d) => d.nature !== 'plat' || d.cuisson.length > 0, {
    message: 'cuisson : au moins une technique requise pour un plat',
    path: ['cuisson'],
  }),
});

// ---------- Versions ----------
const ligneIngredient = z.object({
  ingredient: slug.optional(),
  preparation: slug.optional(),
  qte: z.number().positive().nullable(),
  unite: z.enum(UNITES),
  precision: texte.optional(),
  groupe: texte.optional(),
}).strict().refine((l) => (l.ingredient === undefined) !== (l.preparation === undefined), {
  message: 'exactement une des clés « ingredient » ou « preparation » requise',
});

const versions = defineCollection({
  // id = <preparation>--<version>
  loader: glob({ pattern: '*.md', base: `${racine}/versions` }),
  schema: z.object({
    preparation: slug,
    titre: texte,
    reference: z.boolean(),
    ecarts: texte.optional(),
    statut: z.enum(STATUTS),
    portions: z.number().int().min(1),
    temps: z.object({ preparation: minutes, cuisson: minutes, repos: minutes.optional() }).strict(),
    difficulte: z.enum(DIFFICULTES),
    source: texte.optional(),
    ingredients: z.array(ligneIngredient).min(1),
    etapes: z.array(texte).min(1),
  }).strict().refine((d) => d.reference === (d.ecarts === undefined), {
    message: 'ecarts requis si reference: false, interdit si reference: true',
    path: ['ecarts'],
  }),
});

// ---------- Profils aromatiques ----------
const profils = defineCollection({
  loader: glob({ pattern: '*.md', base: `${racine}/profils` }),
  schema: z.object({
    titre: texte,
    parent: slug.nullish(),
    mutation: mutation.nullish(),
    origine: pays.nullish(),
    resume: texte,
    composition: z.array(z.object({ ingredient: slug, precision: texte.optional() }).strict()).min(1),
  }).strict().refine((d) => !d.parent === !d.mutation, {
    message: 'mutation requise si parent, interdite sinon',
    path: ['mutation'],
  }),
});

// ---------- Référentiel des ingrédients ----------
// Un fichier YAML par famille ; le loader produit une entrée par ingrédient ET une par
// famille (estFamille: true, nom = titre de la famille, sans parent).
const ingredientBrut = z.object({
  slug,
  nom: texte,
  pluriel: texte.optional(),
  parent: slug.optional(),
  synonymes: z.array(texte).optional(),
  techniques: z.array(slug).optional(),
  substituts: z.array(slug).optional(),
  placard: z.boolean().optional(),
  elision: z.boolean().optional(),
  masse: z.literal('singulier').optional(),
  // mois de pleine saison (1 à 12), sans doublon ; un enfant sans saison hérite de son parent
  saison: z.array(z.number().int().min(1).max(12)).min(1)
    .refine((m) => new Set(m).size === m.length, { message: 'saison : mois en double' }).optional(),
}).strict();

const fichierFamille = z.object({
  titre: texte,
  ingredients: z.array(z.unknown()).min(1),
}).strict();

function referentiel(base: string): Loader {
  const dossierIng = path.resolve(base);
  return {
    name: 'referentiel-ingredients',
    load: async ({ store, parseData, generateDigest, logger, watcher }) => {
      const charger = async () => {
        store.clear();
        if (!fs.existsSync(dossierIng)) {
          logger.warn(`dossier des ingrédients introuvable : ${dossierIng}`);
          return;
        }
        const fichiers = fs.readdirSync(dossierIng).filter((f) => f.endsWith('.yaml')).sort();
        for (const f of fichiers) {
          const famille = f.slice(0, -'.yaml'.length);
          const brut = fichierFamille.parse(yaml.load(fs.readFileSync(path.join(dossierIng, f), 'utf8')));
          const familleData = await parseData({
            id: famille,
            data: { slug: famille, nom: brut.titre, famille, estFamille: true },
          });
          store.set({ id: famille, data: familleData, digest: generateDigest(familleData) });
          for (const x of brut.ingredients) {
            const ing = ingredientBrut.parse(x);
            const data = await parseData({ id: ing.slug, data: { ...ing, famille, estFamille: false } });
            store.set({ id: ing.slug, data, digest: generateDigest(data) });
          }
        }
      };
      await charger();
      if (watcher) {
        watcher.add(dossierIng);
        const recharger = (p: string) => {
          if (p.startsWith(dossierIng) && p.endsWith('.yaml')) charger().catch((e) => logger.error(String(e)));
        };
        watcher.on('change', recharger);
        watcher.on('add', recharger);
        watcher.on('unlink', recharger);
      }
    },
  };
}

const ingredients = defineCollection({
  loader: referentiel(`${racine}/ingredients`),
  schema: ingredientBrut.extend({
    famille: slug,
    estFamille: z.boolean(),
  }).strict(),
});

export const collections = { techniques, preparations, versions, profils, ingredients };
