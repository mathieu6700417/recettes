// Petites fonctions de présentation, sans dépendance : utilisables au build et dans le navigateur.

/** Drapeau emoji depuis un code ISO 3166-1 alpha-2 (« FR » → 🇫🇷). */
export function drapeau(code?: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

let pays: Intl.DisplayNames | null = null;
/** Nom du pays en français (« IT » → « Italie »). */
export function nomPays(code?: string | null): string {
  if (!code) return '';
  try {
    pays ??= new Intl.DisplayNames(['fr'], { type: 'region' });
    return pays.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Durée en minutes → « 2 h », « 1 h 30 », « 15 min ». */
export function duree(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

export function majuscule(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase('fr-FR') + s.slice(1) : s;
}

export function minuscule(s: string): string {
  return s ? s.charAt(0).toLocaleLowerCase('fr-FR') + s.slice(1) : s;
}

/** « 2 préparations », « 1 préparation ». */
export function pluriel(n: number, mot: string, motPluriel = `${mot}s`): string {
  return `${n} ${n > 1 ? motPluriel : mot}`;
}

/** Texte en minuscules, sans accents ni ligatures : pour comparer et chercher. */
export function normaliser(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');
}

/** Tronque proprement un libellé (au mot si possible) avec une ellipse. */
export function tronquer(s: string, max: number): string {
  if (s.length <= max) return s;
  const coupe = s.slice(0, max - 1);
  const espace = coupe.lastIndexOf(' ');
  const base = espace >= max * 0.6 ? coupe.slice(0, espace) : coupe;
  return `${base.replace(/[\s,;:.'’-]+$/, '')}…`;
}
