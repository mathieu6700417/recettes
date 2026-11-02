// @ts-check
import { defineConfig } from 'astro/config';

// Un cache de contenu par dossier de contenu (CONTENU_DIR) : sinon, passer du jeu de test
// au vrai contenu laisse des entrées périmées dans le cache des collections (slugs en double).
const contenu = (process.env.CONTENU_DIR ?? 'src/content').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

export default defineConfig({
  site: 'https://mathieu6700417.github.io',
  base: '/recettes',
  trailingSlash: 'always',
  output: 'static',
  cacheDir: contenu === 'src-content' ? './node_modules/.astro' : `./node_modules/.astro-${contenu}`,
});
