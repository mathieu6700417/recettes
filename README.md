# Généalogie des recettes

Les recettes rangées par **technique**, comme un arbre généalogique. Chaque recette a deux
ascendances : un **mode de cuisson** (Chaleur humide → Mijoter → Cuisson au blanc…) et une ou
plusieurs **préparations de base** (Fonds → Fond blanc → Velouté…). Chaque lien porte sa
**mutation** (« + crème », « fond blanc → fond brun »), et les recettes étrangères se branchent
sur la même technique, avec leur drapeau.

Site statique Astro, publié sur <https://mathieu6700417.github.io/recettes/>.
Vision complète : [SPEC.md](SPEC.md).

## En local

Node ≥ 22.

```sh
npm install
npm run dev        # http://localhost:4321/recettes/
npm run build      # génère dist/
npm run preview    # sert dist/ sur http://localhost:4321/recettes/
```

Pour travailler avec le jeu de test plutôt que le vrai contenu :
`npm run dev:fixtures` ou `npm run build:fixtures` (lit `tests/fixtures/content/`).
La variable `CONTENU_DIR` permet de pointer vers n'importe quel dossier de contenu.

## Ajouter une recette

1. Créer `src/content/recettes/<slug>.md` en suivant **exactement** le format décrit dans
   [CONTENU.md](CONTENU.md) (en-tête YAML : origine, portions, technique de cuisson, bases,
   éventuelle `variante_de`, ingrédients quantifiés, étapes).
2. Lancer `npm run verifier`, corriger jusqu'à zéro erreur.
3. Vérifier le rendu avec `npm run dev`.

Les techniques sont une liste fermée (voir CONTENU.md) : ne pas en inventer.

## Vérifier le contenu

```sh
npm run verifier                              # vérifie src/content
node scripts/verifier.mjs tests/fixtures/content
```

Contrôle strict, sans lancer Astro : champs requis, énumérations, unités, slugs référencés,
parent dans le même axe, cycles, liste fermée des techniques, longueur des mutations (≤ 80).
Code de sortie 1 en cas d'erreur.

## Déploiement

À chaque push sur `main` (ou à la main via « Run workflow »), `.github/workflows/deploy.yml`
vérifie le contenu, construit le site et le publie sur GitHub Pages.
Dans les réglages du dépôt : *Settings → Pages → Source : GitHub Actions*.
L'adresse de base (`/recettes`) est réglée dans `astro.config.mjs`.
