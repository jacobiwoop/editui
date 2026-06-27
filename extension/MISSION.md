---
Ce que fait l'extension

Injectée dans chaque page via content_scripts. Trois couches :

1. Le picker
- Bouton dans la toolbar browser pour activer/désactiver
- Mode actif → highlight visuel au survol (outline coloré, pas de modification du layout)
- Clic sur un élément → le sélectionne, désactive le hover mode
- Escape → désélectionne

2. La toolbar flottante
- Apparaît sur l'élément sélectionné, ancrée en haut ou en bas selon la place
- Draggable librement
- Rétractable (icône seule ↔ toolbar complète)
- Contrôles rapides : taille texte, poids, couleur texte, couleur fond, padding, margin, border radius, alignement
- Chaque contrôle lit la valeur CSS actuelle comme point de départ
- Champ prompt libre pour les modifs complexes
- Bouton "Générer le prompt" → ouvre le panel

3. Le panel prompt
- Affiche le prompt structuré généré
- Bouton "Copier"
- Affiche les deux sections : contexte (source) + modifications demandées

---
Deux modes de fonctionnement

Mode riche — plugin installé, data-editui-* présents sur l'élément

Prompt contient :
Component: CheckoutButton
File: src/components/CheckoutButton.tsx
Line: 23

Mode fallback — sans plugin, attributs absents

Prompt contient uniquement ce que le DOM expose :
Element: <button>
Text: "Payer"
Classes: btn btn-primary
Selector: main > section > button.btn-primary

La détection est automatique : si data-editui-file présent → mode riche, sinon → fallback.

---
Données collectées sur l'élément sélectionné

- Tag name
- Classes
- CSS selector unique (calculé)
- Texte visible (trimmed, max 100 chars)
- Computed styles pertinents : font-size, font-weight, color, background-color, padding, margin, border-radius, display, text-align
- Si mode riche : file, line, component name
- URL de la page
- Framework détecté (React → présence de __reactFiber ou _reactRootContainer, Vue → __vue_app__, sinon Unknown)

---
Format du prompt généré

[EditUI Context]

Page: {url}
Framework: {framework}

{si mode riche:}
Component: {component}
File: {file}
Line: {line}

Element: <{tag}>
Classes: {classes}
Selector: {selector}
{si texte:}
Text: "{text}"

Requested changes:
{liste des modifications faites via toolbar}
{instruction libre si remplie}

---
Fichiers de l'extension

extension/
  manifest.json       → config MV3 (Chrome + Firefox)
  content.js          → picker + injection toolbar/panel
  toolbar.html        → template HTML de la toolbar
  toolbar.css         → styles toolbar, picker highlight, panel
  panel.js            → logique du panel prompt
  popup.html          → popup du bouton browser (toggle on/off)
  popup.js            → logique popup
  icons/              → 16, 48, 128px

---
Contraintes techniques

- Manifest V3 — service worker au lieu de background page, pas d'eval
- Shadow DOM — toolbar injectée dans un shadow root pour isoler les styles du site hôte
- Zéro dépendance — vanilla JS uniquement, pas de bundler requis pour l'extension
- Pas d'appel API — zéro réseau, tout est local
- Permissions minimales — activeTab + scripting uniquement
- Fonctionne sur localhost ET sites en prod — pas de restriction de domaine

---
Prompt à envoyer à ton IA

---

▎ Contexte projet
▎
▎ Je construis EditUI — un outil qui permet de cliquer sur n'importe quel élément d'une page web, de spécifier des modifications visuelles via une toolbar flottante, et de générer un prompt structuré à coller dans n'importe quelle AI (Claude, GPT, Cursor, etc.). Il n'y a aucun appel API — l'extension génère uniquement du texte.
▎
▎ Le repo est ici : https://github.com/jacobiwoop/editui
▎
▎ La partie plugin/ est terminée. Elle annote les éléments DOM avec des data-attributes au build time :
▎ <button
▎   data-editui-file="src/components/CheckoutButton.tsx"
▎   data-editui-line="23"
▎   data-editui-component="CheckoutButton"
▎ >Payer</button>
▎
▎ Ta mission : construire l'extension browser (extension/).
▎
▎ ---
▎ Architecture à respecter
▎
▎ extension/
▎   manifest.json
▎   content.js
▎   toolbar.css
▎   popup.html
▎   popup.js
▎   icons/
▎
▎ Vanilla JS uniquement, zéro dépendance, zéro bundler. Manifest V3 (compatible Chrome + Firefox).
▎
▎ ---
▎ Fonctionnement
▎
▎ Picker
▎ - Bouton dans le popup browser pour activer/désactiver le mode picker
▎ - Mode actif : outline coloré au survol des éléments (sans modifier le layout)
▎ - Clic : sélectionne l'élément, désactive le hover. Escape : désélectionne.
▎
▎ Toolbar flottante
▎ - Injectée via Shadow DOM (isolation des styles du site hôte)
▎ - Ancrée sur l'élément sélectionné (au-dessus ou en-dessous selon la place disponible)
▎ - Draggable, rétractable
▎ - Contrôles : font-size, font-weight, color, background-color, padding, border-radius, text-align
▎ - Chaque contrôle lit la computed style actuelle comme valeur de départ
▎ - Champ texte libre pour les modifications complexes
▎ - Bouton "Copy prompt" qui génère et copie le prompt
▎
▎ Détection automatique du mode
▎ - Si l'élément a data-editui-file → mode riche (utilise file + line + component)
▎ - Sinon → mode fallback (utilise tag + classes + selector + texte visible)
▎
▎ Détection du framework
▎ - React : présence de __reactFiber* ou _reactRootContainer sur un nœud DOM
▎ - Vue : présence de __vue_app__ sur document.body ou un parent
▎ - Sinon : "Unknown"
▎
▎ ---
▎ Format exact du prompt généré
▎
▎ Mode riche :
▎ [EditUI Context]
▎
▎ Page: http://localhost:5173/checkout
▎ Framework: React
▎
▎ Component: CheckoutButton
▎ File: src/components/CheckoutButton.tsx
▎ Line: 23
▎
▎ Element: <button>
▎ Classes: btn btn-primary checkout-btn
▎ Selector: main > section.checkout > button.btn-primary
▎
▎ Requested changes:
▎ - font-size: 14px → 18px
▎ - background-color: #3B82F6 → #22C55E
▎ - Free instruction: "Add a drop shadow"
▎
▎ Mode fallback : même format mais sans les lignes Component / File / Line.
▎
▎ ---
▎ Contraintes
▎ - Manifest V3 strict (pas d'eval, service worker)
▎ - Shadow DOM obligatoire pour la toolbar
▎ - Permissions : activeTab + scripting uniquement
▎ - Zéro appel réseau
▎ - Fonctionne sur localhost et sur n'importe quel domaine
▎ - Le CSS de la toolbar ne doit jamais affecter ni être affecté par le site hôte
▎
▎ ---
▎ Commence par manifest.json et content.js (picker + shadow DOM + toolbar de base). On itère ensuite sur le panel prompt et le popup.
