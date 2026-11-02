import type { APIRoute } from 'astro';
import { drapeau, majuscule } from '../lib/format';
import { ascendance, descendantsDe, nomDe, reseau, titreDe, urlDe, usagesDe } from '../lib/site';

// Index de recherche : tous les types de nœuds. Un ingrédient porte sa chaîne de familles
// (« Jarret de bœuf · bœuf à braiser · bœuf ») et les préparations qui l'utilisent
// (y compris via ses descendants).
export const GET: APIRoute = () => {
  const r = reseau();
  const prep = (slug: string) => ({ titre: titreDe(slug), url: urlDe(slug)!, drapeau: drapeau(r.noeud(slug)?.data.origine) });
  const entrees: unknown[] = [];

  for (const n of r.parType('preparation')) {
    const noms = new Set<string>();
    for (const v of r.versionsDe(n.slug)) {
      for (const l of r.liensDe(v.slug, 'utilise')) if (r.noeud(l.vers)) noms.add(nomDe(l.vers));
    }
    entrees.push({ t: 'preparation', ...prep(n.slug), nature: n.data.nature, resume: n.data.resume ?? '', ingredients: [...noms] });
  }
  for (const n of r.parType('technique')) {
    entrees.push({ t: 'technique', titre: titreDe(n.slug), url: urlDe(n.slug), resume: n.data.resume ?? '' });
  }
  for (const n of r.parType('profil')) {
    entrees.push({ t: 'profil', titre: titreDe(n.slug), url: urlDe(n.slug), drapeau: drapeau(n.data.origine), resume: n.data.resume ?? '' });
  }
  for (const n of r.parType('famille')) {
    entrees.push({ t: 'famille', titre: titreDe(n.slug), url: urlDe(n.slug), synonymes: [], chaine: "Famille d'ingrédients", preparations: [] });
  }
  for (const n of r.parType('ingredient')) {
    const chaine = [majuscule(n.data.nom), ...ascendance(n.slug).reverse().map((s) => nomDe(s).toLocaleLowerCase('fr-FR'))];
    const usages = usagesDe([n.slug, ...descendantsDe(n.slug)]);
    entrees.push({
      t: 'ingredient',
      titre: majuscule(n.data.nom),
      url: urlDe(n.slug),
      synonymes: Array.isArray(n.data.synonymes) ? n.data.synonymes : [],
      chaine: chaine.join(' · '),
      preparations: [...usages.keys()].map(prep),
    });
  }
  return new Response(JSON.stringify(entrees), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
