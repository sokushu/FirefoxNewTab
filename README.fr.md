[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

# FirefoxNewTab

Une extension légère pour les nouveaux onglets de Firefox, avec des raccourcis vers vos sites, des groupes, des arrière-plans personnalisés et une horloge facultative. Elle repose sur Manifest V3 et du HTML, CSS et JavaScript natifs, et fonctionne directement à partir des fichiers sources, sans dépendances à installer ni compilation.

## Fonctionnalités

- Organisez vos raccourcis dans une grille par glisser-déposer, avec quatre tailles d’icône et la conservation des espaces vides.
- Classez les sites dans une barre latérale de groupes repliable et déplacez les raccourcis entre groupes.
- Importez des icônes personnalisées ou récupérez-les directement depuis un site lorsque vous en avez besoin.
- Choisissez parmi 7 fonds d’écran intégrés, une image locale ou 48 couleurs de fond.
- Utilisez un thème sombre, clair ou adapté au système et affichez l’heure et la date locales si vous le souhaitez.
- L’interface suit automatiquement la langue de Firefox et respecte la préférence système de réduction des animations.

## Charger dans Firefox

La récupération des icônes de sites nécessite Firefox 128 ou une version ultérieure, car elle utilise [`optional_host_permissions`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions).

1. Téléchargez ou clonez ce dépôt en conservant sa structure de fichiers.
2. Ouvrez `about:debugging#/runtime/this-firefox` dans Firefox.
3. Cliquez sur **Charger un module complémentaire temporaire…** et sélectionnez `manifest.json` à la racine du projet.
4. Si Firefox vous le demande, autorisez l’extension à remplacer la page de nouvel onglet.
5. Ouvrez un nouvel onglet. Faites un clic droit dans une zone vide pour ajouter votre premier site, ou cliquez sur l’engrenage en bas à droite pour ouvrir les paramètres.

L’installation temporaire prend fin au redémarrage de Firefox ; chargez alors l’extension à nouveau. Consultez le [guide d’installation temporaire de Mozilla](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).

## Raccourcis vers les sites

### Ajouter et gérer les sites

La liste des sites est vide au départ. Faites un clic droit dans une zone vide de l’arrière-plan pour accéder aux actions suivantes :

| Action | Résultat |
| --- | --- |
| Ajouter une icône | Ajoute un site au groupe actuel. |
| Changer le fond d'écran | Ouvre les paramètres à la section des fonds d’écran intégrés. |
| Paramètres | Ouvre le panneau de paramètres. |

Saisissez un nom de 50 caractères maximum et une adresse HTTP ou HTTPS. Si vous omettez le protocole, `https://` est ajouté automatiquement. Un clic sur un raccourci ouvre le site dans l’onglet actuel.

Faites un clic droit sur un raccourci ou utilisez son bouton à trois points pour l’ouvrir, le modifier, le redimensionner ou le supprimer. Le bouton apparaît au survol ou lorsqu’il reçoit le focus au clavier, et reste visible sur les appareils tactiles. La suppression demande confirmation ; annuler l’édition abandonne les modifications non enregistrées.

### Tailles d’icône et capacité de la grille

Chaque groupe possède une grille logique pour ordinateur de **10 colonnes × 6 lignes**, soit **60 cellules de base**.

| Taille | Colonnes × lignes | Cellules de base |
| --- | --- | --- |
| Normale | 1 × 1 | 1 |
| Icône large | 2 × 1 | 2 |
| Icône haute | 1 × 2 | 2 |
| Grande icône | 2 × 2 | 4 |

Un groupe peut contenir jusqu’à 60 raccourcis de taille normale. Les grandes icônes nécessitent aussi des cellules libres disposées selon leur forme. L’ajout est désactivé lorsque le groupe est plein ; l’ajout, le déplacement entre groupes et le redimensionnement vérifient tous l’espace disponible. Chaque site conserve sa propre taille.

Faites glisser les raccourcis vers des cellules vides ou sur d’autres raccourcis pour les réorganiser. Les positions et les espaces vides sont enregistrés. Appuyez sur **Échap** ou annulez le glissement pour rétablir la disposition initiale ; approchez-vous du bord de la zone de défilement pour atteindre d’autres cellules.

La grille reste alignée en haut à gauche de la zone située à côté de la barre latérale et ne défile que si nécessaire. Les fenêtres étroites utilisent moins de colonnes et enregistrent des positions distinctes pour chaque nombre de colonnes. Un déplacement dans une vue étroite n’écrase pas les positions de bureau ; le simple redimensionnement de la fenêtre n’enregistre pas de nouvelles positions. Dans une vue à une colonne, les icônes larges sont temporairement réduites en largeur et retrouvent leur taille dès que l’espace le permet.

### Groupes

La barre latérale contient initialement un groupe **Favoris**. Utilisez **Ajouter un groupe** pour créer d’autres groupes, avec un nom de 20 caractères maximum. Les paramètres du groupe permettent de changer le nom et de choisir du texte, un emoji ou une image locale comme icône.

Faites glisser un site sur un groupe pour l’y déplacer, y compris sur son icône lorsque la barre latérale est repliée. Si la destination manque d’espace, le site reste à sa position initiale.

La flèche en haut de la barre latérale permet de la replier ou de la déplier. Le groupe actuel et l’état replié sont enregistrés. Tous les groupes peuvent être renommés ou supprimés, y compris le groupe initial, mais il doit en rester au moins un. Supprimer un groupe transfère ses sites et leurs icônes vers le premier groupe restant.

Les changements de groupe utilisent un glissement vertical selon l’ordre de la barre latérale. Le redimensionnement des icônes et les changements de la barre latérale bénéficient également de transitions fluides. Ces effets respectent le réglage système de réduction des animations.

### Icônes personnalisées et récupération d’icônes

- Importez des fichiers PNG, JPEG, WebP, GIF, AVIF ou ICO de **2 MiB** maximum pour les icônes de sites ou de groupes.
- Sans icône personnalisée, le raccourci affiche le premier caractère du nom du site. **Utiliser l'icône par défaut** rétablit cet affichage.
- Les icônes conservent leurs proportions, ne sont jamais agrandies et leur côté le plus long est limité à **512 px**. Elles sont compressées en WebP avec une qualité d’environ **0,8**, puis réduites davantage si nécessaire pour respecter la limite de **128 KiB** de données enregistrées par icône.
- Les anciennes icônes PNG restent compatibles. Pour améliorer une icône anciennement compressée à 128 px, importez l’image d’origine ou récupérez l’icône à nouveau.

Saisissez l’adresse du site et cliquez sur **Récupérer l'icône**. Firefox demande l’accès à ce site si nécessaire. L’extension lit les icônes déclarées par le site et essaie aussi `/favicon.ico`, puis convertit le résultat en aperçu local. Cliquez sur **Enregistrer** pour le conserver. Un échec ou un refus d’autorisation préserve l’icône actuelle ; l’importation d’images locales reste possible. Aucun service d’icônes tiers n’est utilisé.

## Apparence et arrière-plans

Cliquez sur l’engrenage en bas à droite pour ouvrir le panneau de paramètres. Fermez-le avec son bouton de fermeture, en cliquant à l’extérieur ou en appuyant sur **Échap**.

| Paramètre | Options et comportement |
| --- | --- |
| Thème | **Sombre**, **Clair** ou **Suivre le système** ; ce dernier est le réglage par défaut. |
| Afficher l'horloge | Désactivé par défaut. Affiche l’heure locale au format 24 heures `HH:mm:ss` et une date adaptée à la langue, actualisées chaque seconde. |
| Fonds d’écran intégrés | 7 images sur deux colonnes ; cliquez sur une miniature pour l’appliquer et l’enregistrer. |
| Image d’arrière-plan locale | PNG, JPEG, WebP, GIF ou AVIF de **10 MiB** maximum ; appliquée et enregistrée après sélection. |
| Couleurs de fond | 48 couleurs ; cliquez sur un échantillon pour l’appliquer et l’enregistrer. |
| Arrière-plan par défaut | Blanc (`#ffffff`), utilisé au premier lancement et lors du rétablissement du fond par défaut. |

Le thème modifie les commandes, menus et boîtes de dialogue tout en conservant le fond d’écran ou la couleur choisie. Les titres des sites et l’horloge utilisent un texte sombre sur les fonds unis clairs. Les préférences de thème, d’affichage de l’horloge et de repli de la barre latérale sont synchronisées entre les nouveaux onglets ouverts de la même extension.

## Langue de l’interface

L’interface suit la langue d’affichage de Firefox avec [`browser.i18n.getUILanguage()`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/getUILanguage). Elle ne possède pas de sélecteur de langue distinct.

Les langues prises en charge sont le chinois simplifié, le chinois traditionnel, l’anglais, le japonais, le coréen, l’espagnol, le français, l’allemand et le portugais, avec des variantes pour le Brésil et le Portugal. Les variantes régionales utilisent la traduction correspondante ou une traduction générique ; les langues non prises en charge utilisent le chinois simplifié. Ouvrez un nouvel onglet après avoir changé la langue de Firefox.

Les menus, paramètres, boîtes de dialogue, messages, libellés d’accessibilité, noms de couleurs, nom de l’extension, dates et nom du groupe par défaut sont traduits. Les titres de sites, URL et noms de groupes saisis par l’utilisateur conservent leur texte d’origine. L’horloge utilise toujours le fuseau horaire local.

## Données locales et autorisations

| Stockage | Contenu |
| --- | --- |
| `localStorage` | Sites, icônes, positions dans la grille, groupes, groupe actuel, état de la barre latérale, thème et affichage de l’horloge. |
| `IndexedDB` | Choix d’arrière-plan et images d’arrière-plan locales. |

Les images importées restent dans le navigateur. La gestion des raccourcis et des arrière-plans ne nécessite aucune autorisation supplémentaire. L’accès au site n’est demandé qu’en cliquant sur **Récupérer l'icône** ; le refuser n’empêche pas l’importation locale. Les arrière-plans n’utilisent aucun service d’images externe. Si le stockage local est indisponible, les opérations de gestion affichent une erreur.

### Compatibilité avec les anciennes données

- Les anciens raccourcis intégrés sont supprimés grâce à leurs marqueurs de préréglage ; les sites ajoutés par l’utilisateur et les icônes personnalisées sont conservés.
- L’ancienne fonction de dossiers a été supprimée. Les sites qu’ils contenaient rejoignent la grille principale de leur groupe en conservant leurs noms, URL, icônes et tailles.
- Si les anciennes données dépassent la capacité de la grille, les sites en trop restent dans **Autres sites web**, où ils peuvent être ouverts, modifiés ou supprimés. Ils reviennent dans la grille quand de l’espace se libère.

## Développement

### Structure du projet

| Fichiers | Rôle |
| --- | --- |
| `manifest.json` | Métadonnées, remplacement du nouvel onglet et autorisations facultatives d’accès aux sites. |
| `newtab.html`, `newtab.css`, `newtab.js` | Structure de la page, styles de base, horloge et date. |
| `i18n.js`, `_locales/` | Traduction de l’interface et catalogues de messages WebExtension. |
| `shortcuts.js`, `groups.js`, `sidebar.js` | Gestion des sites, groupes et état de la barre latérale. |
| `shortcut-layout.js`, `shortcut-grid.js` | Capacité, règles de placement, mesures et glisser-déposer. |
| `shortcut-tile-motion.js`, `shortcut-page-transition.js` | Animations de redimensionnement et de changement de groupe. |
| `shortcut-menu.js`, `background-menu.js` | Menus contextuels des raccourcis et de l’arrière-plan. |
| `icon-utils.js`, `shortcut-icon-fetcher.js` | Traitement commun des icônes et récupération à la demande. |
| `shortcut-migrations.js` | Compatibilité avec les anciennes données de sites enregistrées. |
| `background.js`, `background-presets.js`, `assets/` | Stockage des arrière-plans, liste des fonds intégrés et images. |
| `settings.js` | Panneau de paramètres, thème et préférences de l’horloge. |
| `wallpaper-picker.css`, `sidebar.css`, `ui-effects.css`, `shortcut-board.css` | Styles du sélecteur de fonds, de la barre latérale, des effets et de la grille. |
| `README*.md`, `LICENSE` | Documentation en 8 langues et texte de la licence. |

### Modifier et recharger

Aucune installation de dépendances ni commande de compilation n’est nécessaire. Après modification des sources, cliquez sur **Recharger** pour l’extension dans `about:debugging#/runtime/this-firefox`, fermez l’ancienne page de nouvel onglet et ouvrez-en une nouvelle.

Les références locales aux fichiers CSS et JavaScript dans `newtab.html` utilisent une version de ressources commune, `?v=...`. Mettez ces paramètres à jour ensemble lorsque vous modifiez ces ressources. Respectez l’ordre des dépendances : chargez `i18n.js` en premier, les utilitaires partagés avant les modules qui les utilisent, puis les modules de groupes, grille, menus, transitions et migration avant `shortcuts.js`. Chaque module conserve son état privé dans une portée distincte et communique par des interfaces explicites ou des événements. Le traitement des icônes et les règles de capacité possèdent chacun une seule implémentation ; les styles du sélecteur de fonds sont limités au panneau de paramètres.

### Mettre à jour les traductions

Utilisez les mêmes clés de message dans `_locales/*/messages.json`. Insérez les valeurs nommées avec `newTabI18n.t(key, { name, count })` et traduisez le contenu statique avec `data-i18n`, `data-i18n-title`, `data-i18n-aria-label` et `data-i18n-placeholder`. Incluez les menus des modèles, mettez à jour ensemble les catalogues régionaux équivalents et gardez les 8 README cohérents. Consultez le [guide d’internationalisation de Mozilla](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization).

## Licence

Consultez [LICENSE](LICENSE) pour la GNU General Public License v3.0.
