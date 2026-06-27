# Leçons apprises — EditUI

## 2026-06-27 — Intégration Vite + exemple

### Problème : Le plugin unplugin ne fonctionne pas en build production Vite

**Symptôme :**
Le wrapper unplugin (`@editui/plugin/vite`) ne produit aucune annotation
dans le build `vite build`, alors que le plugin Babel fonctionne parfaitement
en isolation (test direct avec `transformSync`).

**Causes racine (2 problèmes enchâssés) :**

1. `@vitejs/plugin-react` supprime son hook `transform` en production quand
   aucune config Babel custom n'est fournie (condition `canSkipBabel` dans
   `configResolved`). Le transform est littéralement effacé par
   `delete viteBabel.transform`.

2. Sans le transform Babel du plugin React, Vite délègue la transpilation JSX
   à esbuild, qui s'exécute **avant** le pipeline Rollup (et donc avant que
   le wrapper unplugin ne voie le code). Quand le plugin EditUI reçoit le
   fichier, le JSX a déjà été converti en appels `jsx()` / `jsxs()` →
   plus de nœuds `JSXOpeningElement` à annoter.

**Résolution :**
Ne pas passer par le wrapper unplugin pour Vite. Injecter directement le
plugin Babel EditUI dans le pipeline de `@vitejs/plugin-react` via son
option `babel.plugins` :

```js
react({
  babel: {
    plugins: [
      ['@editui/plugin/babel-plugin', { enabled: true }],
    ],
  },
})
```

Cela force Babel à rester actif (car `plugins.length > 0` fait échouer
`canSkipBabel`) et l'annotation se fait dans le même passage Babel que la
transpilation JSX.

**Enseignement :**
- Un plugin unplugin n'est pas la bonne abstraction pour un plugin Babel
  qui doit s'intégrer dans le pipeline d'un autre plugin Babel.
- `@vitejs/plugin-react` + esbuild contournent complètement le pipeline
  transform Rollup en production. Toujours vérifier si le pipeline Babel
  du plugin React est actif avant d'ajouter un transform séparé.
- Pour un plugin Babel pur, l'injecter via `babel.plugins` du plugin React
  est plus fiable qu'un plugin Vite/Rollup séparé.

### Problème : Export manquant dans package.json

**Symptôme :**
Erreur `Package subpath './babel-plugin' is not defined by "exports"` en
voulant importer `@editui/plugin/babel-plugin`.

**Résolution :**
Ajout de l'export dans `plugin/js/package.json` :

```json
"exports": {
  "./babel-plugin": "./src/babel-plugin.js"
}
```

### Problème : File: dependency copiée, pas symlinkée

**Symptôme :**
La modification du `package.json` source (`plugin/js/`) n'est pas répercutée
dans `node_modules/@editui/plugin/` de l'exemple après `npm install` — npm
a copié le dossier au lieu de créer un symlink.

**Résolution :**
Mettre à jour manuellement les deux copies, ou relancer `npm install` après
la modification.

### Problème : Recherche des attributs dans le build

**Symptôme :**
`grep` ne trouvait pas `data-editui-file="..."` dans le JS buildé.

**Cause :**
Le JSX transformé convertit les attributs JSX en propriétés d'objet
JavaScript : `data-editui-file="..."` devient
`"data-editui-file":"..."` dans l'appel `jsx()`. Le format change
(attribut HTML → propriété objet), donc le pattern de recherche diffère.

**Enseignement :**
Quand on cherche des attributs dans du JS buildé après transpilation JSX,
chercher le pattern `"data-editui-file":"..."` (clé d'objet) plutôt que
`data-editui-file="..."` (attribut HTML/JSX).
