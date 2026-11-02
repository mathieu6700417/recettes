# Format du contenu

Tout le contenu vit dans `src/content/` en Markdown avec un en-tête YAML :

- `src/content/techniques/<slug>.md` : une technique (nœud de l'arbre) ;
- `src/content/recettes/<slug>.md` : une recette (feuille de l'arbre).

Le slug est le nom du fichier, en minuscules, sans accents, mots séparés par `-`.
Tous les textes sont en français correct, avec accents.

## Les deux axes

- **cuisson** : comment la chaleur est appliquée (mijoter, braiser, cuire au four…).
- **base** : la préparation de base dont la recette descend (fond, roux, pâte à choux…).

Chaque axe est un arbre de techniques. Une technique a **un seul parent** (ou aucun si c'est une
racine) dans son axe. Une recette est rattachée à **une technique de cuisson** et à **une ou
plusieurs bases** ; la première base est sa base principale (c'est sous elle qu'elle apparaît
dans l'arbre « base », les autres sont affichées en liens).

Chaque lien porte une **mutation** : ce qui change par rapport au parent, court et concret,
façon « + crème », « fond blanc → fond brun », « + jaunes, citron », « sans œufs, frite ».
Maximum ~60 caractères.

## Technique

```yaml
---
titre: Braiser
axe: cuisson            # cuisson | base
parent: chaleur-humide  # slug d'une technique du même axe, ou absent si racine
mutation: "+ saisir d'abord, mouiller à mi-hauteur, couvrir"   # absent si racine
resume: "Cuisson longue, couverte, dans peu de liquide, après avoir saisi."  # une phrase
ordre: 2                # tri entre sœurs (optionnel)
---

## Principe
…
## Proportions de base
… (ratios chiffrés quand ça a du sens, sinon omettre la section)
## Gestes clés
- …
## Erreurs fréquentes
- …
## Ce qui varie entre les descendantes
- …
```

## Recette

```yaml
---
titre: Blanquette de veau
origine: FR                 # code pays ISO 3166-1 alpha-2 (FR, IT, BE, ES, PT, MA, GB…)
portions: 4
preparation: 30             # minutes
cuisson: 120                # minutes
difficulte: facile          # facile | moyen | difficile
cuisson_technique:
  slug: cuisson-au-blanc
  mutation: "veau en morceaux, garniture champignons et petits oignons"
bases:
  - slug: veloute
    mutation: "velouté fait avec le bouillon de cuisson"
  - slug: liaison-creme-jaune
    mutation: "liée au dernier moment, sans bouillir"
variante_de:                # optionnel : si la recette descend d'une AUTRE RECETTE
  slug: blanquette-de-veau
  mutation: "viande dorée et singée, cubes de bouillon"
source: "D'après marmiton.org — recette de lilia1"   # optionnel
ingredients:
  - { qte: 1.2, unite: kg, nom: "épaule et tendron de veau, en morceaux" }
  - { qte: 2, unite: "", nom: "carottes" }
  - { qte: null, unite: "", nom: "sel, poivre" }
  - { qte: 30, unite: g, nom: "beurre", groupe: "Sauce" }
etapes:
  - "Mettre la viande dans une cocotte, couvrir d'eau froide, porter à ébullition et écumer."
  - "…"
---

Notes libres (optionnel) : histoire, conseils, variantes. Pas de titre H1.
```

Règles des ingrédients :
- `qte` : nombre (décimales avec un point) ou `null` si non quantifiable (« sel, poivre »).
  C'est ce nombre qui est recalculé quand on change les portions.
- `unite` : une de `g`, `kg`, `ml`, `cl`, `l`, `c. à soupe`, `c. à café`, `pincée`, `gousse`,
  `branche`, `botte`, `feuille`, `tranche`, ou `""` pour une pièce (« 2 carottes »).
- `groupe` : optionnel, pour regrouper (« Pâte », « Garniture », « Sauce »).
- `nom` : en minuscules, sans la quantité.

Si une recette a `variante_de`, elle s'affiche dans l'arbre sous la recette mère (dans les deux
axes) plutôt que directement sous sa technique ; ses `cuisson_technique` et `bases` restent
renseignées.

## Liste fermée des techniques du prototype

Ne pas inventer d'autres slugs. Racines en gras.

### Axe cuisson
| slug | parent | titre |
|---|---|---|
| **chaleur-humide** | — | Chaleur humide |
| pocher | chaleur-humide | Pocher |
| mijoter | chaleur-humide | Mijoter |
| cuisson-au-blanc | mijoter | Cuisson au blanc |
| braiser | chaleur-humide | Braiser |
| ragout | braiser | Ragoût |
| **chaleur-seche** | — | Chaleur sèche |
| cuire-au-four | chaleur-seche | Cuire au four |
| cuire-au-bain-marie | cuire-au-four | Cuire au bain-marie |
| frire | chaleur-seche | Frire |

### Axe base
| slug | parent | titre |
|---|---|---|
| **fond** | — | Fonds |
| fond-blanc | fond | Fond blanc |
| fond-brun | fond | Fond brun |
| veloute | fond-blanc | Velouté |
| **roux** | — | Roux et farine |
| singer | roux | Singer |
| **marinade** | — | Marinade au vin |
| **liaison** | — | Liaisons de fin de cuisson |
| liaison-creme-jaune | liaison | Liaison crème et jaune |
| liaison-au-sang | liaison | Liaison au sang |
| **pate-a-choux** | — | Pâte à choux |
| **pate-a-foncer** | — | Pâtes à foncer |
| pate-brisee | pate-a-foncer | Pâte brisée |
| pate-sucree | pate-a-foncer | Pâte sucrée |
| **creme-aux-oeufs** | — | Crèmes aux œufs |
| creme-anglaise | creme-aux-oeufs | Crème anglaise |
| creme-patissiere | creme-aux-oeufs | Crème pâtissière |
| creme-prise | creme-aux-oeufs | Crème prise |
| **meringue** | — | Meringue |
