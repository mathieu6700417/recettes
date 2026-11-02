import type { APIRoute } from 'astro';
import { drapeau, majuscule } from '../lib/format';
import type { IngredientCuisine, PreparationCuisine } from '../lib/cuisiner';
import { reseau, titreDe, urlDe } from '../lib/site';

// Données de « cuisiner avec ce que j'ai » : le référentiel et, pour chaque préparation,
// les ingrédients de sa version de référence.
export const GET: APIRoute = () => {
  const r = reseau();
  const ingredients: IngredientCuisine[] = r.parType('ingredient').map((n) => {
    const p = r.liensDe(n.slug, 'parent')[0];
    return {
      slug: n.slug,
      nom: n.data.nom,
      parent: p?.vers ?? n.famille ?? null,
      parentEstFamille: !p || p.implicite === true || r.noeud(p.vers)?.type === 'famille',
      substituts: Array.isArray(n.data.substituts) ? n.data.substituts : [],
      placard: n.data.placard === true,
      synonymes: Array.isArray(n.data.synonymes) ? n.data.synonymes : [],
      famille: n.famille ? titreDe(n.famille) : undefined,
    };
  });
  const preparations: PreparationCuisine[] = [];
  for (const n of r.parType('preparation')) {
    const ref = r.versionsDe(n.slug)[0];
    if (!ref) continue;
    const lignes = r.liensDe(ref.slug, 'utilise');
    preparations.push({
      slug: n.slug,
      titre: n.data.titre,
      url: urlDe(n.slug)!,
      drapeau: drapeau(n.data.origine),
      nature: n.data.nature,
      ingredients: lignes.filter((l) => r.noeud(l.vers)?.type === 'ingredient').map((l) => l.vers),
      aPreparer: lignes.filter((l) => r.noeud(l.vers)?.type === 'preparation').map((l) => majuscule(titreDe(l.vers))),
    });
  }
  return new Response(JSON.stringify({ ingredients, preparations }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
