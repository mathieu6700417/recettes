# Format du contenu — v2 (réseau à liens typés)

Spec de référence : Claude Doc « Généalogie des recettes — Spécification v2 »
(https://claude.ai/artifact/S9u1sHH65XtGpequVMhJzt). Ce fichier est le **contrat** : le
vérificateur (`scripts/verifier.mjs`), les schémas Astro (`src/content.config.ts`) et tous les
rédacteurs s'y conforment. En cas de doute, ce fichier l'emporte sur la spec.

Tous les textes sont en français correct, avec accents. Un **slug** est en minuscules, sans
accents, mots séparés par `-` (regex `^[a-z0-9]+(-[a-z0-9]+)*$`), et est le nom du fichier.
Les slugs sont **uniques sur tout le réseau** (une technique, une préparation, un profil, une
famille et un ingrédient ne peuvent pas partager un slug).

## Points ouverts tranchés

1. Une préparation peut avoir **0, 1 ou 2 mères de substitution** (plat hybride : 2 maximum).
2. Les profils aromatiques ont une **composition sans quantités** en v2.
3. Les listes fermées ci-dessous (techniques, bases, plats, profils, familles) sont définitives
   pour la v2. **Ne pas inventer d'autres slugs** ; un besoin manquant se signale, il ne s'improvise pas.

## Dossiers

| Dossier | Contenu | Clé |
|---|---|---|
| `src/content/techniques/<slug>.md` | une technique (geste de cuisson) | slug |
| `src/content/preparations/<slug>.md` | une préparation (plat ou base) et ses liens | slug |
| `src/content/versions/<preparation>--<version>.md` | une version chiffrée | `<preparation>--<version>` |
| `src/content/profils/<slug>.md` | un profil aromatique | slug |
| `src/content/ingredients/<famille>.yaml` | le référentiel, un fichier par famille | slug d'ingrédient |

Les liens sont **déclarés côté enfant** ; le site calcule le sens inverse (descendants, cousins).

## Mutation

Chaque lien porte une `mutation` : ce qui change par rapport au parent, court et concret
(« + crème », « fond blanc → fond brun », « coq au lieu du bœuf »). **60 caractères maximum**
(erreur au-delà). Exception : la mutation d'un lien `profils` est facultative (profil appliqué tel quel).

## Technique

Un geste de cuisson pur, sans recette chiffrée. Les techniques forment **un seul arbre** (la
lentille « cuisson ») à quatre racines.

```yaml
---
titre: Braiser
parent: chaleur-humide      # slug d'une technique, absent si racine
mutation: "+ saisir d'abord, mouiller à mi-hauteur, couvrir"   # absent si racine
resume: "Cuisson longue et couverte dans peu de liquide, après avoir saisi."
ordre: 3                    # tri entre sœurs (optionnel)
---

## Principe
## Proportions de base      (optionnel)
## Gestes clés
## Erreurs fréquentes
## Ce qui varie entre les descendantes
```

## Préparation

Tout ce qui a une recette : un **plat** final ou une **base** réutilisée par d'autres.

```yaml
---
titre: Coq au vin
origine: FR                 # ISO 3166-1 alpha-2
nature: plat                # plat | base
resume: "Volaille mijotée au vin rouge, garniture bourguignonne."   # une phrase
cuisson:                    # liste ordonnée : la 1re est la cuisson principale
  - { slug: ragout, mutation: "coq découpé, mijoté dans le vin" }
composants:                 # 0 à n, ordonnés : le 1er est le composant principal
  - { slug: marinade-au-vin, role: aromatique, mutation: "vin rouge de Bourgogne" }
  - { slug: liaison-au-sang, role: liaison, mutation: "sang du coq, version ancienne" }
substitution:               # 0 à 2 mères ; liste
  - mere: boeuf-bourguignon
    mutation: "coq au lieu du bœuf"
    echanges: [ { de: boeuf-a-braiser, vers: coq } ]
profils:                    # 0 à n
  - { slug: a-la-bourguignonne }
  - { slug: bouquet-garni, mutation: "sans lardons" }
histoire: null              # ou { texte: "…", source: "…" } — seulement si sourcé
ordre: 1                    # optionnel
---

## Principe
(ce qui définit la préparation, ce qui la distingue de ses parents et sœurs)
## Proportions de base      (optionnel : ratios chiffrés)
## Gestes clés              (optionnel)
```

Règles :
- `cuisson` : **obligatoire (≥ 1) pour un plat**, facultative pour une base. Slugs de techniques.
- `composants[].slug` : une préparation de **nature base**. `role` dans la liste fermée :
  `structure` (pâte, fond de tarte, fond de mouillement), `sauce`, `liaison`, `garniture`
  (crème à l'intérieur), `finition` (glaçage, nappage, meringue), `accompagnement`,
  `aromatique` (marinade).
- `substitution[].mere` : une préparation (plat ou base). `echanges` : **au moins un** échange
  `{ de, vers }` ; `de` et `vers` sont des slugs d'ingrédients ou de familles du référentiel.
- `profils[].slug` : un profil.
- `histoire` : `null` ou objet `{ texte, source }`, les deux non vides. Aucune date inventée.
- Une préparation a **exactement une version de référence** (voir Version).
- Pas de cycle dans le graphe des composants, ni dans celui des substitutions.

## Version

Une recette concrète d'une préparation. Fichier `versions/<preparation>--<version>.md`.
Par convention, la version de référence s'appelle `<preparation>--classique`.

```yaml
---
preparation: blanquette-de-veau
titre: Version maison de Mathieu
reference: false            # true pour exactement une version par préparation
ecarts: "viande dorée et singée, cubes de bouillon, vin blanc"   # requis si reference: false, interdit sinon
statut: relu-mathieu        # a-relire | relu-agent | relu-mathieu
portions: 4
temps: { preparation: 15, cuisson: 120 }   # minutes ; repos: optionnel
difficulte: facile          # facile | moyen | difficile
source: "D'après marmiton.org — recette de lilia1"   # optionnel
ingredients:
  - { ingredient: veau-a-blanquette, qte: 1, unite: kg, precision: "en morceaux" }
  - { ingredient: oignon, qte: 1, unite: "" }
  - { preparation: pate-feuilletee, qte: 500, unite: g }      # une base peut servir d'ingrédient
  - { ingredient: sel, qte: null, unite: "" }
  - { ingredient: beurre, qte: 40, unite: g, groupe: "Sauce" }
etapes:
  - "Mettre la viande dans une cocotte…"
---

Notes libres (optionnel). Pas de titre H1.
```

Règles des ingrédients d'une version :
- exactement une des clés `ingredient` (slug du référentiel, pas une famille) ou `preparation`
  (slug d'une préparation de nature base) ;
- `qte` : nombre > 0 (point décimal) ou `null` (non quantifiable) ; c'est lui qui est recalculé
  avec les portions ;
- `unite` : `g`, `kg`, `ml`, `cl`, `l`, `c. à soupe`, `c. à café`, `pincée`, `gousse`, `branche`,
  `botte`, `feuille`, `tranche`, ou `""` (à la pièce) ;
- `precision` (optionnel) : complément libre en minuscules (« en morceaux de 5 cm », « facultatif ») ;
- `groupe` (optionnel) : regroupement (« Pâte », « Garniture », « Sauce »).

Le lien « utilise » (version → ingrédient) est dérivé de cette liste.

## Profil aromatique

```yaml
---
titre: À la bourguignonne
parent: null                # slug d'un profil, ou absent si racine
mutation: null              # requis si parent
origine: FR                 # ISO 3166-1 alpha-2, optionnel (profil sans pays : absent)
resume: "Vin rouge, lardons, petits oignons et champignons."
composition:                # sans quantités ; ≥ 1
  - { ingredient: vin-rouge }
  - { ingredient: lardons, precision: "fumés" }
---

## Composition et usage
## Origine
(texte libre ; date ou anecdote seulement si sourcée)
```

## Référentiel des ingrédients

Un fichier YAML par famille : `src/content/ingredients/<famille>.yaml`. La famille est
elle-même un nœud (slug = nom du fichier), racine de son arbre.

```yaml
titre: Bœuf
ingredients:
  - slug: boeuf-a-braiser
    nom: bœuf à braiser
    synonymes: ["bœuf à bourguignon", "bœuf à ragoût"]   # optionnel, pour la recherche
    techniques: [braiser, ragout]                          # optionnel : s'accorde avec
  - slug: joue-de-boeuf
    parent: boeuf-a-braiser     # slug d'un ingrédient ; absent = enfant direct de la famille
    nom: joue de bœuf
    pluriel: joues de bœuf
  - slug: sel
    nom: sel
    placard: true
  - slug: huile-d-olive
    nom: huile d'olive
    elision: true               # « d'huile » (h muet) ; défaut : élision si voyelle initiale
```

Champs : `slug`, `nom` (singulier) obligatoires ; `pluriel`, `parent`, `synonymes`,
`techniques`, `substituts` (slugs d'ingrédients), `placard` (booléen), `elision` (booléen),
`masse` (`singulier` : pour un ingrédient comptable qui reste au singulier après une unité de
poids ou de volume — « 1 kg de dinde », « 150 g de yaourt », « 600 g de poisson blanc ») optionnels.

`saison` (optionnel) : liste des mois de pleine saison en France métropolitaine, entiers de 1 à 12,
sans doublon (`saison: [9, 10, 11, 12, 1]`). Réservé aux produits frais (légumes, fruits, herbes,
aromates frais). Un enfant sans `saison` hérite de celle de son parent. Le site en tire « de saison
ce mois-ci » : une version est de saison si au moins un de ses ingrédients non placard (y compris ceux des
bases qu'elle utilise : versions de référence, récursivement) porte une
saison contenant le mois courant, et qu'aucun de ses ingrédients saisonniers n'est hors saison.

## Régime (dérivé, sans champ)

Une version est **végétarienne** si aucun de ses ingrédients, ni ceux des versions de référence des
bases qu'elle utilise (récursivement), n'appartient aux familles `boeuf`, `veau`, `agneau`, `porc`,
`volaille`, `gibier`, `poissons`, ni n'est un ingrédient carné d'une autre famille (bouillons et
fonds de viande ou de volaille, cubes correspondants, fond de veau déshydraté, fumet de poisson,
sang, saindoux, graisse de canard, anchois…). Une préparation est végétarienne si sa version de
référence l'est. Le site l'affiche et permet de filtrer ; aucun champ n'est à saisir.

Affichage d'une quantité :
- sans unité : `qte < 2` → `nom`, sinon `pluriel` s'il existe (« 1 oignon », « 2 oignons ») ;
- avec unité : `<qte> <unité accordée> de|d' <pluriel s'il existe et si masse ≠ singulier, sinon nom>`
  (« 250 g de champignons de Paris », « 1 kg de veau », « 2 gousses d'ail ») ; les unités
  `gousse`, `branche`, `botte`, `feuille`, `tranche`, `pincée` prennent un « s » à partir de 2 ;
- `qte: null` → `nom` seul, suivi de la précision.

Substituts (pour « cuisiner avec ce que j'ai ») : les **sœurs** (même parent, hors famille racine)
plus la liste `substituts`. **Ingrédients de placard** (`placard: true`) : sel, poivre, huile(s),
beurre, farine, sucre, eau — ignorés dans le calcul de couverture.

## Validation (scripts/verifier.mjs)

Bloquante (code de sortie 1) : en-tête et champs requis, clés inconnues, énumérations (nature,
rôle, statut, difficulté, unité), slugs référencés existants et du bon type, slugs uniques sur
tout le réseau, listes fermées respectées, mutation ≤ 60 caractères, pas de cycle (techniques,
composants, substitutions, profils, ingrédients), exactement une version de référence par
préparation, `ecarts` présent ssi non référence, 0 à 2 mères, `echanges` non vide.
Avertissements : mutation > 50 caractères, préparation de base jamais utilisée, ingrédient du
référentiel jamais utilisé.

## Listes fermées

### Techniques (lentille cuisson) — racines en gras

| slug | parent | titre |
|---|---|---|
| **chaleur-humide** | — | Chaleur humide |
| pocher | chaleur-humide | Pocher |
| mijoter | chaleur-humide | Mijoter |
| cuisson-au-blanc | mijoter | Cuisson au blanc |
| braiser | chaleur-humide | Braiser |
| ragout | braiser | Ragoût |
| cuire-a-la-vapeur | chaleur-humide | Cuire à la vapeur |
| **chaleur-seche** | — | Chaleur sèche |
| cuire-au-four | chaleur-seche | Cuire au four |
| cuire-au-bain-marie | cuire-au-four | Cuire au bain-marie |
| rotir | cuire-au-four | Rôtir |
| gratiner | cuire-au-four | Gratiner |
| griller | chaleur-seche | Griller |
| frire | chaleur-seche | Frire |
| **sur-le-feu** | — | Sur le feu |
| sauter | sur-le-feu | Sauter |
| poeler | sur-le-feu | Poêler |
| cuire-en-remuant | sur-le-feu | Cuire en remuant |
| cuire-a-la-nappe | cuire-en-remuant | Cuire à la nappe |
| epaissir-a-l-amidon | cuire-en-remuant | Épaissir à l'amidon |
| dessecher | sur-le-feu | Dessécher |
| confire | sur-le-feu | Confire |
| **sans-chaleur** | — | Sans chaleur |
| cru | sans-chaleur | Cru |
| monter-une-emulsion | cru | Monter une émulsion |
| cuisson-chimique | sans-chaleur | Cuisson chimique |
| mariner-a-l-acide | cuisson-chimique | Mariner à l'acide |
| saler-sucrer | cuisson-chimique | Saler ou sucrer |
| fermenter | cuisson-chimique | Fermenter |

### Préparations de base (`nature: base`)

| slug | titre | origine |
|---|---|---|
| fond-blanc | Fond blanc | FR |
| fond-brun | Fond brun | FR |
| roux | Roux | FR |
| veloute | Velouté | FR |
| singer | Singer | FR |
| marinade-au-vin | Marinade au vin | FR |
| liaison-creme-jaune | Liaison crème et jaune | FR |
| liaison-au-sang | Liaison au sang | FR |
| pate-a-choux | Pâte à choux | FR |
| pate-brisee | Pâte brisée | FR |
| pate-sucree | Pâte sucrée | FR |
| pate-feuilletee | Pâte feuilletée | FR |
| creme-anglaise | Crème anglaise | FR |
| creme-patissiere | Crème pâtissière | FR |
| creme-prise | Appareil à crème prise | FR |
| creme-au-citron | Crème au citron | FR |
| meringue | Meringue | FR |
| caramel | Caramel | FR |
| mayonnaise | Mayonnaise | FR |
| aioli | Aïoli | FR |
| remoulade | Sauce rémoulade | FR |
| sauce-tartare | Sauce tartare | FR |
| hollandaise | Sauce hollandaise | FR |
| bearnaise | Sauce béarnaise | FR |
| mousseline | Sauce mousseline | FR |
| vinaigrette | Vinaigrette | FR |
| fond-de-legumes | Fond de légumes | FR |
| bechamel | Sauce béchamel | FR |
| compotee-d-oignons | Compotée d'oignons | FR |
| pate-a-pain | Pâte à pain | FR |

Les quatre dernières bases (et les techniques `gratiner` et `confire`) ont été ajoutées avec les
recettes de légumes. `fond-de-legumes` est la base (recette) ; `bouillon-de-legumes` reste
l'ingrédient du commerce.

Les nœuds abstraits de la v1 (`fond`, `liaison`, `creme-aux-oeufs`, `pate-a-foncer`) disparaissent :
une base est une préparation avec une recette.

### Plats (`nature: plat`)

Migrés de la v1 (32 ; la blanquette maison devient une version de `blanquette-de-veau`) :
bigne-di-san-giuseppe (IT), blanquette-de-veau, boeuf-bourguignon, carbonade-flamande (BE),
chouquettes, churros (ES), civet-de-lievre, coq-au-vin, crema-catalana (ES), creme-brulee,
creme-caramel, daube-provencale, eclairs-au-chocolat, flan-patissier, gougeres, goulasch (HU),
ile-flottante, irish-stew (IE), joue-de-boeuf-braisee, navarin-d-agneau, osso-buco (IT),
pasteis-de-nata (PT), pets-de-nonne, pot-au-feu, poule-au-pot, profiteroles, quiche-lorraine,
tajine-d-agneau-aux-pruneaux (MA), tarte-au-citron-meringuee, tarte-aux-pommes, veau-marengo,
waterzooi-de-poulet (BE). (FR sauf mention.)

Ajoutés en v2 (19 plats ; les 8 émulsions sont des bases, listées plus haut) :

| Famille | slug | origine | lien éprouvé |
|---|---|---|---|
| Cru et cuisson chimique | tartare-de-boeuf | FR | cru ; composant sauce |
| | carpaccio | IT | cru ; substitution du tartare |
| | ceviche | PE | mariner-a-l-acide |
| | gravlax | SE | saler-sucrer |
| | salade-nicoise | FR | cru ; composant vinaigrette |
| Profils aromatiques forts | tajine-de-poulet-aux-citrons-confits | MA | profil ras-el-hanout, cousin |
| | curry-d-agneau | IN | profil garam-masala |
| | mole-poblano | MX | profil chiles-mexicains |
| | ratatouille | FR | profil provencale |
| | piperade | FR | profil basquaise |
| | chili-con-carne | US | profil tex-mex, cousin des ragoûts |
| Sur le feu | risotto-alla-milanese | IT | cuire-en-remuant |
| | riz-pilaf | FR | sauter puis braiser |
| | steak-au-poivre | FR | poeler ; sauce au poivre |
| Pâte feuilletée | mille-feuille | FR | composant pâte feuilletée + crème pâtissière |
| | vol-au-vent | FR | composant pâte feuilletée + velouté |
| Émulsions (plats) | oeufs-mimosa | FR | composant mayonnaise |
| | celeri-remoulade | FR | composant rémoulade |
| | oeufs-benedicte | US | composant hollandaise |

Ajoutés avec les recettes de légumes (12 plats) :

| Légume | slug | origine | lien éprouvé |
|---|---|---|---|
| Potimarron | veloute-de-potimarron | FR | mijoter ; composant fond de légumes |
| | potimarron-roti | FR | rotir |
| | gratin-de-potimarron | FR | gratiner ; composant béchamel |
| | risotto-au-potimarron | IT | substitution du risotto alla milanese |
| Oignon | soupe-a-l-oignon | FR | confire puis mijoter ; composants compotée, fond brun |
| | tarte-a-l-oignon | FR | substitution de la quiche lorraine |
| | pissaladiere | FR | composants pâte à pain et compotée ; profil provençale |
| | bhaji-a-l-oignon | IN | frire |
| Patate douce | puree-de-patate-douce | FR | mijoter |
| | frites-de-patate-douce | US | cuire au four (four vif) |
| | curry-de-patate-douce | IN | substitution du curry d'agneau ; garam masala |
| | chili-sin-carne | US | substitution du chili con carne ; tex-mex |

Recettes d'automne et d'hiver, de saison en novembre (20 plats) :

| Thème | slug | origine | lien éprouvé |
|---|---|---|---|
| Chou | potee-auvergnate | FR | mijoter ; substitution du pot-au-feu |
| | choucroute-garnie | FR | braiser ; chou fermenté |
| | perdrix-aux-choux | FR | braiser ; gibier à plume |
| | chou-rouge-aux-pommes | DE | braiser |
| | ribollita | IT | mijoter ; profil soffritto |
| Soupes et poireau | soupe-poireaux-pommes-de-terre | FR | mijoter ; composant fond de légumes |
| | veloute-de-chataignes | FR | mijoter |
| | bortsch | UA | mijoter |
| | poireaux-vinaigrette | FR | pocher ; composant vinaigrette |
| | flamiche-aux-poireaux | FR | substitution de la quiche lorraine |
| Endive, champignons, mer | endives-au-jambon | BE | braiser puis gratiner ; composant béchamel |
| | salade-d-endives-aux-noix | FR | cru ; composant vinaigrette |
| | risotto-aux-champignons | IT | substitution du risotto alla milanese |
| | cepes-a-la-bordelaise | FR | sauter |
| | saint-jacques-a-la-fondue-de-poireaux | FR | poeler ; poireaux confits |
| Desserts | tarte-tatin | FR | substitution de la tarte aux pommes ; composant caramel |
| | poires-belle-helene | FR | pocher ; profil vanille |
| | crumble-aux-pommes | GB | cuire au four |
| | mont-blanc | FR | composant meringue ; crème de marrons |
| | pate-de-coing | FR | confire |

Soupes de moules (3 plats) :

| slug | origine | lien éprouvé |
|---|---|---|
| billy-bi | FR | cuire à la vapeur puis mijoter ; composant liaison crème et jaune |
| zuppa-di-cozze | IT | mijoter ; moules ouvertes dans la sauce tomate |
| chowder-aux-moules | US | mijoter ; lard, pommes de terre et lait |

Restes de moules au curry (4 plats, 2 portions, une quinzaine de moules) :

| slug | origine | lien éprouvé |
|---|---|---|
| veloute-de-moules-au-curry | FR | mijoter ; lait de coco |
| tagliatelles-aux-moules-au-curry | FR | pocher les pâtes, sauter les moules |
| riz-saute-aux-moules-au-curry | FR | sauter ; riz de la veille |
| tartines-gratinees-aux-moules-au-curry | FR | gratiner |

Corrections et reclassements de la migration : `pasteis-de-nata` → pâte feuilletée ;
`crema-catalana` → `epaissir-a-l-amidon` (sur le feu, liée à la fécule) ; `tarte-au-citron-meringuee` → crème au
citron ; `tajine-d-agneau-aux-pruneaux` → aucun composant, profil ras-el-hanout ;
`creme-caramel` → composant caramel.

### Profils aromatiques

| slug | parent | origine | titre |
|---|---|---|---|
| bouquet-garni | — | FR | Bouquet garni |
| mirepoix | — | FR | Mirepoix |
| sofrito | mirepoix | ES | Sofrito |
| soffritto | sofrito | IT | Soffritto |
| basquaise | sofrito | FR | Basquaise |
| a-la-bourguignonne | — | FR | À la bourguignonne |
| a-la-flamande | — | BE | À la flamande |
| provencale | — | FR | Provençale |
| gremolata | — | IT | Gremolata |
| ras-el-hanout | — | MA | Ras-el-hanout |
| garam-masala | — | IN | Garam masala |
| chiles-mexicains | — | MX | Piments séchés mexicains |
| tex-mex | chiles-mexicains | US | Tex-mex |
| paprika-hongrois | — | HU | Paprika hongrois |
| vanille | — | — | Vanille |
| citron-cannelle | — | ES | Citron et cannelle |

### Familles d'ingrédients (fichiers du référentiel)

boeuf, veau, agneau, porc, volaille, gibier, poissons, oeufs, laitiers, matieres-grasses,
legumes, aromates (oignon, ail, échalote…), herbes, epices, fruits, fruits-secs, feculents
(farine, riz, pommes de terre, pain…), sucres (sucre, chocolat, miel…), alcools, liquides
(eau, bouillons), condiments (moutarde, vinaigre, câpres, olives, concentré de tomate…).
Environ 150 ingrédients en tout. Ingrédients de placard : sel, poivre, huile (neutre et d'olive),
beurre, farine, sucre, eau.
