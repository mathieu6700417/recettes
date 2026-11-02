// Tests des propriétés dérivées (scripts/lib/derives.mjs) : régime végétarien et saison.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerReseau } from '../scripts/lib/reseau.mjs';
import {
  estCarne, versionVegetarienne, preparationVegetarienne, saisonDe, moisDeSaisonVersion, moisDeSaison, decrireMois,
} from '../scripts/lib/derives.mjs';

/**
 * Petit réseau en mémoire, avec la même API que chargerReseau (noeud, liensDe, versionsDe).
 * ingredients : { slug, famille, parent?, saison?, placard? }
 * versions : { slug: '<prep>--<v>', reference?: false, lignes: ['slug-ingredient' | { preparation }] }
 */
function faux(ingredients, versions) {
  const noeuds = new Map();
  for (const i of ingredients) noeuds.set(i.slug, { type: 'ingredient', slug: i.slug, famille: i.famille, data: i });
  for (const v of versions) {
    const prep = v.slug.split('--')[0];
    if (!noeuds.has(prep)) noeuds.set(prep, { type: 'preparation', slug: prep, data: {} });
    noeuds.set(v.slug, { type: 'version', slug: v.slug, preparation: prep, data: { reference: v.reference !== false } });
  }
  return {
    noeud: (s) => noeuds.get(s),
    liensDe: (s, type) => {
      const n = noeuds.get(s);
      if (type === 'utilise' && n?.type === 'version') {
        return versions.find((v) => v.slug === s).lignes.map((l) => ({ vers: typeof l === 'string' ? l : l.preparation }));
      }
      if (type === 'parent' && n?.type === 'ingredient') {
        return [n.data.parent ? { vers: n.data.parent } : { vers: n.famille, implicite: true }];
      }
      return [];
    },
    versionsDe: (p) => versions.filter((v) => v.slug.startsWith(`${p}--`))
      .sort((a, b) => (b.reference !== false) - (a.reference !== false))
      .map((v) => noeuds.get(v.slug)),
  };
}

const ING = [
  { slug: 'lardons', famille: 'porc' },
  { slug: 'crevette', famille: 'poissons', parent: 'fruits-de-mer' },
  { slug: 'fruits-de-mer', famille: 'poissons' },
  { slug: 'bouillon', famille: 'liquides' },
  { slug: 'bouillon-de-volaille', famille: 'liquides', parent: 'bouillon' },
  { slug: 'bouillon-de-legumes', famille: 'liquides', parent: 'bouillon' },
  { slug: 'fumet-de-poisson', famille: 'liquides', parent: 'bouillon' },
  { slug: 'carotte', famille: 'legumes', saison: [10, 11, 12, 1, 2, 3, 4] },
  { slug: 'courge', famille: 'legumes', saison: [9, 10, 11, 12, 1, 2] },
  { slug: 'potimarron', famille: 'legumes', parent: 'courge' },
  { slug: 'tomate', famille: 'legumes', saison: [6, 7, 8, 9] },
  { slug: 'oignon', famille: 'aromates' },
  { slug: 'beurre', famille: 'matieres-grasses', placard: true, saison: [5] },
  { slug: 'oeuf', famille: 'oeufs' },
];

const R = faux(ING, [
  { slug: 'veloute--classique', lignes: ['potimarron', 'oignon', 'beurre', { preparation: 'fond-de-legumes' }] },
  { slug: 'veloute--maison', reference: false, lignes: ['potimarron', 'lardons'] },
  { slug: 'fond-de-legumes--classique', lignes: ['carotte', 'oignon'] },
  { slug: 'quiche--classique', lignes: ['oeuf', 'lardons'] },
  { slug: 'risotto--classique', lignes: ['oignon', 'bouillon-de-volaille'] },
  { slug: 'soupe--classique', lignes: ['carotte', 'bouillon-de-legumes'] },
  { slug: 'soupe-mystere--classique', lignes: ['oignon', 'bouillon'] },
  // carné caché deux niveaux plus bas : plat → sauce → fond → fumet
  { slug: 'gratin--classique', lignes: ['potimarron', { preparation: 'sauce' }] },
  { slug: 'sauce--classique', lignes: ['beurre', { preparation: 'fond' }] },
  { slug: 'fond--classique', lignes: ['oignon', 'fumet-de-poisson'] },
  { slug: 'ratatouille--classique', lignes: ['tomate', 'courge', 'oignon'] },
  { slug: 'omelette--classique', lignes: ['oeuf', 'beurre'] },
]);

// ---------- Régime ----------

test('ingrédient d’une famille carnée (y compris fruits de mer) : carné', () => {
  assert.equal(estCarne(R, 'lardons'), true);
  assert.equal(estCarne(R, 'crevette'), true);
  assert.equal(versionVegetarienne(R, 'quiche--classique'), false);
});

test('ingrédient carné hors famille : bouillon de volaille, bouillon générique ; pas le bouillon de légumes', () => {
  assert.equal(estCarne(R, 'bouillon-de-volaille'), true);
  assert.equal(estCarne(R, 'bouillon'), true, 'bouillon générique : carné par prudence');
  assert.equal(estCarne(R, 'bouillon-de-legumes'), false, 'pas d’héritage depuis bouillon');
  assert.equal(versionVegetarienne(R, 'risotto--classique'), false);
  assert.equal(versionVegetarienne(R, 'soupe-mystere--classique'), false);
  assert.equal(versionVegetarienne(R, 'soupe--classique'), true);
});

test('carné caché dans une base imbriquée : non végétarien', () => {
  assert.equal(versionVegetarienne(R, 'fond--classique'), false);
  assert.equal(versionVegetarienne(R, 'sauce--classique'), false);
  assert.equal(versionVegetarienne(R, 'gratin--classique'), false);
  assert.equal(preparationVegetarienne(R, 'gratin'), false);
});

test('végétarien pur, y compris à travers une base végétarienne', () => {
  assert.equal(versionVegetarienne(R, 'omelette--classique'), true);
  assert.equal(versionVegetarienne(R, 'veloute--classique'), true);
  assert.equal(preparationVegetarienne(R, 'veloute'), true);
});

test('préparation : selon sa référence, même si une autre version est carnée', () => {
  assert.equal(versionVegetarienne(R, 'veloute--maison'), false);
  assert.equal(preparationVegetarienne(R, 'veloute'), true);
  assert.equal(preparationVegetarienne(R, 'inconnue'), undefined);
});

// ---------- Saison ----------

test('saison propre, héritée du parent, ou absente', () => {
  assert.deepEqual(saisonDe(R, 'carotte'), { mois: [1, 2, 3, 4, 10, 11, 12], de: 'carotte' });
  assert.deepEqual(saisonDe(R, 'potimarron'), { mois: [1, 2, 9, 10, 11, 12], de: 'courge' });
  assert.equal(saisonDe(R, 'oignon'), null);
  assert.equal(saisonDe(R, 'inconnu'), null);
});

test('mois de saison d’une version : intersection des ingrédients saisonniers, placard ignoré', () => {
  // potimarron (9–2) ; oignon sans saison ; beurre placard (sa saison est ignorée)
  assert.deepEqual(moisDeSaisonVersion(R, 'veloute--classique'), [1, 2, 10, 11, 12]); // potimarron ∩ carotte du fond de légumes
  // tomate (6–9) ∩ courge (9–2) = septembre
  assert.deepEqual(moisDeSaisonVersion(R, 'ratatouille--classique'), [9]);
  // aucun ingrédient saisonnier (le beurre est au placard)
  assert.deepEqual(moisDeSaisonVersion(R, 'omelette--classique'), []);
  assert.deepEqual(moisDeSaison(R, 'veloute'), [1, 2, 10, 11, 12]);
  assert.deepEqual(moisDeSaison(R, 'inconnue'), []);
});

test('saison héritée des bases (récursif), intersection avec un ingrédient direct, cycle', () => {
  const R = faux(
    [
      { slug: 'oignon', famille: 'legumes', saison: [9, 10, 11, 12, 1] },
      { slug: 'tomate', famille: 'legumes', saison: [6, 7, 8, 9] },
      { slug: 'courge', famille: 'legumes', saison: [10, 11, 12] },
      { slug: 'sel', famille: 'condiments', placard: true },
    ],
    [
      { slug: 'compotee--classique', lignes: ['oignon', 'sel'] },
      { slug: 'base--classique', lignes: [{ preparation: 'compotee' }] },
      { slug: 'soupe--classique', lignes: [{ preparation: 'base' }] },
      { slug: 'tarte--classique', lignes: [{ preparation: 'base' }, 'courge'] },
      { slug: 'sauce--classique', lignes: [{ preparation: 'compotee' }, 'tomate'] },
      { slug: 'boucle--classique', lignes: [{ preparation: 'boucle' }, 'courge'] },
      { slug: 'neutre--classique', lignes: [{ preparation: 'fade' }, 'sel'] },
      { slug: 'fade--classique', lignes: ['sel'] },
    ],
  );
  // saison de l'oignon, deux bases plus bas
  assert.deepEqual(moisDeSaisonVersion(R, 'soupe--classique'), [1, 9, 10, 11, 12]);
  // oignon (via bases) ∩ courge directe
  assert.deepEqual(moisDeSaisonVersion(R, 'tarte--classique'), [10, 11, 12]);
  // intersection vide (oignon ∩ tomate = septembre) puis vraiment vide : distinct de « sans saison »
  assert.deepEqual(moisDeSaisonVersion(R, 'sauce--classique'), [9]);
  assert.deepEqual(moisDeSaisonVersion(R, 'boucle--classique'), [10, 11, 12], 'cycle sans blocage');
  assert.deepEqual(moisDeSaisonVersion(R, 'neutre--classique'), [], 'aucun ingrédient saisonnier, même en profondeur');
});

test('description des mois : plages, passage par janvier, mois isolés', () => {
  assert.equal(decrireMois([9, 10, 11, 12, 1, 2]), 'septembre à février');
  assert.equal(decrireMois([3, 4, 5, 9, 10]), 'mars à mai ; septembre et octobre');
  assert.equal(decrireMois([12, 1, 6]), 'juin ; décembre et janvier');
  assert.equal(decrireMois([7]), 'juillet');
  assert.equal(decrireMois([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), "toute l'année");
  assert.equal(decrireMois([]), '');
});

// ---------- Sur les fixtures ----------

test('fixtures : régime et saison dérivés du réseau chargé', () => {
  const ici = path.dirname(fileURLToPath(import.meta.url));
  const r = chargerReseau(path.join(ici, 'fixtures', 'v2', 'valide'));
  assert.equal(preparationVegetarienne(r, 'ile-flottante'), true, 'crème anglaise en base, végétarienne');
  assert.equal(preparationVegetarienne(r, 'roux'), true);
  assert.equal(preparationVegetarienne(r, 'coq-au-vin'), false, 'coq : famille volaille');
  assert.equal(preparationVegetarienne(r, 'fond-brun'), false, 'os de bœuf');
  // petit oignon hérite de l'oignon (8–3) ; carotte (10–4) ; ail sans saison
  assert.deepEqual(saisonDe(r, 'petit-oignon')?.de, 'oignon');
  assert.deepEqual(moisDeSaison(r, 'boeuf-bourguignon'), [1, 2, 3, 10, 11, 12]);
  assert.deepEqual(moisDeSaison(r, 'ile-flottante'), []);
});
