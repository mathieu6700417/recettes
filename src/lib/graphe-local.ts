// Mise en page déterministe du petit graphe local (SVG généré au build).
// Le nœud au centre ; au-dessus en arc les parents ; au-dessous en arc les descendants ;
// à gauche et à droite les liens latéraux (profils, substitutions, substituts, accords).
// Fonction pure : largeur du texte estimée (~0,55 × police × caractères), libellés placés à des
// hauteurs alternées puis raccourcis jusqu'à ne plus se recouvrir.
import { tronquer } from './format.ts';

export interface EntreeGraphe { slug: string; titre: string; url?: string; teinte: string; note?: string }
export interface EntreesGraphe { haut: EntreeGraphe[]; bas: EntreeGraphe[]; gauche: EntreeGraphe[]; droite: EntreeGraphe[] }

export interface PointGraphe {
  x: number;
  y: number;
  /** position du libellé */
  lx: number;
  ly: number;
  ancre: 'start' | 'middle' | 'end';
  libelle: string;
  /** texte complet (infobulle) */
  titre: string;
  url?: string;
  teinte: string;
  /** nœud de regroupement « +3 » */
  surplus?: boolean;
}

export interface Graphe {
  largeur: number;
  /** viewBox : y minimal et hauteur (on retire les bandes vides) */
  y0: number;
  hauteur: number;
  centre: { x: number; y: number; lignes: string[] };
  points: PointGraphe[];
  teintes: string[];
}

const L = 640;
const H = 420;
const CX = L / 2;
const CY = H / 2;
const MAX_ARC = 7;
const MAX_COTE = 4;
/** Taille de police des libellés (px dans le viewBox) et estimation de leur emprise. */
export const TAILLE_TEXTE = 13;
const LARGEUR_CAR = 0.55;
const MARGE = 6;
const HAUTEUR_TEXTE = 12;
const PAS_NIVEAU = 15;
const NIVEAUX = 3;

/** Largeur estimée d'un libellé (~0,55 × taille × nombre de caractères). */
export function largeurTexte(texte: string): number {
  return Math.ceil(texte.length * LARGEUR_CAR * TAILLE_TEXTE);
}

/** Boîte englobante estimée du libellé d'un point. */
export function boiteLibelle(p: Pick<PointGraphe, 'lx' | 'ly' | 'ancre' | 'libelle'>) {
  const w = largeurTexte(p.libelle);
  const x0 = p.ancre === 'middle' ? p.lx - w / 2 : p.ancre === 'end' ? p.lx - w : p.lx;
  return { x0, x1: x0 + w, y0: p.ly - HAUTEUR_TEXTE + 2, y1: p.ly + 3 };
}

export function boitesSeRecouvrent(a: ReturnType<typeof boiteLibelle>, b: ReturnType<typeof boiteLibelle>, marge = 0): boolean {
  return a.x0 < b.x1 + marge && b.x0 < a.x1 + marge && a.y0 < b.y1 + marge && b.y0 < a.y1 + marge;
}

/** Coupe un titre en au plus deux lignes d'environ `max` caractères. */
function lignes(titre: string, max: number): string[] {
  if (titre.length <= max) return [titre];
  const mots = titre.split(' ');
  let l1 = '';
  while (mots.length && (l1 + ' ' + mots[0]).trim().length <= max) l1 = `${l1} ${mots.shift()}`.trim();
  if (!l1) return [tronquer(titre, max)];
  return [l1, tronquer(mots.join(' '), max)];
}

function limiter(liste: EntreeGraphe[], max: number): (EntreeGraphe & { surplus?: boolean })[] {
  if (liste.length <= max) return liste;
  const gardes = liste.slice(0, max - 1);
  const reste = liste.slice(max - 1);
  return [...gardes, {
    slug: '', titre: reste.map((e) => e.titre).join(', '), teinte: 'neutre', surplus: true,
  } as EntreeGraphe & { surplus: boolean }];
}

export function disposer(titreCentre: string, e: EntreesGraphe): Graphe {
  const points: PointGraphe[] = [];
  const creer = (x: number, y: number, lx: number, ly: number, ancre: PointGraphe['ancre'], ent: EntreeGraphe & { surplus?: boolean }, max: number): PointGraphe => ({
    x, y, lx, ly, ancre,
    libelle: ent.surplus ? `+${ent.titre.split(', ').length} autres` : tronquer(ent.titre, max),
    titre: ent.note ? `${ent.titre} — ${ent.note}` : ent.titre,
    url: ent.url,
    teinte: ent.teinte,
    surplus: ent.surplus,
  });

  // Arcs du haut et du bas.
  for (const cote of ['haut', 'bas'] as const) {
    const liste = limiter(e[cote], MAX_ARC);
    const n = liste.length;
    const etendue = Math.min(L * 0.76, (n - 1) * 112);
    const posees: ReturnType<typeof boiteLibelle>[] = [];
    liste.forEach((ent, i) => {
      const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1 … 1
      const x = CX + t * (etendue / 2);
      const courbe = 34 * t * t;
      const y = cote === 'haut' ? 78 + courbe : H - 78 - courbe;
      // Hauteur du libellé : premier niveau (0, 1, 2) sans recouvrement avec les précédents ;
      // sinon on raccourcit le texte jusqu'à ce que ça tienne (déterministe).
      let max = n > 4 ? 16 : 22;
      let choix: { p: PointGraphe; boite: ReturnType<typeof boiteLibelle> } | null = null;
      for (; max >= 5 && !choix; max -= 2) {
        for (let niv = 0; niv < NIVEAUX && !choix; niv++) {
          const ly = cote === 'haut' ? y - 12 - niv * PAS_NIVEAU : y + 20 + niv * PAS_NIVEAU;
          const p = creer(x, y, x, ly, 'middle', ent, max);
          const boite = boiteLibelle(p);
          const dedans = boite.x0 >= 0 && boite.x1 <= L;
          if (dedans && !posees.some((b) => boitesSeRecouvrent(b, boite, MARGE))) choix = { p, boite };
        }
      }
      if (!choix) { // dernier recours : texte minimal au niveau 0
        const p = creer(x, y, x, cote === 'haut' ? y - 12 : y + 20, 'middle', ent, 4);
        choix = { p, boite: boiteLibelle(p) };
      }
      posees.push(choix.boite);
      points.push(choix.p);
    });
  }

  // Côtés.
  for (const cote of ['gauche', 'droite'] as const) {
    const liste = limiter(e[cote], MAX_COTE);
    const n = liste.length;
    liste.forEach((ent, i) => {
      const y = CY + (i - (n - 1) / 2) * 40;
      const x = cote === 'gauche' ? 128 : L - 128;
      const lx = cote === 'gauche' ? x - 10 : x + 10;
      points.push(creer(x, y, lx, y + 4, cote === 'gauche' ? 'end' : 'start', ent, 18));
    });
  }

  const y0 = e.haut.length ? 20 : CY - 80;
  const y1 = e.bas.length ? H - 10 : CY + 80;
  const teintes = [...new Set(points.filter((p) => !p.surplus).map((p) => p.teinte))];
  return {
    largeur: L,
    y0,
    hauteur: y1 - y0,
    centre: { x: CX, y: CY, lignes: lignes(titreCentre, 24) },
    points,
    teintes,
  };
}
