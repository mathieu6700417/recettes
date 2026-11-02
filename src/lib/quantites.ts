// Affichage et mise à l'échelle des quantités d'une ligne d'ingrédient (CONTENU-v2.md,
// « Affichage d'une quantité »). Fonctions pures, partagées entre le build et le navigateur.

/** Ce qu'il faut savoir d'une ligne pour l'afficher. */
export interface LigneQuantite {
  qte: number | null;
  unite: string;
  /** nom au singulier (« oignon », « huile d'olive ») */
  nom: string;
  /** nom au pluriel s'il existe (« oignons ») */
  pluriel?: string;
  /** élision forcée (true : « d' », false : « de ») ; défaut : selon la voyelle initiale */
  elision?: boolean;
  /** 'singulier' : nom de masse, jamais au pluriel avec une unité (« 1 kg de dinde ») */
  masse?: 'singulier' | string;
}

/** Résultat découpé : la quantité (mise en gras), la liaison et le nom accordé. */
export interface PartiesLigne {
  /** « 250 g », « 2 gousses », « 1 » ; vide si qte null */
  quantite: string;
  /** « de », « d' » (avec unité), sinon vide */
  liaison: string;
  /** « champignons de Paris », « ail », « oignons », « sel » */
  nom: string;
}

const UNITES_PLURIEL: Record<string, string> = {
  pincée: 'pincées',
  gousse: 'gousses',
  branche: 'branches',
  botte: 'bottes',
  feuille: 'feuilles',
  tranche: 'tranches',
};

const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2, useGrouping: false });

/** Nombre au format français : virgule décimale, 2 décimales au plus. */
export function nombreFr(n: number): string {
  return fmt.format(n);
}

function arrondir(v: number, pas: number): number {
  const r = Math.round(v / pas) * pas;
  return r > 0 ? Number(r.toFixed(4)) : pas;
}

/** Arrondi « de cuisine » selon l'unité. */
function arrondiSense(v: number, unite: string): number {
  switch (unite) {
    case 'g':
    case 'ml':
      if (v > 50) return arrondir(v, 5);
      if (v >= 10) return arrondir(v, 1);
      return arrondir(v, 0.5);
    case 'cl':
      if (v >= 10) return arrondir(v, 1);
      return arrondir(v, 0.5);
    case 'kg':
    case 'l':
      return arrondir(v, 0.01);
    default:
      // pièces, cuillères, gousses, pincées… : au demi près
      return arrondir(v, 0.5);
  }
}

/**
 * Valeur et unité après mise à l'échelle. Facteur 1 : valeur d'origine, sans arrondi.
 * Sinon conversion vers l'unité lisible (0,6 kg → 600 g ; 1500 g → 1,5 kg) puis arrondi.
 */
export function echelle(qte: number, unite: string, facteur = 1): { valeur: number; unite: string } {
  let v = qte * facteur;
  let u = unite;
  if (facteur === 1) return { valeur: v, unite: u };
  if (u === 'kg' && v < 1) { v *= 1000; u = 'g'; }
  else if (u === 'g' && v >= 1000) { v /= 1000; u = 'kg'; }
  else if (u === 'l' && v < 1) { v *= 100; u = 'cl'; }
  else if (u === 'cl' && v >= 100) { v /= 100; u = 'l'; }
  else if (u === 'ml' && v >= 1000) { v /= 1000; u = 'l'; }
  return { valeur: arrondiSense(v, u), unite: u };
}

/** « 250 g », « 2 gousses », « 1,5 » (sans le nom). Vide si qte null. */
export function texteQuantite(qte: number | null, unite: string, facteur = 1): string {
  if (qte === null) return '';
  const { valeur, unite: u } = echelle(qte, unite, facteur);
  const n = nombreFr(valeur);
  if (!u) return n;
  return `${n} ${valeur >= 2 && UNITES_PLURIEL[u] ? UNITES_PLURIEL[u] : u}`;
}

/** Faut-il élider « de » devant ce nom ? */
export function elide(nom: string, elision?: boolean): boolean {
  if (typeof elision === 'boolean') return elision;
  return /^[aeiouàâäéèêëîïôöûüœæ]/i.test(nom);
}

/** « de » ou « d' » (avec l'espace éventuelle) devant le nom. */
export function liaison(nom: string, elision?: boolean): string {
  return elide(nom, elision) ? "d'" : 'de ';
}

/** Découpe l'affichage d'une ligne, pour un facteur de portions donné. */
export function partiesLigne(l: LigneQuantite, facteur = 1): PartiesLigne {
  if (l.qte === null) return { quantite: '', liaison: '', nom: l.nom };
  const { valeur, unite } = echelle(l.qte, l.unite, facteur);
  const quantite = texteQuantite(l.qte, l.unite, facteur);
  if (!unite) {
    return { quantite, liaison: '', nom: valeur >= 2 && l.pluriel ? l.pluriel : l.nom };
  }
  const nom = l.masse === 'singulier' ? l.nom : (l.pluriel ?? l.nom);
  // L'élision se décide sur le nom effectivement affiché ; l'indication du référentiel
  // (h muet, h aspiré) porte sur le singulier, qui a la même initiale.
  return { quantite, liaison: liaison(nom, l.elision), nom };
}

/** Texte complet d'une ligne (« 2 gousses d'ail », « 1 oignon », « sel »). */
export function texteLigne(l: LigneQuantite, facteur = 1): string {
  const { quantite, liaison: de, nom } = partiesLigne(l, facteur);
  return quantite ? `${quantite} ${de}${nom}` : nom;
}
