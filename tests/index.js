// Point d'entrée pour `node --test tests/` : les versions récentes de Node interprètent un
// argument de dossier comme un module (tests/index.js) et non comme un dossier à parcourir.
// `npm test` utilise un motif glob et n'a pas besoin de ce fichier.
import './verifier.test.mjs';
import './quantites.test.mjs';
import './cuisiner.test.mjs';
import './derives.test.mjs';
