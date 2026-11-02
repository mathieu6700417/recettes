import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Dossier du contenu : src/content par défaut, ou CONTENU_DIR (ex. tests/fixtures/content).
const dossier = (process.env.CONTENU_DIR ?? 'src/content').replace(/\/$/, '');
const racine = dossier.startsWith('/') ? dossier : `./${dossier}`;

export const UNITES = [
  'g', 'kg', 'ml', 'cl', 'l', 'c. à soupe', 'c. à café', 'pincée', 'gousse',
  'branche', 'botte', 'feuille', 'tranche', '',
] as const;

const lien = z.object({
  slug: z.string().min(1),
  mutation: z.string().min(1),
}).strict();

const techniques = defineCollection({
  loader: glob({ pattern: '*.md', base: `${racine}/techniques` }),
  schema: z.object({
    titre: z.string().min(1),
    axe: z.enum(['cuisson', 'base']),
    parent: z.string().min(1).optional(),
    mutation: z.string().min(1).optional(),
    resume: z.string().min(1),
    ordre: z.number().optional(),
  }).strict(),
});

const recettes = defineCollection({
  loader: glob({ pattern: '*.md', base: `${racine}/recettes` }),
  schema: z.object({
    titre: z.string().min(1),
    origine: z.string().regex(/^[A-Z]{2}$/),
    portions: z.number().int().min(1),
    preparation: z.number().int().min(0),
    cuisson: z.number().int().min(0),
    difficulte: z.enum(['facile', 'moyen', 'difficile']),
    cuisson_technique: lien,
    bases: z.array(lien).min(1),
    variante_de: lien.optional(),
    source: z.string().optional(),
    ingredients: z.array(z.object({
      qte: z.number().positive().nullable(),
      unite: z.enum(UNITES),
      nom: z.string().min(1),
      groupe: z.string().min(1).optional(),
    }).strict()).min(1),
    etapes: z.array(z.string().min(1)).min(1),
  }).strict(),
});

export const collections = { techniques, recettes };
