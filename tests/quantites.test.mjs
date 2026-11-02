// Tests de l'affichage des quantités (src/lib/quantites.ts) : node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { texteLigne, partiesLigne, texteQuantite } from '../src/lib/quantites.ts';

const oignon = { nom: 'oignon', pluriel: 'oignons' };
const champignon = { nom: 'champignon de Paris', pluriel: 'champignons de Paris' };
const ail = { nom: 'ail' };
const eau = { nom: 'eau', elision: true };
const huile = { nom: "huile d'olive", elision: true };

test('sans unité : singulier sous 2, pluriel à partir de 2', () => {
  assert.equal(texteLigne({ ...oignon, qte: 1, unite: '' }), '1 oignon');
  assert.equal(texteLigne({ ...oignon, qte: 2, unite: '' }), '2 oignons');
  assert.equal(texteLigne({ ...oignon, qte: 1.5, unite: '' }), '1,5 oignon');
  assert.equal(texteLigne({ nom: 'coq', qte: 2, unite: '' }), '2 coq', 'sans pluriel déclaré, le nom reste');
});

test('avec unité : « de » + pluriel s’il existe', () => {
  assert.equal(texteLigne({ ...champignon, qte: 250, unite: 'g' }), '250 g de champignons de Paris');
  assert.equal(texteLigne({ nom: 'veau', qte: 1, unite: 'kg' }), '1 kg de veau');
});

test('masse: singulier : pas de pluriel avec une unité', () => {
  assert.equal(texteLigne({ nom: 'dinde', pluriel: 'dindes', masse: 'singulier', qte: 1, unite: 'kg' }), '1 kg de dinde');
  assert.equal(texteLigne({ nom: 'yaourt', pluriel: 'yaourts', masse: 'singulier', qte: 150, unite: 'g' }), '150 g de yaourt');
  assert.equal(texteLigne({ nom: 'yaourt', pluriel: 'yaourts', masse: 'singulier', qte: 2, unite: '' }), '2 yaourts', 'sans unité, le pluriel reste');
});

test('unités accordées et élision', () => {
  assert.equal(texteLigne({ ...ail, qte: 2, unite: 'gousse' }), "2 gousses d'ail");
  assert.equal(texteLigne({ ...ail, qte: 1, unite: 'gousse' }), "1 gousse d'ail");
  assert.equal(texteLigne({ ...eau, qte: 1, unite: 'l' }), "1 l d'eau");
  assert.equal(texteLigne({ ...huile, qte: 2, unite: 'c. à soupe' }), "2 c. à soupe d'huile d'olive");
  assert.equal(texteLigne({ nom: 'sel', qte: 3, unite: 'pincée' }), '3 pincées de sel');
  assert.equal(texteLigne({ nom: 'os de bœuf', elision: false, qte: 1, unite: 'kg' }), '1 kg de os de bœuf');
  assert.equal(texteLigne({ nom: 'huile', qte: 1, unite: 'cl' }), "1 cl de huile", 'sans indication, h non élidé');
});

test('qte null : le nom seul', () => {
  assert.equal(texteLigne({ nom: 'sel', qte: null, unite: '' }), 'sel');
  assert.deepEqual(partiesLigne({ ...huile, qte: null, unite: 'c. à soupe' }), { quantite: '', liaison: '', nom: "huile d'olive" });
});

test('parties : quantité, liaison et nom séparés', () => {
  assert.deepEqual(partiesLigne({ ...ail, qte: 2, unite: 'gousse' }), { quantite: '2 gousses', liaison: "d'", nom: 'ail' });
  assert.deepEqual(partiesLigne({ ...oignon, qte: 3, unite: '' }), { quantite: '3', liaison: '', nom: 'oignons' });
});

test('mise à l’échelle : recalcul, conversion et accord', () => {
  assert.equal(texteLigne({ ...oignon, qte: 1, unite: '' }, 2), '2 oignons');
  assert.equal(texteLigne({ ...oignon, qte: 2, unite: '' }, 0.5), '1 oignon');
  assert.equal(texteLigne({ ...ail, qte: 1, unite: 'gousse' }, 2), "2 gousses d'ail");
  assert.equal(texteQuantite(1.2, 'kg', 0.25), '300 g');
  assert.equal(texteQuantite(500, 'g', 3), '1,5 kg');
  assert.equal(texteQuantite(75, 'cl', 2), '1,5 l');
  assert.equal(texteQuantite(1, 'l', 0.5), '50 cl');
  assert.equal(texteQuantite(null, 'g', 2), '');
});
