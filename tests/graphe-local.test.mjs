import { test } from 'node:test';
import assert from 'node:assert/strict';
import { disposer, boiteLibelle, boitesSeRecouvrent } from '../src/lib/graphe-local.ts';

const noms = ['Joue de bœuf braisée', 'Jarret de bœuf', 'Macreuse de bœuf', 'Gîte de bœuf', 'Paleron de bœuf', 'Plat de côtes de bœuf', 'Queue de bœuf longuement mijotée'];
const ent = (t, i) => ({ slug: `s${i}`, titre: t, url: `/${i}`, teinte: 'parent' });

for (const cote of ['haut', 'bas']) {
  test(`arc ${cote} de 7 nœuds aux titres longs : aucun recouvrement, tout dans le cadre`, () => {
    const e = { haut: [], bas: [], gauche: [], droite: [] };
    e[cote] = noms.map(ent);
    const g = disposer('Bœuf à braiser', e);
    assert.equal(g.points.length, 7);
    const boites = g.points.map(boiteLibelle);
    boites.forEach((b, i) => {
      assert.ok(b.x0 >= 0 && b.x1 <= g.largeur, `libellé ${i} dans le cadre`);
      for (let j = i + 1; j < boites.length; j++) assert.ok(!boitesSeRecouvrent(b, boites[j]), `libellés ${i} et ${j} distincts`);
    });
  });
}

test('déterministe', () => {
  const e = { haut: noms.map(ent), bas: noms.map(ent), gauche: [], droite: [] };
  assert.deepEqual(disposer('X', e), disposer('X', e));
});
