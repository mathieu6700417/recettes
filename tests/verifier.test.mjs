// Tests du vérificateur v2 : node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerReseau } from '../scripts/lib/reseau.mjs';
import { validerReseau } from '../scripts/lib/valider.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const projet = path.resolve(ici, '..');
const fixtures = path.join(ici, 'fixtures', 'v2');

function verifier(dossier) {
  const r = spawnSync(process.execPath, [path.join(projet, 'scripts', 'verifier.mjs'), dossier], { cwd: projet, encoding: 'utf8' });
  const m = r.stdout.match(/(\d+) erreurs?, (\d+) avertissements?\s*$/);
  return { code: r.status, sortie: r.stdout + r.stderr, erreurs: m ? Number(m[1]) : NaN };
}

test('le réseau valide passe sans erreur', () => {
  const r = verifier(path.join(fixtures, 'valide'));
  assert.equal(r.code, 0, r.sortie);
  assert.equal(r.erreurs, 0, r.sortie);
  // Les éléments des listes fermées absents du contenu ne sont que des avertissements.
  assert.match(r.sortie, /⚠ \d+ plat\(s\) de la liste fermée absent\(e\)s du contenu/);
});

// cas → [fichier fautif, message attendu, nombre d'erreurs]
const CAS = {
  'cycle-composants': ['preparations/fond-brun.md', /cycle dans les composants : fond-brun → roux → fond-brun/, 1],
  'deux-references': ['preparations/boeuf-bourguignon.md', /2 versions de référence \(attendu exactement une\)/, 1],
  'ecarts-manquant': ['versions/boeuf-bourguignon--maison.md', /ecarts : requis pour une version qui n'est pas la référence/, 1],
  'role-inconnu': ['preparations/boeuf-bourguignon.md', /composants\[2\]\.role : rôle inconnu « epaississant »/, 1],
  'unite-inconnue': ['versions/roux--classique.md', /ingredients\[2\]\.unite : unité inconnue « grammes »/, 1],
  'mutation-trop-longue': ['preparations/coq-au-vin.md', /substitution\[1\]\.mutation : trop longue \(70 caractères, maximum 60\)/, 1],
  'slug-inconnu': ['preparations/coq-au-vin.md', /profils\[1\]\.slug : slug inconnu « a-la-normande » \(attendu : un profil\)/, 1],
  'slug-duplique': ['ingredients/feculents.yaml', /slug « roux » déclaré plusieurs fois sur le réseau : une préparation .*, un ingrédient/, 2],
  'trois-meres': ['preparations/coq-au-vin.md', /substitution : 3 mères déclarées, maximum 2/, 1],
  'echanges-vides': ['preparations/coq-au-vin.md', /substitution\[1\]\.echanges : au moins un échange/, 1],
  'composant-pas-base': ['preparations/coq-au-vin.md', /composants\[1\]\.slug : « boeuf-bourguignon » n'est pas une base/, 1],
  'plat-sans-cuisson': ['preparations/ile-flottante.md', /cuisson : au moins une technique requise pour un plat/, 1],
  'technique-hors-liste': ['techniques/flamber.md', /slug hors de la liste fermée des techniques : « flamber »/, 1],
  'masse-inconnue': ['ingredients/volaille.yaml', /ingredients\[1\] \(« coq »\)\.masse : seule valeur permise « singulier » \(reçu « pluriel »\)/, 1],
  'saison-invalide': ['ingredients/aromates.yaml', /ingredients\[1\] \(« oignon »\)\.saison\[3\] : mois invalide 13 \(entier de 1 à 12 attendu\)/, 4],
};

for (const [cas, [fichier, message, nb]] of Object.entries(CAS)) {
  test(`invalide : ${cas}`, () => {
    const dossier = path.join(fixtures, 'invalide', cas);
    const r = verifier(dossier);
    assert.equal(r.code, 1, r.sortie);
    assert.equal(r.erreurs, nb, r.sortie);
    // Le message suit l'en-tête du fichier fautif.
    const rel = path.relative(projet, path.join(dossier, fichier));
    const bloc = r.sortie.split(/\n(?=\S)/).find((b) => b.startsWith(rel));
    assert.ok(bloc, `aucun message pour ${rel}\n${r.sortie}`);
    assert.match(bloc, message);
  });
}

test('chaque cas invalide a un test', async () => {
  const fs = await import('node:fs');
  const dossiers = fs.readdirSync(path.join(fixtures, 'invalide')).sort();
  assert.deepEqual(dossiers, Object.keys(CAS).sort());
});

test('API du réseau : nœuds, liens typés dans les deux sens', () => {
  const r = chargerReseau(path.join(fixtures, 'valide'));
  assert.equal(validerReseau(r).erreurs, 0);
  assert.equal(r.noeud('coq-au-vin').type, 'preparation');
  assert.equal(r.noeud('joue-de-boeuf').famille, 'boeuf');
  assert.equal(r.noeud('boeuf').type, 'famille');
  assert.deepEqual(r.ancetres('cuire-a-la-nappe'), ['cuire-en-remuant', 'sur-le-feu']);
  assert.deepEqual(r.ancetres('joue-de-boeuf'), ['boeuf-a-braiser', 'boeuf']);
  assert.deepEqual(r.liensVers('fond-brun', 'composant').map((l) => l.de), ['boeuf-bourguignon']);
  assert.deepEqual(r.liensVers('fond-brun', 'utilise').map((l) => l.de), ['boeuf-bourguignon--classique']);
  const sub = r.liensDe('coq-au-vin', 'substitution');
  assert.equal(sub[0].vers, 'boeuf-bourguignon');
  assert.deepEqual(sub[0].echanges, [{ de: 'boeuf-a-braiser', vers: 'coq' }]);
  assert.deepEqual(r.versionsDe('boeuf-bourguignon').map((v) => v.slug), ['boeuf-bourguignon--classique', 'boeuf-bourguignon--maison']);
  assert.deepEqual(r.liensVers('mirepoix', 'parent').map((l) => l.de), ['sofrito']);
  assert.equal(r.liensDe('boeuf-bourguignon', 'composant')[1].role, 'liaison');
});

test('saison : chaque forme invalide est signalée', () => {
  const r = verifier(path.join(fixtures, 'invalide', 'saison-invalide'));
  assert.match(r.sortie, /« oignon »\)\.saison\[3\] : mois invalide 13/);
  assert.match(r.sortie, /« petit-oignon »\)\.saison\[3\] : mois 9 déjà cité/);
  assert.match(r.sortie, /« carotte »\)\.saison : liste non vide requise/);
  assert.match(r.sortie, /« ail »\)\.saison : liste de mois \(entiers de 1 à 12\) attendue \(reçu « septembre »\)/);
});
