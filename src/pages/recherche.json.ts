import type { APIRoute } from 'astro';
import { drapeau, genealogie } from '../lib/arbre';

export const GET: APIRoute = async () => {
  const g = await genealogie();
  const titreTechnique = (slug: string) => g.techniques.get(slug)?.data.titre ?? slug;
  const recettes = [...g.recettes.values()].map((r) => ({
    type: 'recette' as const,
    titre: r.data.titre,
    slug: r.id,
    origine: r.data.origine,
    drapeau: drapeau(r.data.origine),
    ingredients: r.data.ingredients.map((i) => i.nom),
    techniques: [r.data.cuisson_technique, ...r.data.bases].map((l) => titreTechnique(l.slug)),
  }));
  const techniques = [...g.techniques.values()].map((t) => ({
    type: 'technique' as const,
    titre: t.data.titre,
    slug: t.id,
    axe: t.data.axe,
    resume: t.data.resume,
  }));
  recettes.sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
  techniques.sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
  return new Response(JSON.stringify([...recettes, ...techniques]), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
