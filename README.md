# Allure

Suivi d'entraînement triathlon (course, vélo, natation, muscu) avec tableau de bord Intervals.icu.
Application web installable (PWA) : aucune base de données ni serveur, tout reste dans le navigateur du téléphone.

## Mettre en ligne (GitHub Pages)
1. Créer un dépôt public (ex. `allure`) et y envoyer tout le contenu de ce dossier (à la racine, pas dans un sous-dossier).
2. Settings → Pages → Source : « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Après environ une minute : `https://<ton-pseudo>.github.io/allure/`

## Installer sur le téléphone
- iPhone : Safari → Partager → « Sur l'écran d'accueil ».
- Android : Chrome → menu ⋮ → « Installer l'application ».

## Connecter Intervals.icu
Réglages (icône en haut à droite) → Intervals.icu → coller la clé API
(Intervals.icu → Settings → tout en bas, Developer Settings). La clé reste sur l'appareil.
Les activités Strava ne sont pas lisibles via l'API d'Intervals.icu.

## Sauvegarde
Réglages → Sauvegarde → Exporter (fichier JSON). Importer permet de restaurer ou de passer sur un autre appareil.
La clé Intervals.icu n'est pas incluse dans l'export.

## Modifier l'application
Le code source est dans `src/app.jsx` et `src/style.css`.
`app.js` et `style.css` à la racine sont les fichiers servis (compilés avec Babel, JSX classique).
