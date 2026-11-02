# Généalogie des recettes — Spécification

## Idée

Aborder les recettes (françaises surtout, mais pas seulement) par leur **technique**, comme
une généalogie : chaque recette descend d'une technique ou d'une préparation de base, et l'on
voit ce qui change d'une génération à l'autre.

## Principes

1. **Deux axes croisés.** Chaque recette est rattachée à :
   - un **mode de cuisson** (pocher, braiser, mijoter, rôtir, sauter, frire, cuire au four…) ;
   - une ou plusieurs **préparations de base** (fond, roux, émulsion, pâte, crème…).
   On peut naviguer par l'un ou l'autre axe.
2. **Mutations explicites.** Chaque lien parent → enfant porte la variation :
   « + crème », « fond blanc → fond brun », « + jaunes d'œuf ». Une recette se lit comme
   « sa mère + une modification ».
3. **Cuisines cousines.** Les recettes étrangères se branchent dans le même arbre, sur la même
   technique, avec un drapeau d'origine (ex. Braiser → 🇫🇷 bourguignon, 🇧🇪 carbonade, 🇮🇹 osso buco).

## Contenu

- **Fiche technique** (nœud de l'arbre) : principe, proportions de base, gestes clés, erreurs
  fréquentes, ce qui varie entre les descendantes, liste des descendantes.
- **Fiche recette** : en-tête (personnes, temps, difficulté, origine), ingrédients, étapes,
  rattachements (mode de cuisson, bases, parent + mutation).
- **Source** : premier corpus rédigé par Claude et relu par Mathieu, puis les recettes de
  Mathieu ajoutées au fil de l'eau (il fournit texte, photo, lien ou PDF ; Claude rédige,
  rattache et republie).
- **Format** : un fichier Markdown par recette et par technique, avec un en-tête structuré
  (parent, mutation, mode de cuisson, bases, origine, portions, ingrédients quantifiés).

## Prototype (v1)

- Environ **30 recettes** et 15 techniques.
- Familles creusées : **Braiser & mijoter** et **Pâtes de base** (choux, brisée, crème
  pâtissière, crème anglaise…).
- La blanquette de veau existante est intégrée (mijoter / cuisson au blanc).

## Interface

- **Site web statique**, publié en ligne (GitHub Pages ou Vercel), lisible sur téléphone.
- **Arbre dépliable** à gauche (style explorateur, mutations affichées sur chaque branche),
  fiche sélectionnée à droite ; sur mobile, l'arbre et la fiche s'empilent.
- Bascule entre les deux axes (mode de cuisson / préparations de base).

## Fonctionnalités des fiches recettes

- **Impression A4** sobre, dans le style de `blanquette-de-veau.html`.
- **Ajustement des portions** avec recalcul des quantités.
- **Mode cuisine** : gros texte, écran maintenu allumé (Wake Lock), étapes cochables.
- **Recherche par ingrédient** (« jarret de veau » → recettes et techniques).

## Hors périmètre v1

- Formulaire d'ajout en ligne, comptes utilisateurs, back-end.
- Livre PDF complet.
- Vue graphe dessinée (envisageable plus tard).
