# Généalogie des recettes

Les recettes rangées en **réseau à liens typés**. Une préparation (plat ou base) descend d'une
**technique de cuisson** (Chaleur humide → Braiser → Ragoût), de **composants** (fond brun,
roux, pâte à choux…), de **profils aromatiques** (mirepoix, ras-el-hanout…) et parfois d'une
**mère de substitution** (le coq au vin, c'est le bourguignon avec du coq). Chaque lien porte sa
**mutation** (« + crème », « coq au lieu du bœuf ») ; les plats qui partagent un profil ou une
mère sont **cousins**, avec leur drapeau.

Site statique Astro, publié sur <https://mathieu6700417.github.io/recettes/>.
Format du contenu (le contrat) : [CONTENU-v2.md](CONTENU-v2.md).

## En local

Node ≥ 22.

```sh
npm install
npm run dev        # http://localhost:4321/recettes/
npm run build      # génère dist/
npm run preview    # sert dist/ sur http://localhost:4321/recettes/
```

Pour travailler avec le jeu de test plutôt que le vrai contenu :
`npm run dev:fixtures` ou `npm run build:fixtures` (lit `tests/fixtures/v2/valide/`).
La variable `CONTENU_DIR` permet de pointer vers n'importe quel dossier de contenu (chaque
dossier a son propre cache Astro, voir `astro.config.mjs`).

```sh
npm test           # vérificateur, quantités, « cuisiner avec ce que j'ai » (node:test)
```

## Ajouter une recette

Tout est décrit dans [CONTENU-v2.md](CONTENU-v2.md) ; les listes fermées (techniques, bases,
plats, profils, familles) ne s'étendent pas sans décision.

1. **La préparation** : `src/content/preparations/<slug>.md` — titre, origine, nature (`plat`
   ou `base`), résumé, et ses liens déclarés côté enfant : `cuisson`, `composants` (avec
   `role`), `substitution` (mère + `echanges`), `profils`, chacun avec sa `mutation` (≤ 60
   caractères). Corps : `## Principe`, éventuellement `## Proportions de base`, `## Gestes clés`.
2. **Sa version de référence** : `src/content/versions/<slug>--classique.md` avec
   `reference: true`, portions, temps, difficulté, ingrédients chiffrés (slugs du référentiel,
   ou une base via `preparation:`) et étapes. Une autre version (`<slug>--maison.md`…) prend
   `reference: false` et décrit ses `ecarts`. Le `statut` (`a-relire`, `relu-agent`,
   `relu-mathieu`) alimente la page « À relire ».
3. **Les ingrédients manquants** vont dans le référentiel `src/content/ingredients/<famille>.yaml`
   (`nom`, `pluriel`, `parent`, `synonymes`, `techniques`, `substituts`, `placard`, `elision`,
   `masse`) : c'est lui qui accorde l'affichage (« 2 gousses d'ail », « 1 kg de dinde »).
4. `npm run verifier` jusqu'à zéro erreur, puis contrôle du rendu avec `npm run dev`.

Le site calcule seul le sens inverse des liens (descendants, cousins, « utilisé dans »).

## Structure

```
CONTENU-v2.md                 contrat du format de contenu
scripts/verifier.mjs          vérificateur (npm run verifier)
scripts/lib/reseau.mjs        chargement du contenu en graphe typé (vérificateur ET site)
scripts/lib/valider.mjs       règles de validation ; listes.mjs : listes fermées
src/content.config.ts         collections Astro (schémas, rendu Markdown des corps)
src/lib/site.ts               le réseau vu par le site : adresses, titres, lentilles de
                              l'arbre, voisinages, cousins (build uniquement)
src/lib/quantites.ts          affichage et mise à l'échelle des quantités (build + navigateur)
src/lib/cuisiner.ts           classement « cuisiner avec ce que j'ai » (build + navigateur)
src/lib/graphe-local.ts       mise en page du petit graphe SVG de chaque fiche
src/lib/format.ts             drapeaux, durées, normalisation
src/components/               Arbre + NoeudArbre (barre latérale à 4 lentilles), Recherche,
                              Versions (onglets, portions, mode cuisine, impression),
                              GrapheLocal, Ref, SousIngredients
src/pages/                    accueil, techniques/, preparations/, profils/, ingredients/
                              (ingrédients et familles), cuisiner/, a-relire/, 404,
                              recherche.json et cuisiner.json (générés au build)
tests/                        tests node:test et jeux de test (tests/fixtures/v2)
```

## Vérifier le contenu

```sh
npm run verifier                              # vérifie src/content
node scripts/verifier.mjs tests/fixtures/v2/valide
```

Contrôle strict, sans lancer Astro : champs requis, énumérations, unités, slugs référencés et
du bon type, slugs uniques sur le réseau, listes fermées, cycles, une seule version de
référence par préparation, mutations ≤ 60 caractères. Code de sortie 1 en cas d'erreur
(détail dans CONTENU-v2.md, section « Validation »).

## Déploiement

À chaque push sur `main` (ou à la main via « Run workflow »), `.github/workflows/deploy.yml`
vérifie le contenu, construit le site et le publie sur GitHub Pages.
Dans les réglages du dépôt : *Settings → Pages → Source : GitHub Actions*.
L'adresse de base (`/recettes`) est réglée dans `astro.config.mjs`.
