// Validation stricte d'un réseau v2 chargé par chargerReseau() (règles de CONTENU-v2.md,
// section « Validation » et listes fermées). Ajoute les messages dans fichier.erreurs /
// fichier.avertissements ; les messages qui ne relèvent d'aucun fichier vont dans `global`.
import {
  SLUG, PAYS, NATURES, ROLES, STATUTS, DIFFICULTES, UNITES,
  MUTATION_MAX, MUTATION_AVERT, MERES_MAX,
  TECHNIQUES, BASES, PLATS, PROFILS, FAMILLES,
} from './listes.mjs';
import { trouverCycles } from './reseau.mjs';

const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const estChaine = (v) => typeof v === 'string' && v.trim() !== '';
const estEntier = (v) => typeof v === 'number' && Number.isInteger(v);
const estNombre = (v) => typeof v === 'number' && Number.isFinite(v);
const absent = (v) => v === undefined || v === null;
const q = (v) => `« ${v} »`;
const val = (v) => (typeof v === 'string' ? q(v) : JSON.stringify(v));
const enum_ = (a) => a.map((x) => (x === '' ? '""' : x)).join(', ');
const longueur = (s) => [...s].length;

const LIBELLES = {
  technique: 'une technique',
  preparation: 'une préparation',
  version: 'une version',
  profil: 'un profil',
  famille: "une famille d'ingrédients",
  ingredient: 'un ingrédient',
};
const ouLibelles = (types) => types.map((t) => LIBELLES[t]).join(' ou ');

/**
 * Valide le réseau. Renvoie les totaux ; les messages sont dans les fichiers et `global`.
 * @param {ReturnType<import('./reseau.mjs').chargerReseau>} r
 */
export function validerReseau(r) {
  const global = { erreurs: [], avertissements: [] };
  const E = (f, m) => f.erreurs.push(m);
  const A = (f, m) => f.avertissements.push(m);

  // ---------- Utilitaires de champ ----------
  const cles = (f, obj, permises, ou = '') => {
    for (const k of Object.keys(obj)) {
      if (!permises.includes(k)) E(f, `${ou ? `${ou} : ` : ''}champ inconnu ${q(k)} (permis : ${permises.join(', ')})`);
    }
  };
  const chaine = (f, d, k, ou = k) => {
    if (!estChaine(d[k])) E(f, `${ou} : chaîne non vide requise${absent(d[k]) ? '' : ` (reçu ${val(d[k])})`}`);
  };
  const chaineOpt = (f, d, k, ou = k) => {
    if (d[k] !== undefined && !estChaine(d[k])) E(f, `${ou} : chaîne non vide si présent (reçu ${val(d[k])})`);
  };
  const ordre = (f, d) => {
    if (d.ordre !== undefined && !estNombre(d.ordre)) E(f, `ordre : nombre attendu (reçu ${val(d.ordre)})`);
  };
  const mutation = (f, v, ou, requise = true) => {
    if (absent(v)) {
      if (requise) E(f, `${ou}.mutation : requise (chaîne non vide, ${MUTATION_MAX} caractères maximum)`);
      return;
    }
    if (!estChaine(v)) return E(f, `${ou}.mutation : chaîne non vide requise (reçu ${val(v)})`);
    const n = longueur(v);
    if (n > MUTATION_MAX) E(f, `${ou}.mutation : trop longue (${n} caractères, maximum ${MUTATION_MAX}) : ${q(v)}`);
    else if (n > MUTATION_AVERT) A(f, `${ou}.mutation : longue (${n} caractères, idéalement ≤ ${MUTATION_AVERT}) : ${q(v)}`);
  };
  /** Vérifie qu'un slug référencé existe et est du bon type. Renvoie le nœud ou null. */
  const ref = (f, slug, types, ou) => {
    if (!estChaine(slug) || !SLUG.test(slug)) {
      E(f, `${ou} : slug invalide ${absent(slug) ? '(absent)' : val(slug)}`);
      return null;
    }
    const n = r.noeud(slug);
    if (!n) {
      E(f, `${ou} : slug inconnu ${q(slug)} (attendu : ${ouLibelles(types)})`);
      return null;
    }
    if (!types.includes(n.type)) {
      E(f, `${ou} : ${q(slug)} est ${LIBELLES[n.type]}, attendu : ${ouLibelles(types)}`);
      return null;
    }
    return n;
  };
  const tableauOpt = (f, d, k) => {
    if (absent(d[k])) return [];
    if (!Array.isArray(d[k])) {
      E(f, `${k} : liste attendue (reçu ${val(d[k])})`);
      return [];
    }
    return d[k];
  };
  const doublon = (f, vus, slug, ou) => {
    if (!estChaine(slug)) return;
    if (vus.has(slug)) E(f, `${ou} : ${q(slug)} est déjà cité dans la liste`);
    vus.add(slug);
  };
  const pasDeH1 = (f) => {
    if (/^# /m.test(f.corps ?? '')) A(f, 'le corps contient un titre H1 (« # ») : à retirer, le titre vient de l\'en-tête');
  };
  const nomFichier = (f) => {
    if (!SLUG.test(f.slug)) E(f, `nom de fichier invalide pour un slug : ${q(f.slug)} (minuscules, chiffres, tirets simples)`);
  };

  // ---------- Slugs uniques sur tout le réseau ----------
  for (const [slug, ns] of r.doublons) {
    const desc = ns.map((n) => `${LIBELLES[n.type]} (${n.fichier.rel})`).join(', ');
    for (const f of new Set(ns.map((n) => n.fichier))) E(f, `slug ${q(slug)} déclaré plusieurs fois sur le réseau : ${desc}`);
  }

  // ---------- Techniques ----------
  for (const f of r.fichiers.filter((x) => x.type === 'technique')) {
    nomFichier(f);
    const liste = TECHNIQUES[f.slug];
    if (!liste) E(f, `slug hors de la liste fermée des techniques : ${q(f.slug)}`);
    const d = f.data;
    if (!d) continue;
    cles(f, d, ['titre', 'parent', 'mutation', 'resume', 'ordre']);
    chaine(f, d, 'titre');
    if (liste && estChaine(d.titre) && d.titre !== liste.titre) A(f, `titre ${q(d.titre)} différent de la liste fermée (${q(liste.titre)})`);
    chaine(f, d, 'resume');
    ordre(f, d);
    if (absent(d.parent)) {
      if (liste?.parent) E(f, `parent : absent, alors que la liste fermée impose ${q(liste.parent)}`);
      if (!absent(d.mutation)) E(f, 'mutation : interdite sur une technique racine (sans parent)');
    } else {
      if (d.parent === f.slug) E(f, 'parent : une technique ne peut pas être son propre parent');
      else ref(f, d.parent, ['technique'], 'parent');
      if (liste && d.parent !== liste.parent) E(f, `parent : ${val(d.parent)} non conforme à la liste fermée (${liste.parent ? q(liste.parent) : 'racine, sans parent'})`);
      mutation(f, d.mutation, 'parent');
    }
    pasDeH1(f);
  }

  // ---------- Préparations ----------
  for (const f of r.fichiers.filter((x) => x.type === 'preparation')) {
    nomFichier(f);
    const base = BASES[f.slug];
    const plat = PLATS[f.slug];
    if (!base && !plat) E(f, `slug hors des listes fermées (bases et plats) : ${q(f.slug)}`);
    const d = f.data;
    if (!d) continue;
    cles(f, d, ['titre', 'origine', 'nature', 'resume', 'cuisson', 'composants', 'substitution', 'profils', 'histoire', 'ordre']);
    chaine(f, d, 'titre');
    if (base && estChaine(d.titre) && d.titre !== base.titre) A(f, `titre ${q(d.titre)} différent de la liste fermée (${q(base.titre)})`);
    if (typeof d.origine !== 'string' || !PAYS.test(d.origine)) E(f, `origine : code pays ISO à 2 lettres majuscules requis (reçu ${absent(d.origine) ? 'rien' : val(d.origine)})`);
    else {
      const attendu = (base ?? plat)?.origine;
      if (attendu && d.origine !== attendu) E(f, `origine : ${q(d.origine)} non conforme à la liste fermée (${q(attendu)})`);
    }
    if (!NATURES.includes(d.nature)) E(f, `nature : valeur inconnue ${absent(d.nature) ? '(absente)' : val(d.nature)}, attendu ${enum_(NATURES)}`);
    else if (base && d.nature !== 'base') E(f, `nature : ${q(d.nature)} alors que ${q(f.slug)} est dans la liste fermée des bases`);
    else if (plat && d.nature !== 'plat') E(f, `nature : ${q(d.nature)} alors que ${q(f.slug)} est dans la liste fermée des plats`);
    chaine(f, d, 'resume');
    ordre(f, d);

    // cuisson
    const cuisson = tableauOpt(f, d, 'cuisson');
    if (d.nature === 'plat' && cuisson.length === 0) E(f, 'cuisson : au moins une technique requise pour un plat');
    let vus = new Set();
    cuisson.forEach((c, i) => {
      const ou = `cuisson[${i + 1}]`;
      if (!estObjet(c)) return E(f, `${ou} : objet { slug, mutation } attendu`);
      cles(f, c, ['slug', 'mutation'], ou);
      ref(f, c.slug, ['technique'], `${ou}.slug`);
      doublon(f, vus, c.slug, ou);
      mutation(f, c.mutation, ou);
    });

    // composants
    vus = new Set();
    tableauOpt(f, d, 'composants').forEach((c, i) => {
      const ou = `composants[${i + 1}]`;
      if (!estObjet(c)) return E(f, `${ou} : objet { slug, role, mutation } attendu`);
      cles(f, c, ['slug', 'role', 'mutation'], ou);
      if (c.slug === f.slug) E(f, `${ou}.slug : une préparation ne peut pas être son propre composant`);
      else {
        const n = ref(f, c.slug, ['preparation'], `${ou}.slug`);
        if (n && n.data.nature !== 'base') E(f, `${ou}.slug : ${q(c.slug)} n'est pas une base (nature ${val(n.data.nature)}) ; un composant doit être une préparation de nature base`);
      }
      doublon(f, vus, c.slug, ou);
      if (!ROLES.includes(c.role)) E(f, `${ou}.role : rôle inconnu ${absent(c.role) ? '(absent)' : val(c.role)}, attendu ${enum_(ROLES)}`);
      mutation(f, c.mutation, ou);
    });

    // substitution
    const subs = tableauOpt(f, d, 'substitution');
    if (subs.length > MERES_MAX) E(f, `substitution : ${subs.length} mères déclarées, maximum ${MERES_MAX}`);
    vus = new Set();
    subs.forEach((s, i) => {
      const ou = `substitution[${i + 1}]`;
      if (!estObjet(s)) return E(f, `${ou} : objet { mere, mutation, echanges } attendu`);
      cles(f, s, ['mere', 'mutation', 'echanges'], ou);
      if (s.mere === f.slug) E(f, `${ou}.mere : une préparation ne peut pas être sa propre mère`);
      else ref(f, s.mere, ['preparation'], `${ou}.mere`);
      doublon(f, vus, s.mere, ou);
      mutation(f, s.mutation, ou);
      if (!Array.isArray(s.echanges) || s.echanges.length === 0) {
        E(f, `${ou}.echanges : au moins un échange { de, vers } requis`);
        return;
      }
      s.echanges.forEach((e, j) => {
        const oue = `${ou}.echanges[${j + 1}]`;
        if (!estObjet(e)) return E(f, `${oue} : objet { de, vers } attendu`);
        cles(f, e, ['de', 'vers'], oue);
        ref(f, e.de, ['ingredient', 'famille'], `${oue}.de`);
        ref(f, e.vers, ['ingredient', 'famille'], `${oue}.vers`);
        if (estChaine(e.de) && e.de === e.vers) E(f, `${oue} : ${q(e.de)} échangé contre lui-même`);
      });
    });

    // profils
    vus = new Set();
    tableauOpt(f, d, 'profils').forEach((p, i) => {
      const ou = `profils[${i + 1}]`;
      if (!estObjet(p)) return E(f, `${ou} : objet { slug, mutation? } attendu`);
      cles(f, p, ['slug', 'mutation'], ou);
      ref(f, p.slug, ['profil'], `${ou}.slug`);
      doublon(f, vus, p.slug, ou);
      mutation(f, p.mutation, ou, false);
    });

    // histoire
    if (!absent(d.histoire)) {
      if (!estObjet(d.histoire)) E(f, `histoire : null ou objet { texte, source } attendu (reçu ${val(d.histoire)})`);
      else {
        cles(f, d.histoire, ['texte', 'source'], 'histoire');
        chaine(f, d.histoire, 'texte', 'histoire.texte');
        chaine(f, d.histoire, 'source', 'histoire.source');
      }
    }
    pasDeH1(f);
  }

  // ---------- Versions ----------
  for (const f of r.fichiers.filter((x) => x.type === 'version')) {
    const m = f.slug.match(/^(.+?)--(.+)$/);
    if (!m || !SLUG.test(m[1]) || !SLUG.test(m[2])) E(f, `nom de fichier invalide : ${q(f.slug)}, attendu <preparation>--<version> (deux slugs)`);
    const d = f.data;
    if (!d) continue;
    cles(f, d, ['preparation', 'titre', 'reference', 'ecarts', 'statut', 'portions', 'temps', 'difficulte', 'source', 'ingredients', 'etapes']);
    if (absent(d.preparation)) E(f, 'preparation : slug de la préparation requis');
    else {
      ref(f, d.preparation, ['preparation'], 'preparation');
      if (m && d.preparation !== m[1]) E(f, `preparation : ${val(d.preparation)} ne correspond pas au nom du fichier (${q(m[1])})`);
    }
    chaine(f, d, 'titre');
    if (typeof d.reference !== 'boolean') E(f, `reference : booléen requis (true ou false)${absent(d.reference) ? '' : `, reçu ${val(d.reference)}`}`);
    if (d.reference === false && !estChaine(d.ecarts)) E(f, 'ecarts : requis pour une version qui n\'est pas la référence (reference: false)');
    if (d.reference === true && d.ecarts !== undefined) E(f, 'ecarts : interdit sur la version de référence (reference: true)');
    if (!STATUTS.includes(d.statut)) E(f, `statut : valeur inconnue ${absent(d.statut) ? '(absent)' : val(d.statut)}, attendu ${enum_(STATUTS)}`);
    if (!estEntier(d.portions) || d.portions < 1) E(f, `portions : entier ≥ 1 requis${absent(d.portions) ? '' : ` (reçu ${val(d.portions)})`}`);
    if (!estObjet(d.temps)) E(f, 'temps : objet { preparation, cuisson, repos? } requis (minutes)');
    else {
      cles(f, d.temps, ['preparation', 'cuisson', 'repos'], 'temps');
      for (const k of ['preparation', 'cuisson', 'repos']) {
        const v = d.temps[k];
        if (k === 'repos' && v === undefined) continue;
        if (!estEntier(v) || v < 0) E(f, `temps.${k} : entier ≥ 0 (minutes) requis${absent(v) ? '' : ` (reçu ${val(v)})`}`);
      }
    }
    if (!DIFFICULTES.includes(d.difficulte)) E(f, `difficulte : valeur inconnue ${absent(d.difficulte) ? '(absente)' : val(d.difficulte)}, attendu ${enum_(DIFFICULTES)}`);
    chaineOpt(f, d, 'source');

    if (!Array.isArray(d.ingredients) || d.ingredients.length === 0) E(f, 'ingredients : liste non vide requise');
    else d.ingredients.forEach((x, i) => {
      const ou = `ingredients[${i + 1}]`;
      if (!estObjet(x)) return E(f, `${ou} : objet attendu`);
      cles(f, x, ['ingredient', 'preparation', 'qte', 'unite', 'precision', 'groupe'], ou);
      const a = x.ingredient !== undefined;
      const b = x.preparation !== undefined;
      if (a === b) E(f, `${ou} : exactement une des clés « ingredient » ou « preparation » requise`);
      else if (a) {
        const n = r.noeud(x.ingredient);
        if (n?.type === 'famille') E(f, `${ou}.ingredient : ${q(x.ingredient)} est une famille ; une version cite un ingrédient précis`);
        else ref(f, x.ingredient, ['ingredient'], `${ou}.ingredient`);
      } else {
        const n = ref(f, x.preparation, ['preparation'], `${ou}.preparation`);
        if (n && n.data.nature !== 'base') E(f, `${ou}.preparation : ${q(x.preparation)} n'est pas une base (nature ${val(n.data.nature)})`);
      }
      if (!('qte' in x)) E(f, `${ou}.qte : requis (nombre > 0, ou null si non quantifiable)`);
      else if (!(x.qte === null || (estNombre(x.qte) && x.qte > 0))) E(f, `${ou}.qte : nombre > 0 ou null requis (reçu ${val(x.qte)})`);
      if (!UNITES.includes(x.unite)) E(f, `${ou}.unite : unité inconnue ${absent(x.unite) ? '(absente)' : val(x.unite)}, attendu ${enum_(UNITES)}`);
      chaineOpt(f, x, 'precision', `${ou}.precision`);
      if (estChaine(x.precision) && x.precision[0] !== x.precision[0].toLowerCase()) A(f, `${ou}.precision : à écrire en minuscules (${q(x.precision)})`);
      chaineOpt(f, x, 'groupe', `${ou}.groupe`);
    });
    if (!Array.isArray(d.etapes) || d.etapes.length === 0) E(f, 'etapes : liste non vide requise');
    else d.etapes.forEach((e, i) => { if (!estChaine(e)) E(f, `etapes[${i + 1}] : chaîne non vide requise`); });
    pasDeH1(f);
  }

  // ---------- Profils ----------
  for (const f of r.fichiers.filter((x) => x.type === 'profil')) {
    nomFichier(f);
    const liste = PROFILS[f.slug];
    if (!liste) E(f, `slug hors de la liste fermée des profils : ${q(f.slug)}`);
    const d = f.data;
    if (!d) continue;
    cles(f, d, ['titre', 'parent', 'mutation', 'origine', 'resume', 'composition']);
    chaine(f, d, 'titre');
    if (liste && estChaine(d.titre) && d.titre !== liste.titre) A(f, `titre ${q(d.titre)} différent de la liste fermée (${q(liste.titre)})`);
    chaine(f, d, 'resume');
    if (absent(d.parent)) {
      if (liste?.parent) E(f, `parent : absent, alors que la liste fermée impose ${q(liste.parent)}`);
      if (!absent(d.mutation)) E(f, 'mutation : interdite sur un profil racine (sans parent)');
    } else {
      if (d.parent === f.slug) E(f, 'parent : un profil ne peut pas être son propre parent');
      else ref(f, d.parent, ['profil'], 'parent');
      if (liste && d.parent !== liste.parent) E(f, `parent : ${val(d.parent)} non conforme à la liste fermée (${liste.parent ? q(liste.parent) : 'racine, sans parent'})`);
      mutation(f, d.mutation, 'parent');
    }
    if (!absent(d.origine)) {
      if (typeof d.origine !== 'string' || !PAYS.test(d.origine)) E(f, `origine : code pays ISO à 2 lettres majuscules, ou absent (reçu ${val(d.origine)})`);
      else if (liste && d.origine !== liste.origine) E(f, `origine : ${q(d.origine)} non conforme à la liste fermée (${liste.origine ? q(liste.origine) : 'sans pays : à omettre'})`);
    } else if (liste?.origine) E(f, `origine : absente, alors que la liste fermée impose ${q(liste.origine)}`);
    if (!Array.isArray(d.composition) || d.composition.length === 0) E(f, 'composition : liste non vide requise');
    else {
      const vus = new Set();
      d.composition.forEach((c, i) => {
        const ou = `composition[${i + 1}]`;
        if (!estObjet(c)) return E(f, `${ou} : objet { ingredient, precision? } attendu`);
        cles(f, c, ['ingredient', 'precision'], ou);
        ref(f, c.ingredient, ['ingredient', 'famille'], `${ou}.ingredient`);
        doublon(f, vus, c.ingredient, ou);
        chaineOpt(f, c, 'precision', `${ou}.precision`);
      });
    }
    pasDeH1(f);
  }

  // ---------- Référentiel des ingrédients ----------
  for (const f of r.fichiers.filter((x) => x.type === 'famille')) {
    nomFichier(f);
    if (!FAMILLES.includes(f.slug)) E(f, `famille hors de la liste fermée : ${q(f.slug)} (nom du fichier)`);
    const d = f.data;
    if (!d) continue;
    cles(f, d, ['titre', 'ingredients']);
    chaine(f, d, 'titre');
    if (!Array.isArray(d.ingredients) || d.ingredients.length === 0) {
      E(f, 'ingredients : liste non vide requise');
      continue;
    }
    d.ingredients.forEach((x, i) => {
      let ou = `ingredients[${i + 1}]`;
      if (!estObjet(x)) return E(f, `${ou} : objet attendu`);
      if (estChaine(x.slug)) ou += ` (${q(x.slug)})`;
      cles(f, x, ['slug', 'nom', 'pluriel', 'masse', 'parent', 'synonymes', 'techniques', 'substituts', 'placard', 'elision'], ou);
      if (!estChaine(x.slug) || !SLUG.test(x.slug)) E(f, `${ou}.slug : slug valide requis${absent(x.slug) ? '' : ` (reçu ${val(x.slug)})`}`);
      chaine(f, x, 'nom', `${ou}.nom`);
      chaineOpt(f, x, 'pluriel', `${ou}.pluriel`);
      if (x.masse !== undefined && x.masse !== 'singulier') E(f, `${ou}.masse : seule valeur permise « singulier » (reçu ${val(x.masse)})`);
      if (!absent(x.parent) && x.parent === x.slug) E(f, `${ou}.parent : un ingrédient ne peut pas être son propre parent`);
      else if (!absent(x.parent)) {
        const n = ref(f, x.parent, ['ingredient'], `${ou}.parent`);
        if (n && n.famille !== f.slug) E(f, `${ou}.parent : ${q(x.parent)} appartient à la famille ${q(n.famille)}, pas à ${q(f.slug)}`);
      }
      for (const [k, types] of [['synonymes', null], ['techniques', ['technique']], ['substituts', ['ingredient']]]) {
        if (x[k] === undefined) continue;
        if (!Array.isArray(x[k])) {
          E(f, `${ou}.${k} : liste attendue (reçu ${val(x[k])})`);
          continue;
        }
        x[k].forEach((s, j) => {
          if (!types) {
            if (!estChaine(s)) E(f, `${ou}.${k}[${j + 1}] : chaîne non vide requise`);
          } else if (s === x.slug) E(f, `${ou}.${k}[${j + 1}] : un ingrédient ne peut pas être son propre substitut`);
          else ref(f, s, types, `${ou}.${k}[${j + 1}]`);
        });
      }
      for (const k of ['placard', 'elision']) {
        if (x[k] !== undefined && typeof x[k] !== 'boolean') E(f, `${ou}.${k} : booléen attendu (reçu ${val(x[k])})`);
      }
    });
  }

  // ---------- Cycles ----------
  const cycles = (nom, type, typeLien, typeCible) => {
    const sommets = r.parType(type).map((n) => n.slug);
    const voisins = (s) => r.liensDe(s, typeLien).filter((l) => l.vers !== s && r.noeud(l.vers)?.type === typeCible).map((l) => l.vers);
    for (const c of trouverCycles(sommets, voisins)) E(r.noeud(c[0]).fichier, `cycle dans ${nom} : ${c.join(' → ')}`);
  };
  cycles('la hiérarchie des techniques', 'technique', 'parent', 'technique');
  cycles('les composants', 'preparation', 'composant', 'preparation');
  cycles('les substitutions', 'preparation', 'substitution', 'preparation');
  cycles('la hiérarchie des profils', 'profil', 'parent', 'profil');
  cycles('la hiérarchie des ingrédients', 'ingredient', 'parent', 'ingredient');

  // ---------- Versions de référence ----------
  for (const p of r.parType('preparation')) {
    const refs = r.versionsDe(p.slug).filter((v) => v.data.reference === true);
    if (refs.length === 0) E(p.fichier, `aucune version de référence (attendu exactement une, ex. versions/${p.slug}--classique.md avec reference: true)`);
    else if (refs.length > 1) E(p.fichier, `${refs.length} versions de référence (attendu exactement une) : ${refs.map((v) => v.slug).join(', ')}`);
  }

  // ---------- Usage (avertissements) ----------
  for (const p of r.parType('preparation')) {
    if (p.data.nature !== 'base') continue;
    const utilise = r.liensVers(p.slug).some((l) => l.type === 'composant' || l.type === 'utilise');
    if (!utilise) A(p.fichier, 'base jamais utilisée (ni composant d\'une préparation, ni ingrédient d\'une version)');
  }
  for (const n of r.parType('ingredient')) {
    const utilise = r.liensVers(n.slug).some((l) => l.type === 'utilise' || l.type === 'composition');
    if (!utilise) A(n.fichier, `ingrédient jamais utilisé : ${q(n.slug)} (ni dans une version, ni dans un profil)`);
  }

  // ---------- Listes fermées : éléments absents du contenu (avertissements) ----------
  const manquants = (libelle, slugs, type) => {
    const m = slugs.filter((s) => r.noeud(s)?.type !== type);
    if (m.length) global.avertissements.push(`${m.length} ${libelle} de la liste fermée absent(e)s du contenu : ${m.join(', ')}`);
  };
  manquants('technique(s)', Object.keys(TECHNIQUES), 'technique');
  manquants('base(s)', Object.keys(BASES), 'preparation');
  manquants('plat(s)', Object.keys(PLATS), 'preparation');
  manquants('profil(s)', Object.keys(PROFILS), 'profil');
  manquants("famille(s) d'ingrédients", FAMILLES, 'famille');

  const somme = (k) => r.fichiers.reduce((n, f) => n + f[k].length, 0) + global[k].length;
  return { erreurs: somme('erreurs'), avertissements: somme('avertissements'), global, fichiers: r.fichiers };
}
