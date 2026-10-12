# Allure — consignes pour Claude Code

Allure est l'application perso d'Alexandre pour suivre son sport : course, vélo, natation, musculation.
C'est une PWA (React 18 chargé en `<script>`, sans bundler) hébergée sur **GitHub Pages**, servie depuis la **racine** de la branche `main`.
Alexandre n'a aucune compétence en code : explique simplement, en français, et ne casse jamais ses données locales.

## Fichiers : source et fichiers générés
- **Source de vérité** : `src/app.jsx` (toute l'app) et `src/style.css`.
- **Fichiers servis, générés** : `app.js` et `style.css` à la racine. Ne les modifie jamais à la main.
- Après toute modification : `npm install` (la première fois) puis `npm run build`. Commite **les sources ET les fichiers générés**.
- `sw.js` : incrémente la constante `CACHE` (allure-vNN) à chaque livraison, sinon les téléphones gardent l'ancienne version.
- `vendor/` : React et Leaflet embarqués (ne pas remplacer par des CDN).
- `index.html`, `manifest.webmanifest` : rarement modifiés.

## Test local
- `npm run serve` puis ouvrir http://localhost:8765 (viewport mobile, environ 390 px de large).
- Mode démo sans compte Intervals.icu : définir `window.ALLURE_DEMO = true` avant le chargement (activités, bien-être et tracés fictifs).
- Pour tester dans un navigateur automatisé (Playwright) : simuler les API externes avec des routes interceptées plutôt que de dépendre du réseau.

## Données de l'utilisateur (localStorage) — ne jamais les perdre
- `allure_state_v1` : `{ workouts, program, profile, templates, steps, planVersion }`. Toute évolution de structure passe par `bootState()` (migration par `planVersion` / `PLAN_VERSION`). Conserver l'historique `workouts`.
- `allure_icu_conn_v1` (clé Intervals.icu), `allure_icu_cache_v3`, `allure_routes_v1` (tracés GPS en cache), `allure_ors_key_v1` (clé OpenRouteService), `allure_route_prefs_v1`.
- Les clés API ne sont jamais exportées, jamais affichées, jamais écrites dans le dépôt.

## Architecture de `src/app.jsx`
- Plan = `program` : tableau de semaines `{ id, sessions: [{ id, discipline, day(0=lundi), desc, target, templateId?, done }] }` ; la semaine 1 commence à `profile.programStart`. `locateWeek` crée/décale les semaines quand on déplace une séance.
- `buildProgram(templates, zones)` génère le programme type de 12 semaines (3 blocs de 3 semaines + 1 semaine allégée). Semaine type : lun Push + footing facile · mar Pull · mer course qualité · jeu Jambes · ven repos · sam sortie longue vélo + Rappel haut du corps · dim natation.
- Zones de FC : `profile.zones` (5 zones, ex. Z1 116–146 … Z5 191–205).
- Coach (`CoachPage`) : conversation avec l'API Gemini appelée directement depuis le navigateur (clé gratuite de l'utilisateur dans `allure_coach_key_v1`, jamais envoyée ailleurs). `buildCoachContext()` prépare le dossier de données (plan avec références [A1]…, séances réalisées, bien-être, charges) ; le modèle répond en JSON `{reply, actions}`. Les actions (`adjust`, `move`, `delete`) sont validées par `resolveActions()` puis appliquées seulement après clic de l'utilisateur via `coachApply()` dans `App`. Ne jamais appliquer une action automatiquement.
- Base d'exercices (`EXO_RAW` → `EXERCISES`, composants `ExerciseLibrary` et `ExerciseInfoSheet`) : 118 exercices en français, textes originaux (ne pas copier de contenu protégé d'autres sites). Les noms suivent « Exercice – Matériel » comme les séances de l'utilisateur ; la colonne « Autres noms » rattache les variantes (G/D) au journal via `normEx`. Pour ajouter un exercice, ajouter une ligne à `EXO_RAW`.
- L'Historique n'est plus un onglet : il s'ouvre depuis Réglages.
- Écrans : Aujourd'hui (`Today`), Calendrier (`Calendar`, glisser-déposer par appui long), Musculation (`MuscuHome` : séances + journal des charges et records), Carte (`MapPage` : `MyRoutes` et `RouteBuilder`), Historique (`History`), Réglages (`Settings`).
- Intervals.icu : activités + bien-être (`icuGet`, `icuFetch`, `fetchIcuAll`) ; détails d'activité et tracé GPS via `/activity/{id}`, `/map` et `/streams.json?types=latlng`. Les activités Strava sont illisibles par l'API (« stubs »).
- Itinéraires : OpenRouteService (`orsLoop`, `generateLoops`, profil `foot-walking`, `round_trip`), géocodage Nominatim, export GPX (`toGpx`). Carte : Leaflet + tuiles OpenStreetMap.

## Conventions
- Interface 100 % en français ; vocabulaire : « Musculation » (pas « Muscu »), « Calendrier », « Carte », « pas ».
- Mobile d'abord. Pas de zoom au double-tap (`touch-action: manipulation` global).
- Pas de dépendance npm au runtime : tout reste dans `src/app.jsx` + `vendor/`. Pas de `localStorage` hors des clés listées ci-dessus.
- Accessibilité : libellés `aria-label` sur les boutons-icônes, éléments cliquables atteignables au clavier.
- Avant de livrer : vérifier qu'il n'y a pas d'erreur console, que `npm run build` passe, que l'ancien état (`allure_state_v1`) se charge toujours.

## Livraison
Travaille sur une branche, ouvre une pull request avec un résumé clair en français (ce qui change pour l'utilisateur, ce qui a été testé). Alexandre fusionne la PR ; GitHub Pages redéploie en environ une minute.
