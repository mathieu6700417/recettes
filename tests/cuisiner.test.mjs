// Tests de « cuisiner avec ce que j'ai » (src/lib/cuisiner.ts) : node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexer, correspondre, evaluer, classer } from '../src/lib/cuisiner.ts';

const ING = [
  { slug: 'boeuf-a-braiser', nom: 'bœuf à braiser', parent: 'boeuf', parentEstFamille: true },
  { slug: 'joue-de-boeuf', nom: 'joue de bœuf', parent: 'boeuf-a-braiser' },
  { slug: 'jarret-de-boeuf', nom: 'jarret de bœuf', parent: 'boeuf-a-braiser' },
  { slug: 'boeuf-hache', nom: 'bœuf haché', parent: 'boeuf', parentEstFamille: true },
  { slug: 'coq', nom: 'coq', parent: 'volaille', parentEstFamille: true, substituts: ['poulet'] },
  { slug: 'poulet', nom: 'poulet', parent: 'volaille', parentEstFamille: true },
  { slug: 'vin-rouge', nom: 'vin rouge', parent: 'alcools', parentEstFamille: true },
  { slug: 'oignon', nom: 'oignon', parent: 'aromates', parentEstFamille: true },
  { slug: 'petit-oignon', nom: 'petit oignon', parent: 'oignon' },
  { slug: 'carotte', nom: 'carotte', parent: 'legumes', parentEstFamille: true },
  { slug: 'sel', nom: 'sel', parent: 'epices', parentEstFamille: true, placard: true },
];
const ref = indexer(ING);

test('même ingrédient ou ancêtre/descendant : couvert', () => {
  assert.deepEqual(correspondre(ref, 'carotte', ['carotte']), { requis: 'carotte', etat: 'couvert', par: 'carotte' });
  assert.equal(correspondre(ref, 'boeuf-a-braiser', ['joue-de-boeuf']).etat, 'couvert', 'descendant disponible');
  assert.equal(correspondre(ref, 'joue-de-boeuf', ['boeuf-a-braiser']).etat, 'couvert', 'ancêtre disponible');
  assert.equal(correspondre(ref, 'petit-oignon', ['oignon']).par, 'oignon');
});

test('sœur ou substitut déclaré : avec substitution', () => {
  assert.deepEqual(correspondre(ref, 'joue-de-boeuf', ['jarret-de-boeuf']), { requis: 'joue-de-boeuf', etat: 'substitution', par: 'jarret-de-boeuf' });
  assert.equal(correspondre(ref, 'coq', ['poulet']).etat, 'substitution');
  assert.equal(correspondre(ref, 'poulet', ['coq']).etat, 'substitution', 'substitut réciproque');
});

test('même famille seulement : manquant', () => {
  assert.equal(correspondre(ref, 'boeuf-a-braiser', ['boeuf-hache']).etat, 'manquant');
  assert.equal(correspondre(ref, 'carotte', []).etat, 'manquant');
});

test('évaluation : placard ignoré, manquants listés', () => {
  const p = { slug: 'bourguignon', titre: 'Bœuf bourguignon', url: '/', ingredients: ['boeuf-a-braiser', 'vin-rouge', 'petit-oignon', 'carotte', 'sel'] };
  const r = evaluer(ref, p, ['joue-de-boeuf', 'oignon']);
  assert.equal(r.total, 4);
  assert.equal(r.couverts.length, 2);
  assert.deepEqual(r.manquants, ['vin-rouge', 'carotte']);
  assert.equal(r.score, 0.5);
});

test('classement : couverture décroissante, sans résultat vide', () => {
  const preps = [
    { slug: 'a', titre: 'A', url: '/a', ingredients: ['coq', 'vin-rouge'] },
    { slug: 'b', titre: 'B', url: '/b', ingredients: ['carotte', 'oignon'] },
    { slug: 'c', titre: 'C', url: '/c', ingredients: ['boeuf-hache'] },
  ];
  const res = classer(ref, preps, ['carotte', 'oignon', 'poulet']);
  assert.deepEqual(res.map((r) => r.preparation.slug), ['b', 'a']);
  assert.equal(res[1].substitutions[0].par, 'poulet');
  assert.deepEqual(classer(ref, preps, []), []);
});

import { repartir } from '../src/lib/cuisiner.ts';
test('repartir : plats d’abord, bases à part, ordre conservé', () => {
  const mk = (slug, nature) => ({ preparation: { slug, titre: slug, url: '/', nature, ingredients: [] }, total: 1, couverts: [], substitutions: [], manquants: [], score: 1 });
  const r = repartir([mk('singer', 'base'), mk('coq', 'plat'), mk('marinade', 'base'), mk('daube', undefined)]);
  assert.deepEqual(r.plats.map((x) => x.preparation.slug), ['coq', 'daube']);
  assert.deepEqual(r.bases.map((x) => x.preparation.slug), ['singer', 'marinade']);
});
