// Formatage et mise à l'échelle des quantités — partagé entre le build et le navigateur.

const PLURIELS: Record<string, string> = {
  pincée: 'pincées',
  gousse: 'gousses',
  branche: 'branches',
  botte: 'bottes',
  feuille: 'feuilles',
  tranche: 'tranches',
};

const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** Nombre au format français : virgule décimale, 2 décimales max. */
export function nombreFr(n: number): string {
  return fmt.format(n).replace(/ /g, ' ');
}

function arrondir(v: number, pas: number): number {
  const r = Math.round(v / pas) * pas;
  return r > 0 ? r : pas;
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
 * Texte de la quantité (nombre + unité), pour un facteur de portions donné.
 * Facteur 1 : la valeur d'origine est affichée telle quelle.
 */
export function texteQuantite(qte: number | null, unite: string, facteur = 1): string {
  if (qte === null) return '';
  let v = qte * facteur;
  let u = unite;
  if (facteur !== 1) {
    if (u === 'kg' && v < 1) { v *= 1000; u = 'g'; }
    else if (u === 'l' && v < 1) { v *= 100; u = 'cl'; }
    v = arrondiSense(v, u);
  }
  const n = nombreFr(v);
  if (!u) return n;
  const unitePlurielle = v >= 2 && PLURIELS[u] ? PLURIELS[u] : u;
  return `${n} ${unitePlurielle}`;
}

/** « de » ou « d' » devant le nom quand il y a une unité. */
export function liaison(nom: string): string {
  return /^([aeiouyàâäéèêëîïôöûüœæ]|h(uile|erbe|uître))/i.test(nom) ? "d'" : 'de ';
}

export function majuscule(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase('fr-FR') + s.slice(1) : s;
}
