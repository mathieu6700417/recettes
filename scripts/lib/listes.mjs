// Listes fermées et énumérations du format v2 (CONTENU-v2.md). Aucune dépendance.

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const PAYS = /^[A-Z]{2}$/;

export const NATURES = ['plat', 'base'];
export const ROLES = ['structure', 'sauce', 'liaison', 'garniture', 'finition', 'accompagnement', 'aromatique'];
export const STATUTS = ['a-relire', 'relu-agent', 'relu-mathieu'];
export const DIFFICULTES = ['facile', 'moyen', 'difficile'];
export const UNITES = [
  'g', 'kg', 'ml', 'cl', 'l', 'c. à soupe', 'c. à café', 'pincée', 'gousse',
  'branche', 'botte', 'feuille', 'tranche', '',
];

export const MUTATION_MAX = 60; // erreur au-delà
export const MUTATION_AVERT = 50; // avertissement au-delà
export const MERES_MAX = 2;

const t = (parent, titre) => ({ parent, titre });

/** Techniques : slug → { parent (null si racine), titre } */
export const TECHNIQUES = {
  'chaleur-humide': t(null, 'Chaleur humide'),
  pocher: t('chaleur-humide', 'Pocher'),
  mijoter: t('chaleur-humide', 'Mijoter'),
  'cuisson-au-blanc': t('mijoter', 'Cuisson au blanc'),
  braiser: t('chaleur-humide', 'Braiser'),
  ragout: t('braiser', 'Ragoût'),
  'cuire-a-la-vapeur': t('chaleur-humide', 'Cuire à la vapeur'),
  'chaleur-seche': t(null, 'Chaleur sèche'),
  'cuire-au-four': t('chaleur-seche', 'Cuire au four'),
  'cuire-au-bain-marie': t('cuire-au-four', 'Cuire au bain-marie'),
  rotir: t('cuire-au-four', 'Rôtir'),
  gratiner: t('cuire-au-four', 'Gratiner'),
  griller: t('chaleur-seche', 'Griller'),
  frire: t('chaleur-seche', 'Frire'),
  'sur-le-feu': t(null, 'Sur le feu'),
  sauter: t('sur-le-feu', 'Sauter'),
  poeler: t('sur-le-feu', 'Poêler'),
  'cuire-en-remuant': t('sur-le-feu', 'Cuire en remuant'),
  'cuire-a-la-nappe': t('cuire-en-remuant', 'Cuire à la nappe'),
  'epaissir-a-l-amidon': t('cuire-en-remuant', "Épaissir à l'amidon"),
  dessecher: t('sur-le-feu', 'Dessécher'),
  confire: t('sur-le-feu', 'Confire'),
  'sans-chaleur': t(null, 'Sans chaleur'),
  cru: t('sans-chaleur', 'Cru'),
  'monter-une-emulsion': t('cru', 'Monter une émulsion'),
  'cuisson-chimique': t('sans-chaleur', 'Cuisson chimique'),
  'mariner-a-l-acide': t('cuisson-chimique', "Mariner à l'acide"),
  'saler-sucrer': t('cuisson-chimique', 'Saler ou sucrer'),
  fermenter: t('cuisson-chimique', 'Fermenter'),
};

const b = (titre, origine = 'FR') => ({ titre, origine });

/** Préparations de base : slug → { titre, origine } */
export const BASES = {
  'fond-blanc': b('Fond blanc'),
  'fond-brun': b('Fond brun'),
  roux: b('Roux'),
  veloute: b('Velouté'),
  singer: b('Singer'),
  'marinade-au-vin': b('Marinade au vin'),
  'liaison-creme-jaune': b('Liaison crème et jaune'),
  'liaison-au-sang': b('Liaison au sang'),
  'pate-a-choux': b('Pâte à choux'),
  'pate-brisee': b('Pâte brisée'),
  'pate-sucree': b('Pâte sucrée'),
  'pate-feuilletee': b('Pâte feuilletée'),
  'creme-anglaise': b('Crème anglaise'),
  'creme-patissiere': b('Crème pâtissière'),
  'creme-prise': b('Appareil à crème prise'),
  'creme-au-citron': b('Crème au citron'),
  meringue: b('Meringue'),
  caramel: b('Caramel'),
  mayonnaise: b('Mayonnaise'),
  aioli: b('Aïoli'),
  remoulade: b('Sauce rémoulade'),
  'sauce-tartare': b('Sauce tartare'),
  hollandaise: b('Sauce hollandaise'),
  bearnaise: b('Sauce béarnaise'),
  mousseline: b('Sauce mousseline'),
  vinaigrette: b('Vinaigrette'),
  // Ajoutées avec les recettes de légumes (potimarron, oignon, patate douce)
  'fond-de-legumes': b('Fond de légumes'),
  bechamel: b('Sauce béchamel'),
  'compotee-d-oignons': b("Compotée d'oignons"),
  'pate-a-pain': b('Pâte à pain'),
};

/** Plats : slug → { origine } (titre libre) */
export const PLATS = Object.fromEntries(Object.entries({
  // Migrés de la v1
  'bigne-di-san-giuseppe': 'IT', 'blanquette-de-veau': 'FR', 'boeuf-bourguignon': 'FR',
  'carbonade-flamande': 'BE', chouquettes: 'FR', churros: 'ES', 'civet-de-lievre': 'FR',
  'coq-au-vin': 'FR', 'crema-catalana': 'ES', 'creme-brulee': 'FR', 'creme-caramel': 'FR',
  'daube-provencale': 'FR', 'eclairs-au-chocolat': 'FR', 'flan-patissier': 'FR', gougeres: 'FR',
  goulasch: 'HU', 'ile-flottante': 'FR', 'irish-stew': 'IE', 'joue-de-boeuf-braisee': 'FR',
  'navarin-d-agneau': 'FR', 'osso-buco': 'IT', 'pasteis-de-nata': 'PT', 'pets-de-nonne': 'FR',
  'pot-au-feu': 'FR', 'poule-au-pot': 'FR', profiteroles: 'FR', 'quiche-lorraine': 'FR',
  'tajine-d-agneau-aux-pruneaux': 'MA', 'tarte-au-citron-meringuee': 'FR', 'tarte-aux-pommes': 'FR',
  'veau-marengo': 'FR', 'waterzooi-de-poulet': 'BE',
  // Ajoutés en v2
  'tartare-de-boeuf': 'FR', carpaccio: 'IT', ceviche: 'PE', gravlax: 'SE', 'salade-nicoise': 'FR',
  'tajine-de-poulet-aux-citrons-confits': 'MA', 'curry-d-agneau': 'IN', 'mole-poblano': 'MX',
  ratatouille: 'FR', piperade: 'FR', 'chili-con-carne': 'US', 'risotto-alla-milanese': 'IT',
  'riz-pilaf': 'FR', 'steak-au-poivre': 'FR', 'mille-feuille': 'FR', 'vol-au-vent': 'FR',
  'oeufs-mimosa': 'FR', 'celeri-remoulade': 'FR', 'oeufs-benedicte': 'US',
  // Recettes de légumes : potimarron, oignon, patate douce
  'veloute-de-potimarron': 'FR', 'potimarron-roti': 'FR', 'gratin-de-potimarron': 'FR',
  'risotto-au-potimarron': 'IT', 'soupe-a-l-oignon': 'FR', 'tarte-a-l-oignon': 'FR',
  pissaladiere: 'FR', 'bhaji-a-l-oignon': 'IN', 'puree-de-patate-douce': 'FR',
  'frites-de-patate-douce': 'US', 'curry-de-patate-douce': 'IN', 'chili-sin-carne': 'US',
}).map(([slug, origine]) => [slug, { origine }]));

const p = (parent, origine, titre) => ({ parent, origine, titre });

/** Profils aromatiques : slug → { parent, origine (null = sans pays), titre } */
export const PROFILS = {
  'bouquet-garni': p(null, 'FR', 'Bouquet garni'),
  mirepoix: p(null, 'FR', 'Mirepoix'),
  sofrito: p('mirepoix', 'ES', 'Sofrito'),
  soffritto: p('sofrito', 'IT', 'Soffritto'),
  basquaise: p('sofrito', 'FR', 'Basquaise'),
  'a-la-bourguignonne': p(null, 'FR', 'À la bourguignonne'),
  'a-la-flamande': p(null, 'BE', 'À la flamande'),
  provencale: p(null, 'FR', 'Provençale'),
  gremolata: p(null, 'IT', 'Gremolata'),
  'ras-el-hanout': p(null, 'MA', 'Ras-el-hanout'),
  'garam-masala': p(null, 'IN', 'Garam masala'),
  'chiles-mexicains': p(null, 'MX', 'Piments séchés mexicains'),
  'tex-mex': p('chiles-mexicains', 'US', 'Tex-mex'),
  'paprika-hongrois': p(null, 'HU', 'Paprika hongrois'),
  vanille: p(null, null, 'Vanille'),
  'citron-cannelle': p(null, 'ES', 'Citron et cannelle'),
};

/** Familles d'ingrédients (noms des fichiers du référentiel) */
export const FAMILLES = [
  'boeuf', 'veau', 'agneau', 'porc', 'volaille', 'gibier', 'poissons', 'oeufs', 'laitiers',
  'matieres-grasses', 'legumes', 'aromates', 'herbes', 'epices', 'fruits', 'fruits-secs',
  'feculents', 'sucres', 'alcools', 'liquides', 'condiments',
];

// ---------- Régime (dérivé, sans champ) : voir CONTENU-v2.md, « Régime » ----------

/** Familles dont tout ingrédient est carné (viandes, volailles, gibier, poissons et fruits de mer). */
export const FAMILLES_CARNEES = ['boeuf', 'veau', 'agneau', 'porc', 'volaille', 'gibier', 'poissons'];

/**
 * Ingrédients carnés rangés dans une autre famille. Liste explicite, sans héritage : un enfant
 * d'un de ces ingrédients n'est pas carné pour autant (bouillon-de-legumes est fils de bouillon).
 * `bouillon` et `cube-de-bouillon` génériques sont tenus pour carnés par prudence : sans précision,
 * un bouillon est le plus souvent de viande ou de volaille.
 */
export const INGREDIENTS_CARNES = [
  'bouillon', 'bouillon-de-boeuf', 'bouillon-de-volaille', 'fumet-de-poisson',
  'cube-de-bouillon', 'cube-de-bouillon-de-boeuf', 'cube-de-bouillon-de-volaille',
  'fond-de-veau-deshydrate',
  'saindoux', 'graisse-de-canard',
  'sauce-worcestershire', // contient des anchois
];

/** Mois de l'année, pour l'affichage des saisons (index 0 = janvier). */
export const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
