#!/usr/bin/env node
// Vérifie strictement le contenu v2 (réseau à liens typés) selon CONTENU-v2.md.
// Usage : node scripts/verifier.mjs [dossierContenu]   (défaut : src/content)
// Code de sortie : 0 si aucune erreur, 1 s'il y a des erreurs, 2 si le dossier est introuvable.
import { chargerReseau } from './lib/reseau.mjs';
import { validerReseau } from './lib/valider.mjs';

const dossier = process.argv[2] ?? 'src/content';

const tty = process.stdout.isTTY;
const c = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const rouge = (s) => c(31, s);
const jaune = (s) => c(33, s);
const gras = (s) => c(1, s);

let reseau;
try {
  reseau = chargerReseau(dossier);
} catch (e) {
  console.error(rouge(e.message));
  process.exit(2);
}
const bilan = validerReseau(reseau);

const bloc = (titre, erreurs, avertissements) => {
  if (!erreurs.length && !avertissements.length) return;
  console.log(gras(titre));
  erreurs.forEach((m) => console.log(`  ${rouge('✗')} ${m}`));
  avertissements.forEach((m) => console.log(`  ${jaune('⚠')} ${m}`));
};
for (const f of reseau.fichiers) bloc(f.rel, f.erreurs, f.avertissements);
bloc('Réseau (listes fermées)', bilan.global.erreurs, bilan.global.avertissements);

const pl = (n, s) => `${n} ${s}${n > 1 ? 's' : ''}`;
const compte = (t) => reseau.parType(t).length;
console.log(
  `\n${pl(reseau.fichiers.length, 'fichier')} (${compte('technique')} techniques, ${compte('preparation')} préparations, `
  + `${compte('version')} versions, ${compte('profil')} profils, ${compte('famille')} familles, ${compte('ingredient')} ingrédients), `
  + `${pl(bilan.erreurs, 'erreur')}, ${pl(bilan.avertissements, 'avertissement')}`,
);
process.exit(bilan.erreurs > 0 ? 1 : 0);
